import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Heart, Lock, User, Phone } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const requestedRedirect = new URLSearchParams(search).get("redirect");
  const redirectPath = requestedRedirect?.startsWith("/") ? requestedRedirect : "/";

  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const utils = trpc.useUtils();

  const loginMutation = trpc.phoneAuth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success(isAr ? "تم تسجيل الدخول بنجاح" : "Signed in successfully");
      navigate(redirectPath);
    },
    onError: (err) => toast.error(err.message),
  });

  const registerMutation = trpc.phoneAuth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success(isAr ? "تم إنشاء الحساب بنجاح" : "Account created successfully");
      navigate(redirectPath);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    loginMutation.mutate({ phone: loginPhone, password: loginPassword });
  };

  const handleRegister = (event: React.FormEvent) => {
    event.preventDefault();
    if (regPassword !== regConfirm) {
      toast.error(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    registerMutation.mutate({ name: regName, phone: regPhone, password: regPassword });
  };

  const phoneLabel = isAr ? "رقم الجوال السعودي" : "Saudi Mobile Number";
  const phonePlaceholder = "05XXXXXXXX";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-[#dff45a] rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">LIM</span>
          </div>
          <p className="text-gray-500 text-sm">{isAr ? "صحتك، أولويتنا" : "Your Health, Our Priority"}</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-xl">{isAr ? "مرحباً بك" : "Welcome"}</CardTitle>
            <CardDescription className="text-center">
              {isAr ? "استخدم رقم جوالك للدخول أو لإنشاء حساب جديد" : "Use your mobile number to sign in or create an account"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Tabs defaultValue="login">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">{isAr ? "تسجيل الدخول" : "Sign In"}</TabsTrigger>
                <TabsTrigger value="register" className="flex-1">{isAr ? "إنشاء حساب" : "Register"}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 pt-3">
                  <PhoneField id="login-phone" label={phoneLabel} placeholder={phonePlaceholder} value={loginPhone} onChange={setLoginPhone} />
                  <PasswordField id="login-password" label={isAr ? "كلمة المرور" : "Password"} value={loginPassword} onChange={setLoginPassword} />
                  <Button type="submit" className="w-full bg-[#dff45a] text-[#073f35] hover:bg-[#cde944]" disabled={loginMutation.isPending}>
                    {loginMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isAr ? "تسجيل الدخول" : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 pt-3">
                  <div>
                    <Label htmlFor="reg-name" className="text-sm">{isAr ? "الاسم الكامل" : "Full Name"}</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="reg-name" className="pl-8" placeholder={isAr ? "الاسم الكامل" : "Your full name"} value={regName} onChange={(event) => setRegName(event.target.value)} required />
                    </div>
                  </div>
                  <PhoneField id="reg-phone" label={phoneLabel} placeholder={phonePlaceholder} value={regPhone} onChange={setRegPhone} />
                  <PasswordField id="reg-password" label={isAr ? "كلمة المرور" : "Password"} value={regPassword} onChange={setRegPassword} minLength={6} />
                  <PasswordField id="reg-confirm" label={isAr ? "تأكيد كلمة المرور" : "Confirm Password"} value={regConfirm} onChange={setRegConfirm} minLength={6} />
                  <Button type="submit" className="w-full bg-[#dff45a] text-[#073f35] hover:bg-[#cde944]" disabled={registerMutation.isPending}>
                    {registerMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isAr ? "إنشاء الحساب" : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-center text-gray-400 leading-relaxed">
              {isAr
                ? "سيتم تفعيل التحقق عبر رمز SMS في تحديث لاحق."
                : "SMS one-time-password verification will be added in a future update."}
            </p>
            <p className="text-xs text-center text-gray-400">{isAr ? "بالتسجيل، أنت توافق على شروط الاستخدام وسياسة الخصوصية." : "By signing up, you agree to our Terms of Service and Privacy Policy."}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PhoneField({ id, label, placeholder, value, onChange }: { id: string; label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <div className="relative mt-1">
        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input id={id} type="tel" inputMode="tel" autoComplete="tel" className="pl-8" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} required dir="ltr" />
      </div>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, minLength }: { id: string; label: string; value: string; onChange: (value: string) => void; minLength?: number }) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <div className="relative mt-1">
        <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input id={id} type="password" autoComplete="current-password" className="pl-8" placeholder="••••••••" value={value} onChange={(event) => onChange(event.target.value)} required minLength={minLength} />
      </div>
    </div>
  );
}
