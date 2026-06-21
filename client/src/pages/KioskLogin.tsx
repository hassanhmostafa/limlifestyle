/**
 * KioskLogin Page
 *
 * This page is opened when a user scans the QR code displayed on the health kiosk machine.
 *
 * Flow:
 * 1. Machine generates a random token and shows a QR code:
 *      https://tech-care.manus.space/kiosk-login?token=<random_token>
 * 2. User scans QR with their phone → this page opens.
 * 3. If the user is not logged in, they are redirected to /login first.
 * 4. If logged in, they see a confirmation screen with their name and a "Confirm" button.
 * 5. On confirm, the app calls kioskIntegration.confirmLogin which links the token to their account.
 * 6. The machine is polling /weixin/login/xcx?token=<token> every second.
 *    Once confirmed, the machine receives code=1 and proceeds with measurements.
 * 7. After measurements, the machine POSTs data to /api/kiosk/data → saved to their health profile.
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
  QrCode,
  Activity,
  User,
  FlaskConical,
  ArrowRight,
  Stethoscope,
  BarChart3,
} from "lucide-react";

type PageState = "loading" | "confirm" | "success" | "error" | "no-token";

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

// ── Test session mutation (no-token mode) ─────────────────────────────────────

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

  const testSessionMutation = trpc.kioskIntegration.createTestSession.useMutation({
    onSuccess: (data) => {
      // Redirect to the same page with the real test token
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

    if (!token) {
      setPageState("no-token");
      return;
    }

    if (!user) {
      // Redirect to login, then come back to this page after
      navigate(`/login?redirect=/kiosk-login?token=${token}`);
      return;
    }

    // User is logged in and token is present — show confirmation screen
    setPageState("confirm");
  }, [authLoading, user, token]);

  const handleConfirm = () => {
    if (!token) return;
    confirmMutation.mutate({ token });
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  // ── No Token (Test Mode) ─────────────────────────────────────────────────

  if (pageState === "no-token") {
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
                <QrCode className="w-7 h-7 text-cyan-600" />
              </div>
              <CardTitle className="text-lg">
                {isAr ? "ربط جهاز الفحص الصحي" : "Connect Health Kiosk"}
              </CardTitle>
              <CardDescription className="text-sm">
                {isAr
                  ? "امسح رمز QR الموجود على الجهاز لربط نتائجك بحسابك تلقائياً."
                  : "Scan the QR code on the kiosk machine to automatically link your results to your account."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* How it works */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {isAr ? "كيف يعمل؟" : "How it works"}
                </p>
                {[
                  isAr ? "اقترب من جهاز الفحص الصحي" : "Approach the health kiosk machine",
                  isAr ? "امسح رمز QR على الشاشة بكاميرا هاتفك" : "Scan the QR code on the machine screen with your phone camera",
                  isAr ? "أكّد هويتك في هذه الصفحة" : "Confirm your identity on this page",
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

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{isAr ? "أو" : "or"}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Test Mode */}
              {user ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-700">
                      {isAr ? "وضع الاختبار" : "Test Mode"}
                    </p>
                  </div>
                  <p className="text-xs text-amber-600 leading-relaxed">
                    {isAr
                      ? "لا يوجد جهاز متاح الآن؟ اختبر التجربة الكاملة بدون جهاز فعلي."
                      : "No machine available right now? Test the full flow without a physical device."}
                  </p>
                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white h-10"
                    onClick={() => testSessionMutation.mutate()}
                    disabled={testSessionMutation.isPending}
                  >
                    {testSessionMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isAr ? "جارٍ الإنشاء..." : "Creating session..."}</>
                    ) : (
                      <><FlaskConical className="w-4 h-4 mr-2" />{isAr ? "إنشاء جلسة اختبار" : "Start Test Session"}<ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 text-center">
                  <p className="text-sm text-blue-700">
                    {isAr ? "سجّل دخولك لاستخدام وضع الاختبار" : "Sign in to use Test Mode"}
                  </p>
                  <Button
                    className="bg-cyan-500 hover:bg-cyan-600 text-white"
                    onClick={() => navigate("/login?redirect=/kiosk-login")}
                  >
                    {isAr ? "تسجيل الدخول" : "Sign In"}
                  </Button>
                </div>
              )}

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

  // ── Confirm (main state) ──────────────────────────────────────────────────

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
              <QrCode className="w-7 h-7 text-cyan-600" />
            </div>
            <CardTitle className="text-lg">
              {isAr ? "ربط الجهاز بحسابك" : "Link Machine to Your Account"}
            </CardTitle>
            <CardDescription className="text-sm">
              {isAr
                ? "لقد مسحت رمز QR الخاص بجهاز الفحص الصحي. قم بتأكيد هويتك لربط نتائجك بحسابك."
                : "You scanned the QR code from the health kiosk. Confirm your identity to link your results to your account."}
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
                ? "هذا الرمز صالح لمدة 60 دقيقة فقط."
                : "This session token is valid for 60 minutes only."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
