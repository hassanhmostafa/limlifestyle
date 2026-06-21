import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Streamdown } from "streamdown";
import {
  Brain,
  Salad,
  Sparkles,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react";
import { downloadAIPlanPDF } from "@/lib/pdfExport";
import { toast } from "sonner";

type PlanType = "health" | "diet" | "combined";

const planOptions: { type: PlanType; icon: React.ReactNode; label: string; labelAr: string; desc: string; descAr: string; color: string }[] = [
  {
    type: "health",
    icon: <Brain className="w-6 h-6" />,
    label: "Health Plan",
    labelAr: "خطة صحية",
    desc: "Exercise routines, lifestyle habits, sleep & stress management tailored to your vitals.",
    descAr: "تمارين رياضية وعادات صحية وإدارة النوم والتوتر مخصصة لمؤشراتك الصحية.",
    color: "from-cyan-500 to-blue-600",
  },
  {
    type: "diet",
    icon: <Salad className="w-6 h-6" />,
    label: "Diet Plan",
    labelAr: "خطة غذائية",
    desc: "7-day meal plan with Saudi-friendly foods, portion sizes, and hydration goals.",
    descAr: "خطة وجبات لمدة 7 أيام بأطعمة سعودية مناسبة وأحجام حصص وأهداف ترطيب.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    type: "combined",
    icon: <Sparkles className="w-6 h-6" />,
    label: "Full Wellness Plan",
    labelAr: "خطة العافية الشاملة",
    desc: "Complete health + diet plan combining exercise, nutrition, and lifestyle improvements.",
    descAr: "خطة صحية وغذائية شاملة تجمع بين التمارين والتغذية وتحسين نمط الحياة.",
    color: "from-purple-500 to-pink-600",
  },
];

function PlanCard({ plan, onDelete, isAr, userName }: {
  plan: { id: number; planType: string; content: string; createdAt: Date; metricsSnapshot?: Record<string, unknown> | null };
  onDelete: (id: number) => void;
  isAr: boolean;
  userName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const option = planOptions.find((o) => o.type === plan.planType) ?? planOptions[2];
  const dateStr = new Date(plan.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center text-white flex-shrink-0`}>
              {option.icon}
            </div>
            <div>
              <div className="font-semibold text-gray-900">
                {isAr ? option.labelAr : option.label}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                <Clock className="w-3 h-3" />
                {dateStr}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
            >
              {expanded ? (isAr ? "إخفاء" : "Hide") : (isAr ? "عرض" : "View")}
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => downloadAIPlanPDF(plan.content, plan.planType, userName, plan.createdAt)}
              className="text-gray-400 hover:text-cyan-600 transition-colors"
              title={isAr ? "تحميل PDF" : "Download PDF"}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(plan.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title={isAr ? "حذف" : "Delete"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="prose prose-sm max-w-none text-gray-700">
              <Streamdown>{plan.content}</Streamdown>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function AiPlan() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { t, language } = useLanguage();
  const isAr = language === "ar";

  const [selectedType, setSelectedType] = useState<PlanType>("combined");
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generatedType, setGeneratedType] = useState<PlanType | null>(null);

  const { data: plans, isLoading: plansLoading, refetch: refetchPlans } = trpc.aiPlans.myPlans.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const generateMutation = trpc.aiPlans.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      setGeneratedType(selectedType);
      refetchPlans();
      toast.success(isAr ? "تم إنشاء الخطة بنجاح!" : "Plan generated successfully!");
    },
    onError: (err) => {
      toast.error(err.message || (isAr ? "فشل إنشاء الخطة. حاول مرة أخرى." : "Failed to generate plan. Please try again."));
    },
  });

  const deleteMutation = trpc.aiPlans.deletePlan.useMutation({
    onSuccess: () => {
      refetchPlans();
      toast.success(isAr ? "تم حذف الخطة." : "Plan deleted.");
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="p-10 border-0 shadow-sm text-center max-w-md w-full">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isAr ? "تسجيل الدخول مطلوب" : "Sign In Required"}
            </h2>
            <p className="text-gray-500 mb-6 text-sm">
              {isAr
                ? "يرجى تسجيل الدخول للوصول إلى خطط الصحة والغذاء المخصصة بالذكاء الاصطناعي."
                : "Please sign in to access your AI-powered personalized health and diet plans."}
            </p>
            <Button
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
              onClick={() => (window.location.href = "/login")}
            >
              {isAr ? "تسجيل الدخول" : "Sign In"}
            </Button>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const selectedOption = planOptions.find((o) => o.type === selectedType)!;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />

      <main className="flex-1 container max-w-4xl pt-24 pb-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isAr ? "خطط الصحة والغذاء بالذكاء الاصطناعي" : "AI Health & Diet Plans"}
          </h1>
          <p className="text-gray-500 mt-2">
            {isAr
              ? "احصل على خطط مخصصة بناءً على مؤشراتك الصحية الفعلية."
              : "Get personalized plans based on your actual health metrics and vitals."}
          </p>
        </div>

        {/* Plan Type Selector */}
        <Card className="border-0 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {isAr ? "اختر نوع الخطة" : "Choose Plan Type"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {planOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => setSelectedType(option.type)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  selectedType === option.type
                    ? "border-cyan-500 bg-cyan-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center text-white mb-3`}>
                  {option.icon}
                </div>
                <div className="font-semibold text-gray-900 text-sm mb-1">
                  {isAr ? option.labelAr : option.label}
                </div>
                <div className="text-xs text-gray-500 leading-relaxed">
                  {isAr ? option.descAr : option.desc}
                </div>
                {selectedType === option.type && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <Button
              onClick={() => generateMutation.mutate({ planType: selectedType, language: language as "en" | "ar" })}
              disabled={generateMutation.isPending}
              className={`bg-gradient-to-r ${selectedOption.color} text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm hover:opacity-90 transition-opacity`}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isAr ? "جاري الإنشاء..." : "Generating..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isAr ? "إنشاء الخطة" : "Generate Plan"}
                </>
              )}
            </Button>
            <p className="text-xs text-gray-400">
              {isAr
                ? "سيستخدم الذكاء الاصطناعي أحدث قراءاتك الصحية."
                : "AI will use your latest health readings to personalize the plan."}
            </p>
          </div>
        </Card>

        {/* Newly Generated Plan */}
        {generatedContent && generatedType && (
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className={`bg-gradient-to-r ${planOptions.find((o) => o.type === generatedType)?.color} p-4`}>
              <div className="flex items-center gap-2 text-white font-semibold">
                <Sparkles className="w-5 h-5" />
                {isAr ? "خطتك الجديدة" : "Your New Plan"}
              </div>
            </div>
            <div className="p-6">
              <div className="prose prose-sm max-w-none text-gray-700">
                <Streamdown>{generatedContent}</Streamdown>
              </div>
            </div>
          </Card>
        )}

        {/* Plan History */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {isAr ? "خططي السابقة" : "My Previous Plans"}
          </h2>

          {plansLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
            </div>
          ) : !plans || plans.length === 0 ? (
            <Card className="border-0 shadow-sm p-10 text-center text-gray-400">
              <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {isAr
                  ? "لم تقم بإنشاء أي خطط بعد. اختر نوعًا وانقر على \"إنشاء الخطة\"."
                  : "No plans generated yet. Choose a type above and click \"Generate Plan\"."}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onDelete={(id) => deleteMutation.mutate({ id })}
                  isAr={isAr}
                  userName={user?.name ?? 'Patient'}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
