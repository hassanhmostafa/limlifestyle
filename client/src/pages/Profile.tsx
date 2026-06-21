import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Calendar, Save, UserCircle2, UserCircle } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Profile() {
  const { user, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تحديث الملف الشخصي بنجاح!" : "Profile updated successfully!");
      utils.profile.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [birthDate, setBirthDate] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setGender((profile.gender as "male" | "female") ?? "");
      setBirthDate(profile.birthDate ?? "");
    }
  }, [profile]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">
              {isAr ? "سجّل الدخول لإدارة ملفك الشخصي" : "Sign in to manage your profile"}
            </h2>
            <a href="/login">
              <Button className="bg-cyan-500 hover:bg-cyan-600">
                {isAr ? "تسجيل الدخول" : "Sign In"}
              </Button>
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSave = () => {
    updateProfile.mutate({
      name: name || undefined,
      gender: gender || null,
      birthDate: birthDate || null,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navigation />
      <main className="flex-1 container max-w-2xl py-12 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <User className="w-8 h-8 text-cyan-500" />
            {isAr ? "ملفي الشخصي" : "My Profile"}
          </h1>
          <p className="text-gray-500 mt-2">
            {isAr
              ? "حافظ على تحديث ملفك الشخصي حتى تتمكن Tech Care من حساب مؤشرات صحية دقيقة مثل مؤشر كتلة الجسم."
              : "Keep your profile up to date so Tech Care can calculate accurate health metrics like BMI."}
          </p>
        </div>

        <Card className="p-8 shadow-lg border-0 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              {isAr ? "الاسم الكامل" : "Full Name"}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAr ? "اسمك الكامل" : "Your full name"}
              className="max-w-sm"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              {isAr ? "الجنس" : "Gender"}
            </Label>
            <p className="text-xs text-gray-400">
              {isAr
                ? "يُستخدم لحساب مؤشر كتلة الجسم المثالي باستخدام معادلة Devine."
                : "Used to calculate your ideal BMI using the Devine formula."}
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 font-medium transition-all ${
                  gender === "male"
                    ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                    : "border-gray-200 text-gray-500 hover:border-cyan-300"
                }`}
              >
                <UserCircle2 className="w-5 h-5" />
                {isAr ? "ذكر" : "Male"}
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 font-medium transition-all ${
                  gender === "female"
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-gray-200 text-gray-500 hover:border-pink-300"
                }`}
              >
                <UserCircle className="w-5 h-5" />
                {isAr ? "أنثى" : "Female"}
              </button>
            </div>
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label htmlFor="birthDate" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {isAr ? "تاريخ الميلاد" : "Date of Birth"}
            </Label>
            <p className="text-xs text-gray-400">
              {isAr
                ? "يُستخدم لحساب عمرك لتعديلات نطاق مؤشر كتلة الجسم."
                : "Used to calculate your age for BMI range adjustments."}
            </p>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="max-w-xs"
            />
          </div>

          {/* Save */}
          <div className="pt-2">
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateProfile.isPending
                ? (isAr ? "جارٍ الحفظ..." : "Saving...")
                : (isAr ? "حفظ الملف الشخصي" : "Save Profile")}
            </Button>
          </div>
        </Card>

        {/* Info card */}
        <Card className="mt-6 p-6 border-0 bg-cyan-50 shadow-sm">
          <h3 className="font-semibold text-cyan-800 mb-2">
            {isAr ? "لماذا نحتاج هذه المعلومات؟" : "Why do we need this?"}
          </h3>
          <p className="text-sm text-cyan-700 leading-relaxed">
            {isAr ? (
              <>
                يتيح لنا <strong>جنسك</strong> و<strong>تاريخ ميلادك</strong> حساب{" "}
                <strong>مؤشر كتلة الجسم المثالي</strong> باستخدام معادلة Devine، وتطبيق نطاقات مؤشر كتلة الجسم الصحية المناسبة للعمر
                (مثلاً، كبار السن فوق 65 عاماً لديهم نطاق صحي أعلى قليلاً يتراوح بين 22–27). يتم قياس وزنك وطولك مباشرةً من جهاز الكشك المادي.
              </>
            ) : (
              <>
                Your <strong>gender</strong> and <strong>date of birth</strong> allow Tech Care to calculate your{" "}
                <strong>ideal BMI</strong> using the Devine formula, and to apply age-appropriate healthy BMI ranges
                (e.g., seniors aged 65+ have a slightly higher healthy range of 22–27). Your weight and height are
                measured directly from the physical kiosk device.
              </>
            )}
          </p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
