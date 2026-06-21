/**
 * Machine Simulator
 *
 * Simulates what the physical kiosk machine does:
 * 1. User presses "Start Session" (like touching the machine screen).
 * 2. Machine generates a random token and displays a QR code.
 * 3. Machine polls every second for the user to scan + confirm on their phone.
 * 4. Once confirmed, machine shows who is ready and waits for measurement data.
 *
 * Open this page on a laptop/desktop. Scan the QR with your phone.
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ── Standalone PDF receipt generator (no app branding, machine-side printout) ──
type ReceiptMetrics = {
  height: number; weight: number; bmi: number;
  systolic: number; diastolic: number; heartRate: number;
  temperature: number; spO2: number; bodyFatRate: number;
  muscleRate: number; bloodSugar: number;
};

function printHealthReceipt(
  metrics: ReceiptMetrics,
  patient: { name: string | null; email: string | null } | null
) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-SA", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" });

  const bmiStatus = (bmi: number) => {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25)   return "Normal";
    if (bmi < 30)   return "Overweight";
    return "Obese";
  };

  const bpStatus = (s: number, d: number) => {
    if (s < 120 && d < 80)  return "Normal";
    if (s < 130 && d < 80)  return "Elevated";
    if (s < 140 || d < 90)  return "High Stage 1";
    return "High Stage 2";
  };

  const rows = [
    { label: "Blood Pressure",  value: `${metrics.systolic}/${metrics.diastolic} mmHg`, note: bpStatus(metrics.systolic, metrics.diastolic) },
    { label: "Heart Rate",      value: `${metrics.heartRate} bpm`,                       note: metrics.heartRate < 60 ? "Low" : metrics.heartRate > 100 ? "High" : "Normal" },
    { label: "Weight",          value: `${metrics.weight} kg`,                           note: "" },
    { label: "Height",          value: `${metrics.height} cm`,                           note: "" },
    { label: "BMI",             value: String(metrics.bmi),                              note: bmiStatus(metrics.bmi) },
    { label: "SpO2",            value: `${metrics.spO2}%`,                               note: metrics.spO2 < 95 ? "Low" : "Normal" },
    { label: "Body Temperature",value: `${metrics.temperature} °C`,                      note: metrics.temperature > 37.5 ? "Elevated" : "Normal" },
    { label: "Blood Sugar",     value: `${metrics.bloodSugar} mmol/L`,                   note: metrics.bloodSugar > 6.1 ? "Elevated" : "Normal" },
    { label: "Body Fat",        value: `${metrics.bodyFatRate}%`,                        note: "" },
    { label: "Muscle Rate",     value: `${metrics.muscleRate}%`,                         note: "" },
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Health Check Receipt</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #1a1a1a; padding: 32px; max-width: 480px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 24px; }
    .station-name { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    .title { font-size: 22px; font-weight: 700; color: #0ea5e9; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #94a3b8; }
    .meta { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 20px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; }
    .patient { font-size: 13px; margin-bottom: 20px; padding: 12px 14px; background: #f0f9ff; border-left: 3px solid #0ea5e9; border-radius: 0 8px 8px 0; }
    .patient strong { display: block; font-size: 15px; color: #0c4a6e; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #94a3b8; text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: middle; }
    td:first-child { color: #475569; }
    td:nth-child(2) { font-weight: 600; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
    .badge-normal  { background: #dcfce7; color: #166534; }
    .badge-warn    { background: #fef9c3; color: #854d0e; }
    .badge-high    { background: #fee2e2; color: #991b1b; }
    .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; line-height: 1.8; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="station-name">Tech Care Health Station</div>
    <div class="title">Health Check Receipt</div>
    <div class="subtitle">Automated Screening Results</div>
  </div>
  <div class="meta">
    <span>Date: ${dateStr}</span>
    <span>Time: ${timeStr}</span>
  </div>
  ${patient?.name ? `<div class="patient"><strong>${patient.name}</strong>${patient.email ? `<span style="color:#64748b;font-size:11px">${patient.email}</span>` : ""}</div>` : ""}
  <table>
    <thead><tr><th>Measurement</th><th>Result</th><th>Status</th></tr></thead>
    <tbody>
      ${rows.map(r => {
        const cls = r.note === "Normal" ? "badge-normal" : r.note === "" ? "" : "badge-warn";
        const badge = r.note ? `<span class="badge ${cls}">${r.note}</span>` : "—";
        return `<tr><td>${r.label}</td><td>${r.value}</td><td>${badge}</td></tr>`;
      }).join("")}
    </tbody>
  </table>
  <div class="footer">
    This receipt is for informational purposes only.<br/>
    Please consult a healthcare professional for medical advice.<br/>
    <strong style="color:#0ea5e9">Tech Care · techcarev2-zgcnaa4a.manus.space</strong>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=600,height=800");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
import { QRCodeSVG } from "qrcode.react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { CheckCircle2, Stethoscope, Printer, Loader2, FlaskConical } from "lucide-react";
import { toast } from "sonner";

type SimulatorState = "idle" | "waiting" | "confirmed" | "expired";

export default function MachineSimulator() {
  const { user, loading: authLoading } = useAuth();

  const [state, setState] = useState<SimulatorState>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [confirmedUser, setConfirmedUser] = useState<{ name: string | null; email: string | null } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  type TestMetrics = {
    height: number; weight: number; bmi: number;
    systolic: number; diastolic: number; heartRate: number;
    temperature: number; spO2: number; bodyFatRate: number;
    muscleRate: number; bloodSugar: number;
  } | null;
  const [testMetrics, setTestMetrics] = useState<TestMetrics>(null);

  const testMeasurementMutation = trpc.kioskIntegration.sendTestMeasurement.useMutation({
    onSuccess: (data) => {
      setTestMetrics(data.metrics);
      toast.success("Test measurement sent! Check the Health Dashboard.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const generateToken = trpc.kioskIntegration.generateMachineToken.useMutation();

  // Poll every second when we have a token
  const pollQuery = trpc.kioskIntegration.pollSessionStatus.useQuery(
    { token: token ?? "" },
    {
      enabled: pollingEnabled && !!token,
      refetchInterval: 1000,
      refetchIntervalInBackground: true,
    }
  );

  // React to poll results
  useEffect(() => {
    if (!pollQuery.data) return;
    if (pollQuery.data.confirmed && pollQuery.data.user) {
      setConfirmedUser(pollQuery.data.user as { name: string | null; email: string | null });
      setState("confirmed");
      setPollingEnabled(false);
    } else if (pollQuery.data.expired) {
      setState("expired");
      setPollingEnabled(false);
    }
  }, [pollQuery.data]);

  // Countdown timer
  useEffect(() => {
    if (state !== "waiting" || !expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        setState("expired");
        setPollingEnabled(false);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [state, expiresAt]);

  const handleStart = async () => {
    setState("idle");
    setToken(null);
    setConfirmedUser(null);
    setPollingEnabled(false);
    setSecondsLeft(60);
    setTestMetrics(null);

    try {
      const result = await generateToken.mutateAsync({ deviceId: "SIMULATOR" });
      setToken(result.token);
      setExpiresAt(new Date(result.expiresAt));
      setState("waiting");
      setPollingEnabled(true);
    } catch (e) {
      console.error(e);
    }
  };

  const qrUrl = token
    ? `${window.location.origin}/kiosk-login?token=${token}`
    : "";

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <p className="text-gray-600">You must be signed in to use the machine simulator.</p>
            <a href={getLoginUrl()}>
              <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">Sign In</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      {/* Header — mimics a kiosk machine UI */}
      <div className="mb-8 text-center">
        <div className="text-cyan-400 text-sm font-mono uppercase tracking-widest mb-1">Tech Care Health Station</div>
        <div className="text-gray-400 text-xs font-mono">SIMULATOR MODE · Device: SIMULATOR</div>
      </div>

      <div className="w-full max-w-md">
        {/* ── IDLE ── */}
        {state === "idle" && (
          <Card className="bg-gray-800 border-gray-700 text-center">
            <CardContent className="pt-12 pb-12 space-y-6">
              <div className="text-6xl">🖥️</div>
              <div>
                <h2 className="text-white text-2xl font-bold mb-2">Health Kiosk Ready</h2>
                <p className="text-gray-400 text-sm">
                  Press the button below to simulate the machine generating a session QR code.
                  Then scan it with your phone to test the full login flow.
                </p>
              </div>
              <Button
                onClick={handleStart}
                disabled={generateToken.isPending}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white text-lg py-6"
              >
                {generateToken.isPending ? <Spinner className="mr-2" /> : null}
                Touch to Start Session
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── WAITING FOR SCAN ── */}
        {state === "waiting" && token && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-8 pb-8 space-y-6 text-center">
              <div>
                <h2 className="text-white text-xl font-bold mb-1">Scan with Tech Care App</h2>
                <p className="text-gray-400 text-sm">
                  Open the Tech Care app on your phone and scan this QR code.
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl inline-block shadow-lg">
                  <QRCodeSVG
                    value={qrUrl}
                    size={220}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Token display — like the machine's screen label */}
              <div className="font-mono text-xs text-gray-500 space-y-1">
                <div>Token: <span className="text-cyan-400">{token}</span></div>
                <div className="text-gray-600 text-xs break-all">{qrUrl}</div>
              </div>

              {/* Countdown */}
              <div className="flex items-center justify-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-lg font-bold font-mono transition-colors ${
                    secondsLeft > 20
                      ? "border-cyan-500 text-cyan-400"
                      : secondsLeft > 10
                      ? "border-yellow-500 text-yellow-400"
                      : "border-red-500 text-red-400"
                  }`}
                >
                  {secondsLeft}
                </div>
                <div className="text-gray-400 text-sm">seconds remaining</div>
              </div>

              {/* Polling indicator */}
              <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                Polling for confirmation every second…
              </div>

              <Button
                variant="ghost"
                onClick={handleStart}
                className="text-gray-500 hover:text-white text-sm"
              >
                Regenerate QR
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── CONFIRMED ── */}
        {state === "confirmed" && confirmedUser && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-10 pb-10 space-y-6 text-center">
              <div className="text-5xl">✅</div>
              <div>
                <h2 className="text-white text-2xl font-bold mb-1">User Confirmed!</h2>
                <p className="text-gray-400 text-sm">The machine now knows who is using it.</p>
              </div>

              <div className="bg-gray-900 rounded-xl p-5 space-y-2 text-left">
                <div className="text-gray-400 text-xs uppercase tracking-widest mb-3">User Identity</div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Name</span>
                  <span className="text-white font-medium">{confirmedUser.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Email</span>
                  <span className="text-cyan-400 text-sm">{confirmedUser.email ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Token</span>
                  <span className="text-gray-400 font-mono text-xs">{token}</span>
                </div>
              </div>

              {/* Test Measurement Panel */}
              <div className="bg-gray-900 rounded-xl p-4 space-y-3 text-left border border-amber-800/40">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-amber-400" />
                  <p className="text-amber-300 text-sm font-semibold">Simulate Measurement Upload</p>
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Press below to simulate the machine sending health data for this user — exactly as the real device would after completing measurements.
                </p>

                {testMetrics ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Data sent successfully!
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { label: "Blood Pressure", value: `${testMetrics.systolic}/${testMetrics.diastolic} mmHg` },
                        { label: "Heart Rate", value: `${testMetrics.heartRate} bpm` },
                        { label: "Weight", value: `${testMetrics.weight} kg` },
                        { label: "Height", value: `${testMetrics.height} cm` },
                        { label: "BMI", value: String(testMetrics.bmi) },
                        { label: "SpO2", value: `${testMetrics.spO2}%` },
                        { label: "Blood Sugar", value: `${testMetrics.bloodSugar} mmol/L` },
                        { label: "Body Fat", value: `${testMetrics.bodyFatRate}%` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-800 rounded-lg p-2">
                          <p className="text-gray-500 text-xs">{label}</p>
                          <p className="font-semibold text-white text-sm">{value}</p>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white h-9 text-sm"
                      onClick={() => printHealthReceipt(testMetrics!, confirmedUser)}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print Health Receipt
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white h-10"
                    onClick={() => testMeasurementMutation.mutate({ sessionToken: token ?? undefined })}
                    disabled={testMeasurementMutation.isPending}
                  >
                    {testMeasurementMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending measurement...</>
                    ) : (
                      <><Stethoscope className="w-4 h-4 mr-2" />Send Test Measurement</>
                    )}
                  </Button>
                )}
              </div>

              <Button
                onClick={handleStart}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white"
              >
                Start New Session
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── EXPIRED ── */}
        {state === "expired" && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-10 pb-10 space-y-6 text-center">
              <div className="text-5xl">⏱️</div>
              <div>
                <h2 className="text-white text-xl font-bold mb-1">Session Expired</h2>
                <p className="text-gray-400 text-sm">
                  The 60-second window passed without a scan. Start a new session.
                </p>
              </div>
              <Button
                onClick={handleStart}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center space-y-2">
        <p className="text-gray-600 text-xs font-mono">
          This page simulates the kiosk machine screen. Open on desktop, scan with phone.
        </p>
        <Link href="/" className="text-gray-600 hover:text-gray-400 text-xs underline">
          Back to App
        </Link>
      </div>
    </div>
  );
}
