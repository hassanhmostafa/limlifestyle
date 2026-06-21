/**
 * KioskLogin Page
 *
 * This page handles two scenarios:
 *
 * A) Token present (machine-initiated QR scan):
 *    The machine shows a QR code: https://techcarev2-zgcnaa4a.manus.space/kiosk-login?token=<token>
 *    User scans it → lands here → confirms → machine gets notified via /weixin/login/xcx polling.
 *
 * B) No token (user-initiated "Connect Kiosk" from nav):
 *    User selects a registered device from a list → app calls createSession with deviceId
 *    → redirects to /kiosk-login?token=<token> → same confirmation flow as (A).
 *
 * After confirmation, the machine POSTs data to /api/kiosk/data → saved to health profile.
 */

import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  Heart,
  CheckCircle2,
  AlertCircle,
  Activity,
  User,
  FlaskConical,
  Stethoscope,
  BarChart3,
  Cpu,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PageState = "loading" | "confirm" | "success" | "error" | "select-device";

type TestMetrics = {
  height: number;
  weight: number;
  bmi: number;
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  spO2: number;
  bodyFatRate: number;
  muscleRate: number;
  bloodSugar: number;
} | null;

export default function KioskLogin() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const params = new URLSearchParams(search);
  const token = params.get("token");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [testMetrics, setTestMetrics] = useState<TestMetrics>(null);
  const [confirmedToken, setConfirmedToken] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Fetch active devices for the device-selection screen
  const { data: activeDevices, isLoading: devicesLoading } = trpc.kioskIntegration.listActiveDevices.useQuery(
    undefined,
    { enabled: pageState === "select-device" && !!user }
  );

  // Create a session linked to a selected device
  const createSessionMutation = trpc.kioskIntegration.createSession.useMutation({
    onSuccess: (data) => {
      navigate(`/kiosk-login?token=${data.token}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const confirmMutation = trpc.kioskIntegration.confirmLogin.useMutation({
    onSuccess: () => {
      setConfirmedToken(token);
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

  const testMeasurementMutation = trpc.kioskIntegration.sendTestMeasurement.useMutation({
    onSuccess: (data) => {
      setTestMetrics(data.metrics);
      toast.success(
        isAr
          ? "تم إرسال بيانات الفحص بنجاح! افتح لوحة الصحة لرؤية نتائجك."
          : "Test measurement sent! Open your Health Dashboard to see the results."
      );
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Once auth resolves, determine what to show
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to login, then come back to this page after
      const redirect = token ? `/kiosk-login?token=${token}` : "/kiosk-login";
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    if (!token) {
      setPageState("select-device");
      return;
    }

    // User is logged in and token is present — show confirmation screen
    setPageState("confirm");
  }, [authLoading, user, token]);

  const handleConfirm = () => {
    if (!token) return;
    confirmMutation.mutate({ token });
  };

  const handleConnectDevice = () => {
    if (!selectedDeviceId) {
      toast.error(isAr ? "يرجى اختيار جهاز أولاً" : "Please select a device first");
      return;
    }
    createSessionMutation.mutate({ deviceId: selectedDeviceId });
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  // ── Select Device (no-token, user-initiated) ─────────────────────────────

  if (pageState === "select-device") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">

          {/* Header */}
          <div className="text-center mb-2">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">Tech Care</span>
            </div>
          </div>

          <Card className="shadow-lg border-0">
            <CardHeader className="pb-3 text-center">
              <div className="w-14 h-14 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Cpu className="w-7 h-7 text-cyan-600" />
              </div>
              <CardTitle className="text-lg">
                {isAr ? "ربط جهاز الفحص الصحي" : "Connect Health Kiosk"}
              </CardTitle>
              <CardDescription className="text-sm">
                {isAr
                  ? "اختر الجهاز الذي تقف أمامه لربط نتائجك بحسابك تلقائياً."
                  : "Select the kiosk machine in front of you to automatically link your results to your account."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Device selector */}
              {devicesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                </div>
              ) : !activeDevices || activeDevices.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                  <p className="text-sm text-amber-700 font-medium">
                    {isAr ? "لا توجد أجهزة مسجّلة حالياً" : "No registered devices available"}
                  </p>
                  <p className="text-xs text-amber-600">
                    {isAr
                      ? "يرجى التواصل مع المسؤول لتسجيل الأجهزة."
                      : "Please contact the administrator to register devices."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      {isAr ? "اختر الجهاز" : "Select Device"}
                    </label>
                    <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue
                          placeholder={isAr ? "اختر جهاز الكشك..." : "Choose a kiosk machine..."}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {activeDevices.map((device) => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            <div className="flex items-center gap-2">
                              <Cpu className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                              <span>
                                {device.label
                                  ? `${device.label} (${device.deviceId})`
                                  : device.deviceId}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white h-11 text-base font-medium"
                    onClick={handleConnectDevice}
                    disabled={!selectedDeviceId || createSessionMutation.isPending}
                  >
                    {createSessionMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isAr ? "جارٍ الإنشاء..." : "Creating session..."}</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4 mr-2" />{isAr ? "ربط الجهاز" : "Connect to Machine"}</>
                    )}
                  </Button>
                </div>
              )}

              {/* How it works */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {isAr ? "كيف يعمل؟" : "How it works"}
                </p>
                {[
                  isAr ? "اختر الجهاز الذي تقف أمامه من القائمة" : "Select the machine you are standing in front of",
                  isAr ? "اضغط على \"ربط الجهاز\" لإنشاء جلسة" : "Press \"Connect to Machine\" to create a session",
                  isAr ? "أكّد هويتك في الشاشة التالية" : "Confirm your identity on the next screen",
                  isAr ? "أجرِ القياسات — ستظهر النتائج تلقائياً في التطبيق" : "Complete measurements — results appear automatically in the app",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-gray-600">{step}</p>
                  </div>
                ))}
              </div>

              {/* Test Mode — for testing without a physical machine */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-amber-600" />
                  <p className="text-sm font-semibold text-amber-700">
                    {isAr ? "وضع الاختبار" : "Test Mode"}
                  </p>
                </div>
                <p className="text-xs text-amber-600 leading-relaxed">
                  {isAr
                    ? "لا يوجد جهاز متاح الآن؟ اختر أي جهاز مسجّل واضغط \"ربط الجهاز\" لاختبار التجربة الكاملة."
                    : "No physical machine available? Select any registered device and press \"Connect to Machine\" to test the full flow."}
                </p>
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
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center p-4">
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
              <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-cyan-700 font-medium text-sm">
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
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                onClick={() => navigate("/health")}
              >
                {isAr ? "الذهاب إلى لوحة الصحة" : "Go to Health Dashboard"}
              </Button>
            </CardContent>
          </Card>

          {/* Test Mode panel — send simulated machine data */}
          <Card className="shadow-md border border-amber-200 bg-amber-50">
            <CardContent className="pt-5 pb-5 space-y-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-700">
                  {isAr ? "وضع الاختبار — إرسال بيانات فحص تجريبية" : "Test Mode — Send Simulated Measurement"}
                </p>
              </div>
              <p className="text-xs text-amber-600 leading-relaxed">
                {isAr
                  ? "اضغط على الزر أدناه لإرسال بيانات صحية واقعية عشوائية كما لو أرسلها الجهاز الفعلي. ستظهر في لوحة الصحة."
                  : "Press the button below to send realistic randomised health data exactly as the real machine would. It will appear in your Health Dashboard."}
              </p>

              {testMetrics ? (
                <div className="bg-white rounded-xl p-3 border border-amber-100 space-y-2">
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    {isAr ? "تم إرسال البيانات!" : "Data sent successfully!"}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: isAr ? "ضغط الدم" : "Blood Pressure", value: `${testMetrics.systolic}/${testMetrics.diastolic} mmHg` },
                      { label: isAr ? "نبض القلب" : "Heart Rate", value: `${testMetrics.heartRate} bpm` },
                      { label: isAr ? "الوزن" : "Weight", value: `${testMetrics.weight} kg` },
                      { label: isAr ? "الطول" : "Height", value: `${testMetrics.height} cm` },
                      { label: "BMI", value: String(testMetrics.bmi) },
                      { label: "SpO2", value: `${testMetrics.spO2}%` },
                      { label: isAr ? "سكر الدم" : "Blood Sugar", value: `${testMetrics.bloodSugar} mmol/L` },
                      { label: isAr ? "دهون الجسم" : "Body Fat", value: `${testMetrics.bodyFatRate}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-2">
                        <p className="text-gray-400">{label}</p>
                        <p className="font-semibold text-gray-800">{value}</p>
                      </div>
                    ))}
                  </div>
                  <Button
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white h-9 text-sm mt-1"
                    onClick={() => navigate("/health")}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {isAr ? "عرض النتائج في لوحة الصحة" : "View Results in Health Dashboard"}
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white h-10"
                  onClick={() => testMeasurementMutation.mutate({ sessionToken: confirmedToken ?? undefined })}
                  disabled={testMeasurementMutation.isPending}
                >
                  {testMeasurementMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isAr ? "جارٍ الإرسال..." : "Sending measurement..."}</>
                  ) : (
                    <><Stethoscope className="w-4 h-4 mr-2" />{isAr ? "إرسال بيانات فحص تجريبية" : "Send Test Measurement"}</>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">

        {/* Header */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Tech Care</span>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3 text-center">
            <div className="w-14 h-14 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Cpu className="w-7 h-7 text-cyan-600" />
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
                <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {user.name ?? (isAr ? "مستخدم Tech Care" : "Tech Care User")}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user.email ?? user.openId}
                  </p>
                </div>
              </div>
            )}

            {/* What happens next */}
            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3 space-y-1">
              <p className="text-xs font-medium text-cyan-700">
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
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white h-11 text-base font-medium"
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
