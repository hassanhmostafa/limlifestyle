import { useState, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Heart,
  Activity,
  Scale,
  Thermometer,
  Plus,
  Trash2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  LogIn,
  Target,
  Download,
} from "lucide-react";
import { Link } from "wouter";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { downloadHealthScoresPDF } from "@/lib/pdfExport";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface LogFormData {
  kioskId: string;
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  heartRate: string;
  weight: string;
  height: string;
  temperature: string;
  notes: string;
}

const emptyForm: LogFormData = {
  kioskId: "",
  bloodPressureSystolic: "",
  bloodPressureDiastolic: "",
  heartRate: "",
  weight: "",
  height: "",
  temperature: "",
  notes: "",
};

function calcBmi(weight: string, height: string): string {
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100;
  if (!w || !h) return "";
  return (w / (h * h)).toFixed(1);
}

function Trend({ values }: { values: (number | null | undefined)[] }) {
  const clean = (values ?? []).filter((v): v is number => v != null);
  if (clean.length < 2) return <Minus className="w-4 h-4 text-gray-400" />;
  const last = clean[clean.length - 1];
  const prev = clean[clean.length - 2];
  if (last > prev) return <TrendingUp className="w-4 h-4 text-red-500" />;
  if (last < prev) return <TrendingDown className="w-4 h-4 text-green-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

// ─── Health Score Banner ──────────────────────────────────────────────────

type HealthScoreData =
  | {
      status: "ok";
      score: number;
      grade: "Excellent" | "Good" | "Fair" | "Poor";
      gradeColor: string;
      breakdown: {
        bloodPressure: number | null;
        heartRate: number | null;
        bmi: number | null;
        temperature: number | null;
      };
      readingDate: Date;
    }
  | { status: "no_readings" }
  | undefined;

function HealthScoreBanner({
  scoreData,
  scoreLoading,
}: {
  scoreData: HealthScoreData;
  scoreLoading: boolean;
}) {
  if (scoreLoading) {
    return (
      <Card className="p-6 border-0 shadow-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Calculating your health score...</span>
        </div>
      </Card>
    );
  }

  if (!scoreData || scoreData.status === "no_readings") {
    return (
      <Card className="p-6 border-0 shadow-sm bg-blue-50">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-800 mb-1">No Health Score Yet</h3>
            <p className="text-sm text-blue-700">Log your first reading to get your overall health score.</p>
          </div>
        </div>
      </Card>
    );
  }

  const data = scoreData as Exclude<HealthScoreData, { status: "no_readings" } | undefined>;
  if (data.status !== "ok") return null;

  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (data.score / 100) * circumference;

  const breakdownItems = [
    { label: "Blood Pressure", value: data.breakdown.bloodPressure, icon: <Activity className="w-4 h-4" /> },
    { label: "BMI", value: data.breakdown.bmi, icon: <Scale className="w-4 h-4" /> },
    { label: "Heart Rate", value: data.breakdown.heartRate, icon: <Heart className="w-4 h-4" /> },
    { label: "Temperature", value: data.breakdown.temperature, icon: <Thermometer className="w-4 h-4" /> },
  ];

  return (
    <Card className="p-6 border-0 shadow-sm overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="relative shrink-0">
          <svg width="120" height="120" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke={data.gradeColor} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
            <text x="50" y="46" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#111827">{data.score}</text>
            <text x="50" y="62" textAnchor="middle" fontSize="10" fill="#6b7280">out of 100</text>
          </svg>
        </div>
        <div className="flex-1 w-full">
          <div className="flex items-center gap-3 mb-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Overall Health Score</div>
              <div className="text-2xl font-bold" style={{ color: data.gradeColor }}>{data.grade}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {breakdownItems.map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                  {item.icon}
                  <span className="text-xs">{item.label}</span>
                </div>
                {item.value !== null ? (
                  <>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full" style={{
                        width: `${item.value}%`,
                        backgroundColor: item.value >= 90 ? "#22c55e" : item.value >= 75 ? "#06b6d4" : item.value >= 50 ? "#f97316" : "#ef4444",
                      }} />
                    </div>
                    <div className="text-xs font-semibold text-gray-700">{item.value}/100</div>
                  </>
                ) : (
                  <div className="text-xs text-gray-400">No data</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── BMI Comparison Card ───────────────────────────────────────────────────

type WeightTarget = {
  idealWeightKg: number;
  currentWeightKg: number;
  diffKg: number;
  progressPct: number;
  direction: "lose" | "gain" | "at_ideal";
};

type BmiDataOk = {
  status: "ok";
  actualBmi: number;
  idealBmi: number;
  healthyMin: number;
  healthyMax: number;
  classification: "Underweight" | "Normal" | "Overweight" | "Obese";
  age: number;
  weight: number;
  height: number;
  readingDate: Date;
  weightTarget: WeightTarget;
};

type BmiDataState =
  | BmiDataOk
  | { status: "profile_incomplete" }
  | { status: "no_readings" }
  | undefined;

function BmiComparisonCard({ bmiData, bmiLoading }: { bmiData: BmiDataState; bmiLoading: boolean }) {
  if (bmiLoading) {
    return (
      <Card className="p-6 border-0 shadow-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading BMI data...</span>
        </div>
      </Card>
    );
  }
  if (!bmiData || bmiData.status === "no_readings") return null;
  if (bmiData.status === "profile_incomplete") {
    return (
      <Card className="p-6 border-0 shadow-sm bg-amber-50">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-800 mb-1">Complete Your Profile</h3>
            <p className="text-sm text-amber-700">Add your date of birth and gender in your profile to see your BMI comparison.</p>
            <Link href="/profile">
              <Button size="sm" variant="outline" className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100">Go to Profile</Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const data = bmiData as BmiDataOk;
  const bmiMin = 15; const bmiMax = 40;
  const clamp = (v: number) => Math.max(0, Math.min(100, ((v - bmiMin) / (bmiMax - bmiMin)) * 100));
  const healthyMinPct = clamp(data.healthyMin);
  const healthyMaxPct = clamp(data.healthyMax);
  const idealPct = clamp(data.idealBmi);
  const actualPct = clamp(data.actualBmi);

  const classColor = data.classification === "Normal" ? "#22c55e" : data.classification === "Underweight" ? "#3b82f6" : data.classification === "Overweight" ? "#f97316" : "#ef4444";

  return (
    <Card className="p-6 border-0 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Scale className="w-5 h-5 text-blue-500" /> BMI Analysis
        </h3>
        <span className="text-sm font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: classColor }}>
          {data.classification}
        </span>
      </div>

      <div className="flex items-end gap-6 mb-4">
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Your BMI</div>
          <div className="text-3xl font-bold" style={{ color: classColor }}>{data.actualBmi.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Ideal BMI</div>
          <div className="text-xl font-semibold text-cyan-600">{data.idealBmi.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Healthy Range</div>
          <div className="text-sm font-medium text-gray-600">{data.healthyMin}–{data.healthyMax}</div>
        </div>
      </div>

      <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden mb-1">
        <div className="absolute top-0 h-full bg-green-200 rounded-full"
          style={{ left: `${healthyMinPct}%`, width: `${healthyMaxPct - healthyMinPct}%` }} />
        <div className="absolute top-0 h-full w-1 bg-cyan-500" style={{ left: `${idealPct}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow"
          style={{ left: `calc(${actualPct}% - 8px)`, backgroundColor: classColor }} />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-green-200"></span> Healthy zone</span>
        <span className="flex items-center gap-1"><span className="inline-block w-1 h-3 bg-cyan-500"></span> Ideal</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-gray-400"></span> Your BMI</span>
      </div>

      {data.weightTarget && (
        <div className="mt-5 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-cyan-500" /> Ideal Weight Target
            </span>
            <span className="text-sm font-bold text-cyan-600">{data.weightTarget.idealWeightKg} kg</span>
          </div>
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-500" style={{
              width: `${data.weightTarget.progressPct}%`,
              backgroundColor: data.weightTarget.direction === "at_ideal" ? "#22c55e" : data.weightTarget.progressPct >= 70 ? "#06b6d4" : data.weightTarget.progressPct >= 40 ? "#f97316" : "#ef4444",
            }} />
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">
              {data.weightTarget.direction === "at_ideal" ? "✓ You are at your ideal weight!"
                : data.weightTarget.direction === "lose" ? `Need to lose ${Math.abs(data.weightTarget.diffKg)} kg`
                : `Need to gain ${Math.abs(data.weightTarget.diffKg)} kg`}
            </span>
            <span className="font-semibold text-gray-600">{data.weightTarget.progressPct}% there</span>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400 border-t pt-3 mt-4 flex flex-wrap gap-4">
        <span>Weight: <strong className="text-gray-600">{data.weight} kg</strong></span>
        <span>Height: <strong className="text-gray-600">{data.height} cm</strong></span>
        <span>Age: <strong className="text-gray-600">{data.age} yrs</strong></span>
        <span>Reading: <strong className="text-gray-600">{format(new Date(data.readingDate), "MMM d, yyyy")}</strong></span>
      </div>
    </Card>
  );
}

// ─── Per-Metric Chart Card ─────────────────────────────────────────────────

type ChartRange = "1W" | "1M" | "1Y";

interface MetricChartCardProps {
  title: string;
  color: string;
  chartId: string;
  weekData: object[];
  monthData: object[];
  yearData: object[];
  renderChart: (data: object[], range: ChartRange) => React.ReactNode;
}

function MetricChartCard({ title, chartId, weekData, monthData, yearData, renderChart }: MetricChartCardProps) {
  const [range, setRange] = useState<ChartRange>("1M");

  const data = range === "1W" ? weekData : range === "1M" ? monthData : yearData;

  return (
    <Card className="p-5 border-0 shadow-sm" id={chartId}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <div className="flex gap-1">
          {(["1W", "1M", "1Y"] as ChartRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                range === r ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {r === "1W" ? "Weekly" : r === "1M" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
      ) : (
        renderChart(data, range)
      )}
    </Card>
  );
}

// ─── Chart data helpers ────────────────────────────────────────────────────

function formatDate(dateVal: Date | string, range: ChartRange): string {
  const d = new Date(dateVal);
  if (range === "1W") return format(d, "EEE d");
  if (range === "1M") return format(d, "MMM d");
  return format(d, "MMM");
}

type RawReading = {
  recordedAt: Date;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  weight?: string | null;
  bmi?: string | null;
  temperature?: string | null;
};

function buildChartData(readings: RawReading[], range: ChartRange) {
  const now = new Date();
  const cutoff = new Date(now);
  if (range === "1W") cutoff.setDate(now.getDate() - 7);
  else if (range === "1M") cutoff.setMonth(now.getMonth() - 1);
  else cutoff.setFullYear(now.getFullYear() - 1);

  return [...readings]
    .filter((r) => new Date(r.recordedAt) >= cutoff)
    .reverse()
    .map((r) => ({
      date: formatDate(r.recordedAt, range),
      systolic: r.bloodPressureSystolic ?? null,
      diastolic: r.bloodPressureDiastolic ?? null,
      heartRate: r.heartRate ?? null,
      weight: r.weight ? parseFloat(r.weight) : null,
      bmi: r.bmi ? parseFloat(r.bmi) : null,
      temperature: r.temperature ? parseFloat(r.temperature) : null,
      score: (() => {
        let total = 0; let count = 0;
        if (r.bloodPressureSystolic != null && r.bloodPressureDiastolic != null) {
          const s = r.bloodPressureSystolic <= 120 && r.bloodPressureDiastolic <= 80 ? 100
            : r.bloodPressureSystolic <= 130 ? 80 : r.bloodPressureSystolic <= 140 ? 60 : r.bloodPressureSystolic <= 160 ? 40 : 20;
          total += s; count++;
        }
        if (r.heartRate != null) {
          total += (r.heartRate >= 60 && r.heartRate <= 100 ? 100 : r.heartRate >= 50 && r.heartRate <= 110 ? 70 : 40);
          count++;
        }
        if (r.bmi != null) {
          const b = parseFloat(r.bmi as unknown as string);
          total += (b >= 18.5 && b <= 24.9 ? 100 : b >= 17 && b <= 27 ? 70 : 40);
          count++;
        }
        return count > 0 ? Math.round(total / count) : null;
      })(),
    }));
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function HealthDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const { t } = useLanguage();

  const [showLog, setShowLog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<LogFormData>(emptyForm);
  const [downloading, setDownloading] = useState(false);
  const chartsRef = useRef<HTMLDivElement>(null);
  const [visibleCharts, setVisibleCharts] = useState<Record<string, boolean>>({
    bloodPressure: true,
    heartRate: true,
    weight: true,
    bmi: true,
    temperature: true,
    healthScore: true,
  });
  const toggleChart = (key: string) =>
    setVisibleCharts((prev) => ({ ...prev, [key]: !prev[key] }));

  const { data: readings, isLoading: readingsLoading } = trpc.health.myReadings.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: bmiData, isLoading: bmiLoading } = trpc.health.bmiComparison.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: healthScore, isLoading: scoreLoading } = trpc.health.healthScore.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: kiosks } = trpc.kiosks.list.useQuery(undefined, { enabled: isAuthenticated });

  const logMutation = trpc.health.logReading.useMutation({
    onSuccess: () => {
      utils.health.myReadings.invalidate();
      setShowLog(false);
      setForm(emptyForm);
      toast.success("Health reading logged successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.health.deleteReading.useMutation({
    onSuccess: () => {
      utils.health.myReadings.invalidate();
      setDeleteId(null);
      toast.success("Reading deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.kioskId) { toast.error("Please select a kiosk"); return; }
    const bmi = calcBmi(form.weight, form.height);
    logMutation.mutate({
      kioskId: form.kioskId,
      bloodPressureSystolic: form.bloodPressureSystolic ? parseInt(form.bloodPressureSystolic) : undefined,
      bloodPressureDiastolic: form.bloodPressureDiastolic ? parseInt(form.bloodPressureDiastolic) : undefined,
      heartRate: form.heartRate ? parseInt(form.heartRate) : undefined,
      weight: form.weight || undefined,
      height: form.height || undefined,
      bmi: bmi || undefined,
      temperature: form.temperature || undefined,
      notes: form.notes || undefined,
    });
  };

  // Build chart data for all three ranges
  const weekData = useMemo(() => readings ? buildChartData(readings, "1W") : [], [readings]);
  const monthData = useMemo(() => readings ? buildChartData(readings, "1M") : [], [readings]);
  const yearData = useMemo(() => readings ? buildChartData(readings, "1Y") : [], [readings]);

  // Latest values for summary cards
  const latest = readings?.[0];
  const bpSystolicValues = (readings ?? []).map((r) => r.bloodPressureSystolic ?? null);
  const hrValues = (readings ?? []).map((r) => r.heartRate ?? null);
  const weightValues = (readings ?? []).map((r) => (r.weight ? parseFloat(r.weight) : null));
  const bmiValues = (readings ?? []).map((r) => (r.bmi ? parseFloat(r.bmi) : null));

  // ── PDF download: renders all metrics at all 3 ranges via off-screen containers ──
  const handleDownloadPDF = useCallback(async () => {
    if (!readings || readings.length === 0) return;
    setDownloading(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const name = user?.name ?? "Patient";

      // Header
      doc.setFillColor(8, 145, 178);
      doc.rect(0, 0, 210, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Tech Care", 14, 12);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Health Report — All Metrics", 14, 20);
      doc.setFontSize(9);
      doc.setTextColor(200, 240, 255);
      doc.text(`Patient: ${name} · Generated: ${now}`, 14, 26);
      doc.setTextColor(40, 40, 40);

      let y = 36;

      // ── Overall Health Score ──
      if (healthScore && healthScore.status === "ok") {
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(8, 145, 178);
        doc.text("Overall Health Score", 14, y);
        y += 7;

        doc.setFontSize(28);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(`${healthScore.score}/100`, 14, y + 6);
        doc.setFontSize(14);
        doc.setTextColor(100, 100, 100);
        doc.text(`Grade: ${healthScore.grade}`, 60, y + 6);
        y += 18;

        // Component breakdown table
        const breakdown = healthScore.breakdown;
        const componentRows: [string, string][] = [
          ["Blood Pressure", breakdown.bloodPressure != null ? `${breakdown.bloodPressure}/100` : "—"],
          ["Heart Rate", breakdown.heartRate != null ? `${breakdown.heartRate}/100` : "—"],
          ["BMI", breakdown.bmi != null ? `${breakdown.bmi}/100` : "—"],
          ["Temperature", breakdown.temperature != null ? `${breakdown.temperature}/100` : "—"],
        ];
        autoTable(doc, {
          startY: y,
          head: [["Component", "Score / 100"]],
          body: componentRows,
          theme: "striped",
          headStyles: { fillColor: [8, 145, 178], textColor: 255, fontStyle: "bold" },
          styles: { fontSize: 10, cellPadding: 3 },
          margin: { left: 14, right: 14 },
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      // ── Latest Vitals ──
      const latestReading = readings[0];
      if (latestReading) {
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(8, 145, 178);
        doc.text("Latest Vitals", 14, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          head: [["Metric", "Value", "Unit"]],
          body: [
            ["Blood Pressure", latestReading.bloodPressureSystolic && latestReading.bloodPressureDiastolic ? `${latestReading.bloodPressureSystolic}/${latestReading.bloodPressureDiastolic}` : "—", "mmHg"],
            ["Heart Rate", latestReading.heartRate?.toString() ?? "—", "bpm"],
            ["Weight", latestReading.weight ?? "—", "kg"],
            ["Height", latestReading.height ?? "—", "cm"],
            ["BMI", latestReading.bmi ?? "—", "kg/m²"],
            ["Temperature", latestReading.temperature ?? "—", "°C"],
          ],
          theme: "striped",
          headStyles: { fillColor: [8, 145, 178], textColor: 255, fontStyle: "bold" },
          styles: { fontSize: 10, cellPadding: 3 },
          margin: { left: 14, right: 14 },
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      // ── Charts section heading ──
      if (y + 10 > 270) { doc.addPage(); y = 14; }
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(8, 145, 178);
      doc.text("Health Trends", 14, y);
      y += 8;

      // Helper: convert a DOM element containing an SVG chart to a PNG data URL
      const svgToDataUrl = (el: HTMLElement): Promise<string> => {
        return new Promise((resolve, reject) => {
          const svgEl = el.querySelector("svg");
          if (!svgEl) { resolve(""); return; }
          const svgClone = svgEl.cloneNode(true) as SVGElement;
          // Inline computed styles for text elements so they render correctly
          svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          const w = svgEl.clientWidth || 560;
          const h = svgEl.clientHeight || 180;
          svgClone.setAttribute("width", String(w));
          svgClone.setAttribute("height", String(h));
          const serialized = new XMLSerializer().serializeToString(svgClone);
          const blob = new Blob([serialized], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = w * 2; canvas.height = h * 2;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/png"));
          };
          img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("SVG render failed")); };
          img.src = url;
        });
      };

      // Capture each chart card at all 3 ranges via pdf-specific hidden IDs
      const metrics = [
        { id: "pdf-chart-bp", title: "Blood Pressure" },
        { id: "pdf-chart-hr", title: "Heart Rate" },
        { id: "pdf-chart-weight", title: "Weight" },
        { id: "pdf-chart-bmi", title: "BMI" },
        { id: "pdf-chart-temp", title: "Temperature" },
        { id: "pdf-chart-score", title: "Health Score" },
      ];
      const ranges: ChartRange[] = ["1W", "1M", "1Y"];
      const rangeLabels: Record<ChartRange, string> = { "1W": "Weekly", "1M": "Monthly", "1Y": "Yearly" };

      for (const metric of metrics) {
        // Section heading per metric
        if (y + 10 > 280) { doc.addPage(); y = 14; }
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(8, 145, 178);
        doc.text(metric.title, 14, y);
        y += 6;

        for (const range of ranges) {
          const el = document.getElementById(`${metric.id}-${range}`);
          if (!el) continue;
          let imgData = "";
          try { imgData = await svgToDataUrl(el); } catch { /* skip if render fails */ }
          if (!imgData) continue;

          const imgW = 182;
          const imgH = 54; // fixed height: 180px chart at 96dpi → ~48mm, use 54 for padding

          if (y + imgH + 14 > 280) { doc.addPage(); y = 14; }
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(rangeLabels[range], 14, y);
          y += 3;
          doc.addImage(imgData, "PNG", 14, y, imgW, imgH);
          y += imgH + 6;
        }
        y += 4;
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Generated by Tech Care · Page ${i} of ${pageCount} · ${now}`,
          14,
          doc.internal.pageSize.height - 8
        );
      }

      doc.save(`TechCare_HealthReport_${name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [readings, healthScore, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center max-w-md px-4">
            <Heart className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">{t.health_title}</h1>
            <p className="text-gray-600 mb-6">{t.health_signInPrompt}</p>
            <a href="/login">
              <Button className="bg-cyan-500 hover:bg-cyan-600">
                <LogIn className="w-4 h-4 mr-2" />
                {t.health_signInBtn}
              </Button>
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />

      <main className="flex-1 pt-20">
        {/* Header */}
        <section className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white py-10">
          <div className="container flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">{t.health_title}</h1>
              <p className="text-cyan-100">{t.health_welcome}, {user?.name?.split(" ")[0]}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 bg-transparent"
                onClick={handleDownloadPDF}
                disabled={!readings || readings.length === 0 || downloading}
              >
                {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {downloading ? "Generating..." : "Download Report"}
              </Button>
              <Button className="bg-white text-cyan-700 hover:bg-cyan-50" onClick={() => setShowLog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t.health_logReading}
              </Button>
            </div>
          </div>
        </section>

        <div className="container py-8 space-y-8">
          {/* Health Score Banner */}
          <HealthScoreBanner scoreData={healthScore} scoreLoading={scoreLoading} />

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Activity className="w-5 h-5 text-red-500" />, label: t.health_bpLabel, value: latest?.bloodPressureSystolic ? `${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic}` : "—", unit: "mmHg", trend: <Trend values={bpSystolicValues} /> },
              { icon: <Heart className="w-5 h-5 text-pink-500" />, label: t.health_hrLabel, value: latest?.heartRate ?? "—", unit: "bpm", trend: <Trend values={hrValues} /> },
              { icon: <Scale className="w-5 h-5 text-blue-500" />, label: t.health_weightLabel, value: latest?.weight ? parseFloat(latest.weight).toFixed(1) : "—", unit: "kg", trend: <Trend values={weightValues} /> },
              { icon: <Thermometer className="w-5 h-5 text-orange-500" />, label: t.health_bmiLabel, value: latest?.bmi ? parseFloat(latest.bmi).toFixed(1) : "—", unit: "", trend: <Trend values={bmiValues} /> },
            ].map((card) => (
              <Card key={card.label} className="p-5 border-0 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">{card.icon}</div>
                  {card.trend}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {card.value}
                  {card.unit && <span className="text-sm font-normal text-gray-500 ml-1">{card.unit}</span>}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">{card.label}</div>
              </Card>
            ))}
          </div>

          {/* BMI Comparison Section */}
          <BmiComparisonCard bmiData={bmiData} bmiLoading={bmiLoading} />

          {/* Chart toggle pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-600 mr-1">Show:</span>
            {([
              { key: "bloodPressure", label: "Blood Pressure", color: "#ef4444" },
              { key: "heartRate",     label: "Heart Rate",     color: "#ec4899" },
              { key: "weight",        label: "Weight",         color: "#3b82f6" },
              { key: "bmi",           label: "BMI",            color: "#8b5cf6" },
              { key: "temperature",   label: "Temperature",    color: "#f97316" },
              { key: "healthScore",   label: "Health Score",   color: "#10b981" },
            ] as const).map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => toggleChart(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  visibleCharts[key]
                    ? "text-white shadow-sm"
                    : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                }`}
                style={visibleCharts[key] ? { backgroundColor: color, borderColor: color } : {}}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: visibleCharts[key] ? "white" : color }} />
                {label}
              </button>
            ))}
          </div>

          {/* Per-Metric Charts (visible on screen) */}
          <div ref={chartsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Blood Pressure */}
            {visibleCharts.bloodPressure && <MetricChartCard
              title="Blood Pressure"
              color="#ef4444"
              chartId="chart-bp"
              weekData={weekData}
              monthData={monthData}
              yearData={yearData}
              renderChart={(data) => (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="gradSys" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradDia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} fill="url(#gradSys)" dot={false} name="Systolic (mmHg)" />
                    <Area type="monotone" dataKey="diastolic" stroke="#f97316" strokeWidth={2} fill="url(#gradDia)" dot={false} name="Diastolic (mmHg)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            />}

            {/* Heart Rate */}
            {visibleCharts.heartRate && <MetricChartCard
              title="Heart Rate"
              color="#ec4899"
              chartId="chart-hr"
              weekData={weekData}
              monthData={monthData}
              yearData={yearData}
              renderChart={(data) => (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="gradHR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="heartRate" stroke="#ec4899" strokeWidth={2} fill="url(#gradHR)" dot={false} name="Heart Rate (bpm)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            />}

            {/* Weight */}
            {visibleCharts.weight && <MetricChartCard
              title="Weight"
              color="#3b82f6"
              chartId="chart-weight"
              weekData={weekData}
              monthData={monthData}
              yearData={yearData}
              renderChart={(data) => (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="gradW" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} fill="url(#gradW)" dot={false} name="Weight (kg)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            />}

            {/* BMI */}
            {visibleCharts.bmi && <MetricChartCard
              title="BMI"
              color="#8b5cf6"
              chartId="chart-bmi"
              weekData={weekData}
              monthData={monthData}
              yearData={yearData}
              renderChart={(data) => (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="gradBMI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="bmi" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradBMI)" dot={false} name="BMI" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            />}

            {/* Temperature */}
            {visibleCharts.temperature && <MetricChartCard
              title="Temperature"
              color="#f97316"
              chartId="chart-temp"
              weekData={weekData}
              monthData={monthData}
              yearData={yearData}
              renderChart={(data) => (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} fill="url(#gradTemp)" dot={false} name="Temperature (°C)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            />}

            {/* Health Score */}
            {visibleCharts.healthScore && <MetricChartCard
              title="Health Score"
              color="#10b981"
              chartId="chart-score"
              weekData={weekData}
              monthData={monthData}
              yearData={yearData}
              renderChart={(data) => (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="gradScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} fill="url(#gradScore)" dot={false} name="Health Score" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            />}
          </div>

          {/* Hidden PDF charts — all 6 metrics at all 3 ranges, always rendered off-screen */}
          <div className="absolute -left-[9999px] top-0 w-[600px] pointer-events-none" aria-hidden="true">
            {([
              { id: "pdf-chart-bp", title: "Blood Pressure", renderChart: (d: object[]) => (
                <ResponsiveContainer width={560} height={180}>
                  <AreaChart data={d}>
                    <defs>
                      <linearGradient id="pdfGradSys" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                      <linearGradient id="pdfGradDia" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.12}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="date" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} domain={["auto","auto"]}/>
                    <Tooltip/><Legend/>
                    <Area type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} fill="url(#pdfGradSys)" dot={false} name="Systolic (mmHg)"/>
                    <Area type="monotone" dataKey="diastolic" stroke="#f97316" strokeWidth={2} fill="url(#pdfGradDia)" dot={false} name="Diastolic (mmHg)"/>
                  </AreaChart>
                </ResponsiveContainer>
              )},
              { id: "pdf-chart-hr", title: "Heart Rate", renderChart: (d: object[]) => (
                <ResponsiveContainer width={560} height={180}>
                  <AreaChart data={d}>
                    <defs><linearGradient id="pdfGradHR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ec4899" stopOpacity={0.18}/><stop offset="95%" stopColor="#ec4899" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="date" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} domain={["auto","auto"]}/>
                    <Tooltip/><Legend/>
                    <Area type="monotone" dataKey="heartRate" stroke="#ec4899" strokeWidth={2} fill="url(#pdfGradHR)" dot={false} name="Heart Rate (bpm)"/>
                  </AreaChart>
                </ResponsiveContainer>
              )},
              { id: "pdf-chart-weight", title: "Weight", renderChart: (d: object[]) => (
                <ResponsiveContainer width={560} height={180}>
                  <AreaChart data={d}>
                    <defs><linearGradient id="pdfGradW" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="date" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} domain={["auto","auto"]}/>
                    <Tooltip/><Legend/>
                    <Area type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} fill="url(#pdfGradW)" dot={false} name="Weight (kg)"/>
                  </AreaChart>
                </ResponsiveContainer>
              )},
              { id: "pdf-chart-bmi", title: "BMI", renderChart: (d: object[]) => (
                <ResponsiveContainer width={560} height={180}>
                  <AreaChart data={d}>
                    <defs><linearGradient id="pdfGradBMI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="date" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} domain={["auto","auto"]}/>
                    <Tooltip/><Legend/>
                    <Area type="monotone" dataKey="bmi" stroke="#8b5cf6" strokeWidth={2} fill="url(#pdfGradBMI)" dot={false} name="BMI"/>
                  </AreaChart>
                </ResponsiveContainer>
              )},
              { id: "pdf-chart-temp", title: "Temperature", renderChart: (d: object[]) => (
                <ResponsiveContainer width={560} height={180}>
                  <AreaChart data={d}>
                    <defs><linearGradient id="pdfGradTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="date" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} domain={["auto","auto"]}/>
                    <Tooltip/><Legend/>
                    <Area type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} fill="url(#pdfGradTemp)" dot={false} name="Temperature (°C)"/>
                  </AreaChart>
                </ResponsiveContainer>
              )},
              { id: "pdf-chart-score", title: "Health Score", renderChart: (d: object[]) => (
                <ResponsiveContainer width={560} height={180}>
                  <AreaChart data={d}>
                    <defs><linearGradient id="pdfGradScore" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.18}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="date" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} domain={[0,100]}/>
                    <Tooltip/><Legend/>
                    <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} fill="url(#pdfGradScore)" dot={false} name="Health Score"/>
                  </AreaChart>
                </ResponsiveContainer>
              )},
            ] as const).map(({ id, renderChart: rc }) => (
              <div key={id}>
                <div id={`${id}-1W`} className="bg-white p-3">{rc(weekData)}</div>
                <div id={`${id}-1M`} className="bg-white p-3">{rc(monthData)}</div>
                <div id={`${id}-1Y`} className="bg-white p-3">{rc(yearData)}</div>
              </div>
            ))}
          </div>

          {/* Readings History */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t.health_history}</h2>
            {readingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
              </div>
            ) : !readings || readings.length === 0 ? (
              <Card className="p-10 border-0 shadow-sm text-center">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">{t.health_noReadings}</p>
                <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={() => setShowLog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t.health_logReading}
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {readings.map((r) => (
                  <Card key={r.id} className="p-4 border-0 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-4 text-sm">
                          {r.bloodPressureSystolic && (
                            <span className="flex items-center gap-1 text-red-600 font-medium">
                              <Activity className="w-3.5 h-3.5" />
                              {r.bloodPressureSystolic}/{r.bloodPressureDiastolic} mmHg
                            </span>
                          )}
                          {r.heartRate && (
                            <span className="flex items-center gap-1 text-pink-600 font-medium">
                              <Heart className="w-3.5 h-3.5" />
                              {r.heartRate} bpm
                            </span>
                          )}
                          {r.weight && (
                            <span className="flex items-center gap-1 text-blue-600 font-medium">
                              <Scale className="w-3.5 h-3.5" />
                              {parseFloat(r.weight).toFixed(1)} kg
                            </span>
                          )}
                          {r.bmi && <span className="text-gray-600 font-medium">BMI {parseFloat(r.bmi).toFixed(1)}</span>}
                          {r.temperature && (
                            <span className="flex items-center gap-1 text-orange-600 font-medium">
                              <Thermometer className="w-3.5 h-3.5" />
                              {parseFloat(r.temperature).toFixed(1)}°C
                            </span>
                          )}
                        </div>
                        {r.notes && <p className="text-sm text-gray-500 mt-1 italic">"{r.notes}"</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(r.recordedAt), "EEEE, MMMM d, yyyy · h:mm a")}
                          {" · Kiosk ID: "}{r.kioskId}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteId(r.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Log Reading Dialog */}
      <Dialog open={showLog} onOpenChange={(open) => { if (!open) { setShowLog(false); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Health Reading</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Station *</Label>
              <Select value={form.kioskId} onValueChange={(v) => setForm((p) => ({ ...p, kioskId: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select the kiosk you visited" />
                </SelectTrigger>
                <SelectContent>
                  {kiosks?.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Systolic BP (mmHg)</Label>
                <Input type="number" placeholder="120" value={form.bloodPressureSystolic} onChange={(e) => setForm((p) => ({ ...p, bloodPressureSystolic: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Diastolic BP (mmHg)</Label>
                <Input type="number" placeholder="80" value={form.bloodPressureDiastolic} onChange={(e) => setForm((p) => ({ ...p, bloodPressureDiastolic: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Heart Rate (bpm)</Label>
                <Input type="number" placeholder="72" value={form.heartRate} onChange={(e) => setForm((p) => ({ ...p, heartRate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Temperature (°C)</Label>
                <Input type="number" step="0.1" placeholder="36.6" value={form.temperature} onChange={(e) => setForm((p) => ({ ...p, temperature: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Weight (kg)</Label>
                <Input type="number" step="0.1" placeholder="70.0" value={form.weight} onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Height (cm)</Label>
                <Input type="number" placeholder="170" value={form.height} onChange={(e) => setForm((p) => ({ ...p, height: e.target.value }))} className="mt-1" />
              </div>
            </div>
            {form.weight && form.height && (
              <p className="text-sm text-cyan-600 font-medium">Calculated BMI: {calcBmi(form.weight, form.height)}</p>
            )}
            <div>
              <Label className="text-sm font-medium">Notes (optional)</Label>
              <Input placeholder="Any observations or comments..." value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowLog(false); setForm(emptyForm); }}>Cancel</Button>
            <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={handleSubmit} disabled={logMutation.isPending || !form.kioskId}>
              {logMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Reading
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reading?</AlertDialogTitle>
            <AlertDialogDescription>This health reading will be permanently removed from your history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
