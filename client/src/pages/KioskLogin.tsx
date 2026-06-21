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
} from "lucide-react";

type PageState = "loading" | "confirm" | "success" | "error" | "no-token";

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

  // ── No Token ─────────────────────────────────────────────────────────────

  if (pageState === "no-token") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-800">
              {isAr ? "رمز غير صالح" : "Invalid QR Code"}
            </h2>
            <p className="text-gray-500 text-sm">
              {isAr
                ? "لم يتم العثور على رمز الجلسة. يرجى مسح رمز QR الموجود على الجهاز مباشرةً."
                : "No session token found. Please scan the QR code displayed on the health kiosk machine directly."}
            </p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => navigate("/")}
            >
              {isAr ? "العودة للرئيسية" : "Back to Home"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────

  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
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

            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4 text-left space-y-2 mt-2">
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
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white mt-2"
              onClick={() => navigate("/health")}
            >
              {isAr ? "الذهاب إلى لوحة الصحة" : "Go to Health Dashboard"}
            </Button>
          </CardContent>
        </Card>
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
