/**
 * KioskLogin Page
 *
 * Handles two scenarios:
 *
 * A) Token present (machine-initiated QR scan):
 *    Machine shows QR → user scans → lands here with ?token=<token> → confirms.
 *
 * B) No token (user-initiated "Connect Kiosk" from nav):
 *    User can either:
 *      1. Scan the QR code printed on the machine (contains the device ID)
 *      2. Type the device ID manually
 *    App calls createSession(deviceId) → redirects to /kiosk-login?token=<token> → confirms.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2,
  Heart,
  CheckCircle2,
  AlertCircle,
  Activity,
  User,
  QrCode,
  Keyboard,
  Camera,
  ArrowRight,
} from "lucide-react";

type PageState = "loading" | "connect" | "confirm" | "success" | "error";
type ConnectTab = "qr" | "manual";

export default function KioskLogin() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const params = new URLSearchParams(search);
  const token = params.get("token");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [connectTab, setConnectTab] = useState<ConnectTab>("qr");
  const [errorMessage, setErrorMessage] = useState("");
  const [manualDeviceId, setManualDeviceId] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const scannerRef = useRef<any>(null);
  const scannerDivId = "qr-scanner-region";

  // Create a session linked to a device ID
  const createSessionMutation = trpc.kioskIntegration.createSession.useMutation({
    onSuccess: (data) => {
      stopScanner();
      navigate(`/kiosk-login?token=${data.token}`);
    },
    onError: (err) => {
      stopScanner();
      toast.error(err.message);
    },
  });

  const confirmMutation = trpc.kioskIntegration.confirmLogin.useMutation({
    onSuccess: () => {
      setPageState("success");
      toast.success(
        isAr
          ? "تم الربط بنجاح! يمكنك الآن إجراء القياسات."
          : "Linked successfully! You may now proceed with the measurements."
      );
    },
    onError: (err) => {
      setErrorMessage(err.message);
      setPageState("error");
      toast.error(err.message);
    },
  });

  // Determine initial page state after auth resolves
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const redirect = token ? `/kiosk-login?token=${token}` : "/kiosk-login";
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    if (!token) {
      setPageState("connect");
      return;
    }
    setPageState("confirm");
  }, [authLoading, user, token]);

  // Start QR scanner
  const startScanner = async () => {
    setScannerError("");
    setScannerActive(true);

    // Dynamically import to avoid SSR issues
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode(scannerDivId);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const raw = decodedText.trim();

          // Case 1: QR encodes a URL with ?token= (machine simulator / real machine)
          // e.g. https://example.com/kiosk-login?token=abc123
          try {
            const url = new URL(raw);
            const tokenParam = url.searchParams.get("token");
            if (tokenParam) {
              // Navigate directly to the confirm screen — no device lookup needed
              stopScanner();
              navigate(`/kiosk-login?token=${tokenParam}`);
              return;
            }
            // Case 2: URL with ?deviceId= (legacy static QR label on machine)
            const deviceIdParam = url.searchParams.get("deviceId") || url.searchParams.get("device_id");
            if (deviceIdParam) {
              handleConnectDevice(deviceIdParam);
              return;
            }
          } catch {
            // Not a URL — fall through
          }

          // Case 3: Raw device ID string (e.g. DEVICE-JED-001)
          handleConnectDevice(raw);
        },
        () => { /* ignore per-frame errors */ }
      );
    } catch (err: any) {
      setScannerActive(false);
      setScannerError(
        isAr
          ? "تعذّر الوصول إلى الكاميرا. يرجى السماح بالوصول أو استخدام الإدخال اليدوي."
          : "Could not access camera. Please allow camera access or use manual entry."
      );
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  // Clean up scanner on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  // Stop scanner when switching tabs
  useEffect(() => {
    if (connectTab !== "qr") stopScanner();
  }, [connectTab]);

  const handleConnectDevice = (deviceId: string) => {
    const id = deviceId.trim();
    if (!id) {
      toast.error(isAr ? "يرجى إدخال معرّف الجهاز" : "Please enter a device ID");
      return;
    }
    createSessionMutation.mutate({ deviceId: id });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleConnectDevice(manualDeviceId);
  };

  const handleConfirm = () => {
    if (!token) return;
    confirmMutation.mutate({ token });
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // ── Connect (no-token, user-initiated) ───────────────────────────────────

  if (pageState === "connect") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">

          {/* Header */}
          <div className="text-center mb-2">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">LIM</span>
            </div>
          </div>

          <Card className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="pb-3 text-center">
              <CardTitle className="text-lg">
                {isAr ? "ربط جهاز الفحص الصحي" : "Connect Health Kiosk"}
              </CardTitle>
              <CardDescription className="text-sm">
                {isAr
                  ? "امسح رمز QR الموجود على الجهاز، أو أدخل معرّف الجهاز يدوياً."
                  : "Scan the QR code on the machine, or enter the device ID manually."}
              </CardDescription>
            </CardHeader>

            {/* Tab switcher */}
            <div className="flex border-b border-gray-100 mx-6">
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                  connectTab === "qr"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
                onClick={() => setConnectTab("qr")}
              >
                <QrCode className="w-4 h-4" />
                {isAr ? "مسح QR" : "Scan QR"}
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                  connectTab === "manual"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
                onClick={() => setConnectTab("manual")}
              >
                <Keyboard className="w-4 h-4" />
                {isAr ? "إدخال يدوي" : "Manual Entry"}
              </button>
            </div>

            <CardContent className="pt-5 pb-6 space-y-4">

              {/* ── QR Tab ── */}
              {connectTab === "qr" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 text-center leading-relaxed">
                    {isAr
                      ? "ابحث عن ملصق QR على الجهاز واضغط على الزر أدناه لتشغيل الكاميرا."
                      : "Find the QR label on the kiosk machine, then press the button below to activate your camera."}
                  </p>

                  {/* Scanner viewport */}
                  <div
                    id={scannerDivId}
                    className={`w-full rounded-xl overflow-hidden bg-gray-900 ${scannerActive ? "min-h-[280px]" : "hidden"}`}
                  />

                  {scannerError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600">{scannerError}</p>
                    </div>
                  )}

                  {createSessionMutation.isPending ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-emerald-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">
                        {isAr ? "جارٍ إنشاء الجلسة..." : "Creating session..."}
                      </span>
                    </div>
                  ) : scannerActive ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={stopScanner}
                    >
                      {isAr ? "إيقاف الكاميرا" : "Stop Camera"}
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-11 text-base font-medium"
                      onClick={startScanner}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {isAr ? "تشغيل الكاميرا لمسح QR" : "Activate Camera to Scan QR"}
                    </Button>
                  )}

                  <p className="text-xs text-center text-gray-400">
                    {isAr
                      ? "تأكد من أن رمز QR مضاء جيداً وفي مركز الإطار."
                      : "Make sure the QR code is well-lit and centred in the frame."}
                  </p>
                </div>
              )}

              {/* ── Manual Entry Tab ── */}
              {connectTab === "manual" && (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {isAr ? "معرّف الجهاز" : "Device ID"}
                    </label>
                    <Input
                      placeholder={isAr ? "مثال: DEVICE-JED-001" : "e.g. DEVICE-JED-001"}
                      value={manualDeviceId}
                      onChange={(e) => setManualDeviceId(e.target.value.trim())}
                      className="h-11 font-mono text-sm"
                      autoComplete="off"
                      autoCapitalize="characters"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-400">
                      {isAr
                        ? "ستجد معرّف الجهاز مطبوعاً على ملصق في الجهاز."
                        : "The device ID is printed on a label attached to the kiosk machine."}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-11 text-base font-medium"
                    disabled={!manualDeviceId || createSessionMutation.isPending}
                  >
                    {createSessionMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isAr ? "جارٍ الإنشاء..." : "Creating session..."}</>
                    ) : (
                      <><ArrowRight className="w-4 h-4 mr-2" />{isAr ? "ربط الجهاز" : "Connect to Machine"}</>
                    )}
                  </Button>
                </form>
              )}

              {/* How it works */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 mt-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {isAr ? "كيف يعمل؟" : "How it works"}
                </p>
                {[
                  isAr ? "امسح QR أو أدخل معرّف الجهاز" : "Scan the QR or enter the device ID",
                  isAr ? "أكّد هويتك في الشاشة التالية" : "Confirm your identity on the next screen",
                  isAr ? "أجرِ القياسات — ستظهر النتائج تلقائياً في التطبيق" : "Complete measurements — results appear automatically in the app",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-gray-600">{step}</p>
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                className="w-full text-gray-400 text-sm"
                onClick={() => navigate("/")}
              >
                {isAr ? "العودة للرئيسية" : "Back to Home"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────

  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Card className="shadow-lg border-0">
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">
                {isAr ? "تم الربط بنجاح!" : "Session Confirmed!"}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {isAr
                  ? "تم ربط حسابك بالجهاز. يمكنك الآن وضع هاتفك جانباً وإجراء القياسات على الجهاز. ستظهر النتائج تلقائياً في تطبيقك بعد الانتهاء."
                  : "Your account has been linked to the machine. You can now put your phone aside and proceed with the health measurements. Your results will appear automatically in the app once finished."}
              </p>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                  <Activity className="w-4 h-4" />
                  {isAr ? "الخطوات التالية:" : "Next steps:"}
                </div>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>{isAr ? "ضع هاتفك جانباً" : "Put your phone aside"}</li>
                  <li>{isAr ? "أجرِ القياسات على الجهاز" : "Complete the measurements on the machine"}</li>
                  <li>{isAr ? "افتح التطبيق لرؤية نتائجك" : "Open the app to see your results"}</li>
                </ol>
              </div>
              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => navigate("/health")}
              >
                {isAr ? "الذهاب إلى لوحة الصحة" : "Go to Health Dashboard"}
              </Button>
            </CardContent>
          </Card>


        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              {isAr ? "حدث خطأ" : "Something went wrong"}
            </h2>
            <p className="text-gray-500 text-sm">{errorMessage}</p>
            <Button
              variant="outline"
              onClick={() => {
                setPageState("confirm");
                setErrorMessage("");
              }}
            >
              {isAr ? "حاول مجدداً" : "Try Again"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Confirm (token present) ───────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">

        {/* Header */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">LIM</span>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-7 h-7 text-emerald-600" />
            </div>
            <CardTitle className="text-lg">
              {isAr ? "ربط الجهاز بحسابك" : "Link Machine to Your Account"}
            </CardTitle>
            <CardDescription className="text-sm">
              {isAr
                ? "تم إنشاء جلسة ربط. قم بتأكيد هويتك لربط نتائجك بحسابك."
                : "A session has been created. Confirm your identity to link your results to your account."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* User info card */}
            {user && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {user.name ?? (isAr ? "مستخدم LIM" : "LIM User")}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user.phone ?? user.openId}
                  </p>
                </div>
              </div>
            )}

            {/* What happens next */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-1">
              <p className="text-xs font-medium text-emerald-700">
                {isAr ? "ماذا سيحدث؟" : "What will happen?"}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                {isAr
                  ? "سيتعرف الجهاز عليك ويربط نتائج قياساتك تلقائياً بحسابك في التطبيق."
                  : "The machine will recognize you and automatically link your measurement results to your app account."}
              </p>
            </div>

            {/* Confirm button */}
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-11 text-base font-medium"
              onClick={handleConfirm}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isAr ? "جارٍ الربط..." : "Linking..."}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isAr ? "تأكيد وربط الجهاز" : "Confirm & Link Machine"}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-gray-400">
              {isAr
                ? "هذه الجلسة صالحة لمدة 60 دقيقة فقط."
                : "This session is valid for 60 minutes only."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
