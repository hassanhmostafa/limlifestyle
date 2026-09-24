/**
 * KioskQR Page — Step 1 of the two-scan flow
 *
 * The user opens this page and holds their phone up to the machine's built-in camera.
 * The machine scans the QR code displayed here to identify the user.
 * The QR encodes a short-lived login token (5 minutes) tied to the user's account.
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Heart, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getLoginUrl } from "@/const";

export default function KioskQR() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 minutes
  const [expired, setExpired] = useState(false);

  const generateQR = trpc.kioskIntegration.generateUserQR.useMutation({
    onSuccess: (data) => {
      setToken(data.token);
      setExpiresAt(new Date(data.expiresAt));
      setExpired(false);
      setSecondsLeft(300);
    },
  });

  // Auto-generate on mount
  useEffect(() => {
    if (!authLoading && user) {
      generateQR.mutate();
    }
  }, [authLoading, user]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        setExpired(true);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-lg border-0">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <p className="text-gray-600 text-sm">
              {isAr ? "يجب تسجيل الدخول لعرض رمز QR الخاص بك." : "You must be signed in to view your QR code."}
            </p>
            <a href={getLoginUrl()}>
              <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">
                {isAr ? "تسجيل الدخول" : "Sign In"}
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const minutesLeft = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeDisplay = `${minutesLeft}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">LIM</span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {isAr ? "رمز تسجيل الدخول للجهاز" : "Machine Login QR Code"}
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="pt-6 pb-6 space-y-5 text-center">

            {/* Instruction */}
            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3">
              <p className="text-cyan-700 text-sm font-medium">
                {isAr
                  ? "اعرض هذا الرمز أمام كاميرا الجهاز"
                  : "Hold this QR code in front of the machine's camera"}
              </p>
              <p className="text-cyan-600 text-xs mt-1">
                {isAr
                  ? "سيتعرف الجهاز عليك تلقائياً"
                  : "The machine will recognise you automatically"}
              </p>
            </div>

            {/* QR Code */}
            {generateQR.isPending ? (
              <div className="flex items-center justify-center h-52">
                <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
              </div>
            ) : expired ? (
              <div className="flex flex-col items-center justify-center h-52 space-y-3">
                <AlertCircle className="w-12 h-12 text-amber-400" />
                <p className="text-gray-500 text-sm">
                  {isAr ? "انتهت صلاحية الرمز" : "QR code expired"}
                </p>
                <Button
                  onClick={() => generateQR.mutate()}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isAr ? "توليد رمز جديد" : "Generate New Code"}
                </Button>
              </div>
            ) : token ? (
              <div className="space-y-3">
                <div className={`flex justify-center transition-opacity ${expired ? "opacity-30" : "opacity-100"}`}>
                  <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
                    <QRCodeSVG
                      value={token}
                      size={200}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2">
                  <div className={`text-lg font-mono font-bold ${secondsLeft < 60 ? "text-red-500" : secondsLeft < 120 ? "text-amber-500" : "text-cyan-600"}`}>
                    {timeDisplay}
                  </div>
                  <span className="text-gray-400 text-xs">
                    {isAr ? "متبقي" : "remaining"}
                  </span>
                </div>

                {/* User info */}
                <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-xl p-2">
                  <div className="w-7 h-7 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{user.name ?? "LIM User"}</p>
                    <p className="text-xs text-gray-400 truncate">{user.phone ?? user.openId}</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => generateQR.mutate()}
                  disabled={generateQR.isPending}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  {isAr ? "تحديث الرمز" : "Refresh Code"}
                </Button>
              </div>
            ) : null}

            {/* Step 2 hint */}
            <div className="bg-gray-50 rounded-xl p-3 text-left space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {isAr ? "بعد القياسات" : "After measurements"}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {isAr
                  ? "عند انتهاء الجهاز من القياسات، سيعرض رمز QR. افتح تطبيق LIM وامسح الرمز لاستلام نتائجك."
                  : "When the machine finishes measuring, it will display a QR code. Open LIM and scan it to receive your results."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 border-cyan-200 text-cyan-600 hover:bg-cyan-50"
                onClick={() => navigate("/kiosk-results")}
              >
                {isAr ? "مسح رمز النتائج" : "Scan Results QR"}
              </Button>
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
