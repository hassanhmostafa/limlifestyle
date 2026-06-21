import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, CheckCircle, Clock, XCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ExpertRegistration() {
  const { user, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [form, setForm] = useState({ specialty: "", credentials: "", bio: "" });
  const [submitted, setSubmitted] = useState(false);

  const { data: myRequest, isLoading: requestLoading, refetch } = trpc.expertRequests.myRequest.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const submitMutation = trpc.expertRequests.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      refetch();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(form);
  };

  if (loading || requestLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-8 pb-8 text-center">
              <Stethoscope className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {isAr ? "سجّل الدخول للتقديم" : "Sign in to Apply"}
              </h2>
              <p className="text-gray-500 mb-6">
                {isAr
                  ? "تحتاج إلى تسجيل الدخول للتقدم كخبير صحي."
                  : "You need to be signed in to apply as a health expert."}
              </p>
              <a href="/login">
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  {isAr ? "تسجيل الدخول" : "Sign In"}
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Already an expert
  if (user?.role === "expert") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-8 pb-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {isAr ? "أنت بالفعل خبير" : "You're Already an Expert"}
              </h2>
              <p className="text-gray-500 mb-6">
                {isAr
                  ? "ملفك الشخصي كخبير نشط. انتقل إلى صندوق الوارد للدردشة مع المستخدمين."
                  : "Your expert profile is active. Go to your inbox to chat with users."}
              </p>
              <Link href="/expert-inbox">
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  {isAr ? "الذهاب إلى صندوق الوارد" : "Go to Expert Inbox"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusBadge = () => {
    if (!myRequest) return null;
    if (myRequest.status === "pending")
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
          <Clock className="w-3 h-3 mr-1" />
          {isAr ? "قيد المراجعة" : "Pending Review"}
        </Badge>
      );
    if (myRequest.status === "approved")
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          {isAr ? "مقبول" : "Approved"}
        </Badge>
      );
    if (myRequest.status === "rejected")
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300">
          <XCircle className="w-3 h-3 mr-1" />
          {isAr ? "مرفوض" : "Rejected"}
        </Badge>
      );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />

      <main className="flex-1 container max-w-2xl py-12">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4 mr-1" />
            {isAr ? "رجوع" : "Back"}
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isAr ? "التقدم كخبير صحي" : "Apply as a Health Expert"}
            </h1>
            <p className="text-gray-500 text-sm">
              {isAr
                ? "شارك خبرتك وساعد المستخدمين في رحلتهم الصحية"
                : "Share your expertise and help users on their health journey"}
            </p>
          </div>
        </div>

        {/* Existing request status */}
        {myRequest && (
          <Card className="mb-6 border-l-4 border-l-cyan-400">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">
                    {isAr ? "طلبك" : "Your Application"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {isAr ? "مقدَّم لـ" : "Submitted for"}{" "}
                    <span className="font-medium">{myRequest.specialty}</span>
                  </p>
                  {myRequest.adminNote && (
                    <p className="text-sm text-gray-600 mt-1 italic">
                      {isAr ? "ملاحظة المسؤول:" : "Admin note:"} {myRequest.adminNote}
                    </p>
                  )}
                </div>
                {statusBadge()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show form only if no pending/approved request */}
        {(!myRequest || myRequest.status === "rejected") && !submitted && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isAr ? "نموذج التسجيل" : "Registration Form"}
              </CardTitle>
              <CardDescription>
                {isAr
                  ? "أدخل تفاصيلك المهنية. سيراجع المسؤول طلبك ويتواصل معك."
                  : "Fill in your professional details. An admin will review your application and get back to you."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="specialty">{isAr ? "التخصص *" : "Specialty *"}</Label>
                  <Input
                    id="specialty"
                    placeholder={isAr ? "مثال: أخصائي تغذية، طبيب قلب، طبيب عام" : "e.g. Nutritionist, Cardiologist, General Practitioner"}
                    value={form.specialty}
                    onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                    required
                    minLength={2}
                    maxLength={128}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="credentials">{isAr ? "المؤهلات *" : "Credentials *"}</Label>
                  <Input
                    id="credentials"
                    placeholder={isAr ? "مثال: دكتوراه طب، جامعة الملك عبدالعزيز، خبرة 10 سنوات" : "e.g. MD, King Abdulaziz University, 10 years experience"}
                    value={form.credentials}
                    onChange={e => setForm(f => ({ ...f, credentials: e.target.value }))}
                    required
                    minLength={5}
                    maxLength={512}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio">{isAr ? "السيرة المهنية *" : "Professional Bio *"}</Label>
                  <Textarea
                    id="bio"
                    placeholder={isAr
                      ? "أخبر المستخدمين عن خلفيتك وخبرتك وكيف يمكنك مساعدتهم..."
                      : "Tell users about your background, experience, and how you can help them..."}
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={5}
                  />
                  <p className="text-xs text-gray-400">
                    {form.bio.length}/2000 {isAr ? "حرف" : "characters"}
                  </p>
                </div>

                {submitMutation.error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                    {submitMutation.error.message}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-cyan-500 hover:bg-cyan-600"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending
                    ? (isAr ? "جارٍ الإرسال..." : "Submitting...")
                    : (isAr ? "إرسال الطلب" : "Submit Application")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {submitted && (
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {isAr ? "تم إرسال الطلب!" : "Application Submitted!"}
              </h2>
              <p className="text-gray-500">
                {isAr
                  ? "طلبك قيد المراجعة. ستُبلَّغ عند معالجته من قِبل المسؤول."
                  : "Your application is under review. You'll be notified once an admin processes it."}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
