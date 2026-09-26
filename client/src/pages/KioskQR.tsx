/**
 * KioskQR Page — Phone → X18 identification
 *
 * The QR contains the participant's Saudi mobile number in national format.
 * The X18 stores its raw scanner value in the on-screen ID field, so scanning
 * this QR behaves exactly like manually entering the same phone number.
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Heart, Loader2, RefreshCw, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getLoginUrl } from "@/const";

export default function KioskQR() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [machineUserId, setMachineUserId] = useState<string | null>(null);

  const generateQR = trpc.kioskIntegration.generateUserQR.useMutation({
    onSuccess: (data) => setMachineUserId(data.machineUserId),
  });

  useEffect(() => {
    if (!authLoading && user) generateQR.mutate();
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
        <Card className="w-full max-w-sm border-0 shadow-lg">
          <CardContent className="space-y-4 pt-8 pb-8 text-center">
            <p className="text-sm text-gray-600">{isAr ? "يجب تسجيل الدخول لعرض رمز QR الخاص بك." : "You must be signed in to view your QR code."}</p>
            <a href={getLoginUrl()}><Button className="w-full bg-emerald-500 text-white hover:bg-emerald-600">{isAr ? "تسجيل الدخول" : "Sign In"}</Button></a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="mb-1 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500"><Heart className="h-5 w-5 text-white" /></div>
            <span className="text-2xl font-bold text-gray-900">LIM</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{isAr ? "رمز الجوال لتسجيل الدخول للجهاز" : "Mobile Number QR for Machine Login"}</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="space-y-5 pt-6 pb-6 text-center">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-700">{isAr ? "اعرض هذا الرمز أمام كاميرا الجهاز" : "Hold this QR code in front of the machine's camera"}</p>
              <p className="mt-1 text-xs text-emerald-600">{isAr ? "سيضع الجهاز رقم جوالك في خانة ID كما لو أدخلته يدويًا" : "The machine will place your phone number in its ID field, just as if you entered it manually."}</p>
            </div>

            {generateQR.isPending ? (
              <div className="flex h-52 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" /></div>
            ) : generateQR.error ? (
              <div className="flex min-h-52 flex-col items-center justify-center space-y-3 rounded-xl bg-amber-50 p-5">
                <AlertCircle className="h-12 w-12 text-amber-500" />
                <p className="text-sm text-amber-800">{isAr ? "أضف رقم جوال سعوديًا صحيحًا في ملفك الشخصي أولًا." : "Add a valid Saudi mobile number to your profile first."}</p>
                <Button onClick={() => navigate("/profile")} className="bg-emerald-500 text-white hover:bg-emerald-600">{isAr ? "فتح الملف الشخصي" : "Open Profile"}</Button>
              </div>
            ) : machineUserId ? (
              <div className="space-y-3">
                <div className="flex justify-center"><div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-md"><QRCodeSVG value={machineUserId} size={200} level="M" includeMargin={false} /></div></div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500"><Smartphone className="h-3.5 w-3.5" />{isAr ? "القيمة التي سيقرأها الجهاز" : "Value the machine will read"}</div>
                  <p className="mt-1 text-lg font-bold tracking-wide text-gray-900" dir="ltr">{machineUserId}</p>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 p-2">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500"><CheckCircle2 className="h-4 w-4 text-white" /></div>
                  <div className="min-w-0 text-left"><p className="truncate text-xs font-medium text-gray-800">{user.name ?? "LIM User"}</p><p className="truncate text-xs text-gray-400" dir="ltr">{user.phone ?? machineUserId}</p></div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => generateQR.mutate()} disabled={generateQR.isPending} className="text-xs text-gray-400 hover:text-gray-600"><RefreshCw className="mr-1 h-3 w-3" />{isAr ? "تحديث الرقم" : "Refresh number"}</Button>
              </div>
            ) : null}

            <div className="space-y-2 rounded-xl bg-gray-50 p-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{isAr ? "بعد القياسات" : "After measurements"}</p>
              <p className="text-xs leading-relaxed text-gray-500">{isAr ? "يرسل جهاز X18 النتائج تلقائيًا إلى حساب LIM المطابق لرقم الجوال عبر رابط رفع البيانات. افتح «صحتي» لعرض نتائج LIM." : "The X18 sends results automatically through its data-upload URL to the LIM account matching this mobile number. Open My Health to view LIM results."}</p>
              <Button variant="outline" size="sm" className="h-8 w-full border-emerald-200 text-xs text-emerald-600 hover:bg-emerald-50" onClick={() => navigate("/health")}>{isAr ? "فتح صحتي" : "Open My Health"}</Button>
            </div>

            <Button variant="ghost" className="w-full text-sm text-gray-400" onClick={() => navigate("/")}>{isAr ? "العودة للرئيسية" : "Back to Home"}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
