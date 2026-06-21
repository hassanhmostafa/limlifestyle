import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Heart, Mail, Lock, User } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const isAr = language === "ar";

  // Sign-in form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const utils = trpc.useUtils();

  const loginMutation = trpc.emailAuth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success(isAr ? "تم تسجيل الدخول بنجاح" : "Signed in successfully");
      navigate("/");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const registerMutation = trpc.emailAuth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success(isAr ? "تم إنشاء الحساب بنجاح" : "Account created successfully");
      navigate("/");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) return;
    if (regPassword !== regConfirm) {
      toast.error(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    registerMutation.mutate({ name: regName, email: regEmail, password: regPassword });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Tech Care</span>
          </div>
          <p className="text-gray-500 text-sm">
            {isAr ? "صحتك، أولويتنا" : "Your Health, Our Priority"}
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-xl">
              {isAr ? "مرحباً بك" : "Welcome"}
            </CardTitle>
            <CardDescription className="text-center">
              {isAr ? "سجّل دخولك أو أنشئ حساباً جديداً" : "Sign in or create a new account"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Social / Manus OAuth button */}
            <Button
              className="w-full bg-gray-900 hover:bg-gray-800 text-white gap-2"
              onClick={() => { window.location.href = getLoginUrl(); }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              {isAr ? "تسجيل الدخول بحساب Google / Apple / Microsoft" : "Continue with Google / Apple / Microsoft"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">
                  {isAr ? "أو" : "or"}
                </span>
              </div>
            </div>

            {/* Email / Password tabs */}
            <Tabs defaultValue="login">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">
                  {isAr ? "تسجيل الدخول" : "Sign In"}
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1">
                  {isAr ? "إنشاء حساب" : "Register"}
                </TabsTrigger>
              </TabsList>

              {/* ── Sign In ── */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-3 pt-2">
                  <div>
                    <Label htmlFor="login-email" className="text-sm">
                      {isAr ? "البريد الإلكتروني" : "Email"}
                    </Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="login-email"
                        type="email"
                        className="pl-8"
                        placeholder={isAr ? "example@email.com" : "you@example.com"}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="login-password" className="text-sm">
                      {isAr ? "كلمة المرور" : "Password"}
                    </Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="login-password"
                        type="password"
                        className="pl-8"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isAr ? "تسجيل الدخول" : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              {/* ── Register ── */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-3 pt-2">
                  <div>
                    <Label htmlFor="reg-name" className="text-sm">
                      {isAr ? "الاسم الكامل" : "Full Name"}
                    </Label>
                    <div className="relative mt-1">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="reg-name"
                        type="text"
                        className="pl-8"
                        placeholder={isAr ? "الاسم الكامل" : "Your full name"}
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reg-email" className="text-sm">
                      {isAr ? "البريد الإلكتروني" : "Email"}
                    </Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="reg-email"
                        type="email"
                        className="pl-8"
                        placeholder={isAr ? "example@email.com" : "you@example.com"}
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reg-password" className="text-sm">
                      {isAr ? "كلمة المرور" : "Password"}
                    </Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="reg-password"
                        type="password"
                        className="pl-8"
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reg-confirm" className="text-sm">
                      {isAr ? "تأكيد كلمة المرور" : "Confirm Password"}
                    </Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="reg-confirm"
                        type="password"
                        className="pl-8"
                        placeholder="••••••••"
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isAr ? "إنشاء الحساب" : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-center text-gray-400 pt-1">
              {isAr
                ? "بالتسجيل، أنت توافق على شروط الاستخدام وسياسة الخصوصية."
                : "By signing up, you agree to our Terms of Service and Privacy Policy."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
