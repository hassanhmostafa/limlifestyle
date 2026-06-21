import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, MessageCircle, Loader2, Search, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FindExperts() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { language } = useLanguage();
  const isAr = language === "ar";

  const { data: experts, isLoading } = trpc.chat.listExperts.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const startConversation = trpc.chat.startConversation.useMutation({
    onSuccess: (data) => {
      navigate(`/expert-inbox?conv=${data.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = experts?.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.name?.toLowerCase().includes(q)) ||
      (e.specialty?.toLowerCase().includes(q)) ||
      (e.bio?.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
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
                {isAr ? "سجّل الدخول للتحدث مع الخبراء" : "Sign in to Talk to Experts"}
              </h2>
              <p className="text-gray-500 mb-6">
                {isAr
                  ? "تحتاج إلى تسجيل الدخول لتصفح خبراء الصحة والتواصل معهم."
                  : "You need to be signed in to browse and message health experts."}
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />

      <main className="flex-1 pt-20">
        {/* Header */}
        <section className="bg-gradient-to-r from-teal-700 to-teal-900 text-white py-12">
          <div className="container max-w-4xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold">
                {isAr ? "تحدث مع خبير" : "Talk to an Expert"}
              </h1>
            </div>
            <p className="text-teal-200 mb-6">
              {isAr
                ? "تواصل مع متخصصين صحيين معتمدين للحصول على نصائح شخصية في رحلتك الصحية."
                : "Connect with certified health professionals for personalized advice on your wellness journey."}
            </p>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9 bg-white text-gray-900 border-0"
                placeholder={isAr ? "ابحث بالاسم أو التخصص..." : "Search by name or specialty…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="container max-w-4xl">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              </div>
            ) : !filtered || filtered.length === 0 ? (
              <div className="text-center py-20">
                <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-700 mb-2">
                  {search
                    ? (isAr ? "لا يوجد خبراء يطابقون بحثك" : "No experts match your search")
                    : (isAr ? "لا يوجد خبراء متاحون بعد" : "No experts available yet")}
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  {search
                    ? (isAr ? "جرّب كلمة مفتاحية أو تخصصاً مختلفاً." : "Try a different keyword or specialty.")
                    : (isAr ? "تحقق لاحقاً — يجري إضافة الخبراء قريباً." : "Check back soon — experts are being onboarded.")}
                </p>
                {!search && user?.role === "user" && (
                  <Link href="/expert-registration">
                    <Button variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50">
                      {isAr ? "التقدم لتصبح خبيراً" : "Apply to Become an Expert"}
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filtered.map((expert) => (
                  <Card key={expert.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <UserCircle className="w-7 h-7 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-gray-900">
                              {expert.name || (isAr ? "خبير" : "Expert")}
                            </h3>
                            <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs">
                              {expert.specialty || (isAr ? "خبير صحي" : "Health Expert")}
                            </Badge>
                          </div>
                          {expert.bio && (
                            <p className="text-sm text-gray-500 line-clamp-3 mb-3">{expert.bio}</p>
                          )}
                          <Button
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                            onClick={() => startConversation.mutate({ expertId: expert.id })}
                            disabled={startConversation.isPending || user?.id === expert.id}
                          >
                            {startConversation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <MessageCircle className="w-3 h-3 mr-1" />
                            )}
                            {user?.id === expert.id
                              ? (isAr ? "أنت هذا الخبير" : "That's you")
                              : (isAr ? "مراسلة" : "Message")}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* CTA for regular users to apply */}
            {user?.role === "user" && (
              <div className="mt-10 p-6 bg-teal-50 rounded-xl border border-teal-100 text-center">
                <Stethoscope className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                <h3 className="font-semibold text-teal-800 mb-1">
                  {isAr ? "هل أنت متخصص صحي؟" : "Are you a health professional?"}
                </h3>
                <p className="text-sm text-teal-600 mb-4">
                  {isAr
                    ? "تقدم للانضمام كخبير وساعد المستخدمين في رحلتهم الصحية."
                    : "Apply to join as an expert and help users on their wellness journey."}
                </p>
                <Link href="/expert-registration">
                  <Button variant="outline" className="border-teal-400 text-teal-700 hover:bg-teal-100">
                    {isAr ? "التقدم كخبير" : "Apply as Expert"}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
