import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FlaskConical, Loader2, CheckCircle2, XCircle, Zap, ChevronDown, ChevronUp } from "lucide-react";

interface ReadingFields {
  // Height & Weight
  height: string;
  weight: string;
  bmi: string;
  // Blood Pressure
  systolic: string;
  diastolic: string;
  heartRate: string;
  // Oxygen & Temp
  spo2: string;
  temperature: string;
  // Body Composition
  bodyFatRate: string;
  muscleMass: string;
  // Blood Sugar
  bloodSugar: string;
}

const defaultReadings: ReadingFields = {
  height: "175",
  weight: "75",
  bmi: "24.5",
  systolic: "120",
  diastolic: "80",
  heartRate: "72",
  spo2: "98",
  temperature: "36.6",
  bodyFatRate: "18.5",
  muscleMass: "58.2",
  bloodSugar: "5.4",
};

export function KioskTestTab() {
  const [deviceId, setDeviceId] = useState("TEST-DEVICE-001");
  const [sessionToken, setSessionToken] = useState("");
  const [readings, setReadings] = useState<ReadingFields>(defaultReadings);
  const [postResult, setPostResult] = useState<{ success: boolean; message: string; data?: unknown } | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [showRawPayload, setShowRawPayload] = useState(false);

  const { data: devices } = trpc.kioskIntegration.listDevices.useQuery();

  const createSessionMutation = trpc.kioskIntegration.createSession.useMutation({
    onSuccess: (data) => {
      setSessionToken(data.token);
      toast.success("Session token created — valid for 60 minutes");
    },
    onError: (e) => toast.error(e.message),
  });

  const buildPayload = () => ({
    sessionToken,
    deviceID: deviceId,
    examNo: `TEST-${Date.now()}`,
    hw: {
      height: readings.height,
      weight: readings.weight,
      bmi: readings.bmi,
    },
    blood: {
      high: readings.systolic,
      low: readings.diastolic,
      rate: readings.heartRate,
    },
    spo2: { sp: readings.spo2 },
    tiwen: readings.temperature,
    fat: {
      zflv: readings.bodyFatRate,
      jrl: readings.muscleMass,
    },
    xt: {
      type: "1",
      value: readings.bloodSugar,
    },
  });

  const handlePostData = async () => {
    if (!sessionToken) {
      toast.error("Create a session token first");
      return;
    }
    setIsPosting(true);
    setPostResult(null);
    try {
      const payload = buildPayload();
      const res = await fetch("/api/kiosk/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.code === "1") {
        setPostResult({ success: true, message: json.msg || "Readings saved successfully", data: json });
        toast.success("Kiosk data submitted successfully!");
      } else {
        setPostResult({ success: false, message: json.msg || `HTTP ${res.status}`, data: json });
        toast.error(json.msg || "Submission failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setPostResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsPosting(false);
    }
  };

  const updateReading = (key: keyof ReadingFields, value: string) => {
    setReadings((prev) => ({ ...prev, [key]: value }));
  };

  const fieldGroups = [
    {
      title: "Height & Weight",
      fields: [
        { key: "height" as const, label: "Height (cm)" },
        { key: "weight" as const, label: "Weight (kg)" },
        { key: "bmi" as const, label: "BMI" },
      ],
    },
    {
      title: "Blood Pressure & Heart Rate",
      fields: [
        { key: "systolic" as const, label: "Systolic (mmHg)" },
        { key: "diastolic" as const, label: "Diastolic (mmHg)" },
        { key: "heartRate" as const, label: "Heart Rate (bpm)" },
      ],
    },
    {
      title: "Oxygen & Temperature",
      fields: [
        { key: "spo2" as const, label: "SpO₂ (%)" },
        { key: "temperature" as const, label: "Temperature (°C)" },
      ],
    },
    {
      title: "Body Composition & Blood Sugar",
      fields: [
        { key: "bodyFatRate" as const, label: "Body Fat Rate (%)" },
        { key: "muscleMass" as const, label: "Muscle Mass (kg)" },
        { key: "bloodSugar" as const, label: "Blood Sugar (mmol/L)" },
      ],
    },
  ];

  return (
    <section className="py-8">
      <div className="container max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <FlaskConical className="w-6 h-6 text-cyan-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">Kiosk Data Test Console</h2>
            <p className="text-sm text-gray-500">
              Simulate a TRIPLEBIGHT kiosk submission without real hardware. Creates a session token then POSTs to{" "}
              <code className="bg-gray-100 px-1 rounded text-xs">/api/kiosk/data</code>.
            </p>
          </div>
        </div>

        {/* Step 1: Device & Session */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center font-bold">1</span>
              Select Device & Create Session Token
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Device ID</Label>
              <div className="flex gap-2">
                <Input
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="e.g. 2CFDA15B9372"
                  className="font-mono"
                />
                {devices && devices.length > 0 && (
                  <select
                    className="border rounded-md px-3 text-sm text-gray-700 bg-white"
                    onChange={(e) => setDeviceId(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>Pick registered device</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.deviceId}>
                        {d.label ? `${d.label} (${d.deviceId})` : d.deviceId}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {devices && devices.length === 0 && (
                <p className="text-xs text-amber-600">
                  No registered devices yet. Go to the <strong>Kiosk Devices</strong> tab to register one first, or type any Device ID to test.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => createSessionMutation.mutate({ deviceId })}
                disabled={createSessionMutation.isPending || !deviceId}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                {createSessionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Create Session Token
              </Button>
              {sessionToken && (
                <Badge className="bg-green-100 text-green-700 font-mono text-xs max-w-xs truncate">
                  ✓ {sessionToken.slice(0, 20)}…
                </Badge>
              )}
            </div>

            {sessionToken && (
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Session Token (auto-filled)</Label>
                <Input
                  value={sessionToken}
                  onChange={(e) => setSessionToken(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Readings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center font-bold">2</span>
              Enter Health Readings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {fieldGroups.map((group) => (
              <div key={group.title}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group.title}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {group.fields.map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={readings[key]}
                        onChange={(e) => updateReading(key, e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Step 3: Submit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center font-bold">3</span>
              Submit to /api/kiosk/data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Raw payload preview */}
            <div>
              <button
                onClick={() => setShowRawPayload((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {showRawPayload ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showRawPayload ? "Hide" : "Preview"} raw JSON payload
              </button>
              {showRawPayload && (
                <pre className="mt-2 bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-60 font-mono">
                  {JSON.stringify(buildPayload(), null, 2)}
                </pre>
              )}
            </div>

            <Button
              onClick={handlePostData}
              disabled={isPosting || !sessionToken}
              className="bg-cyan-500 hover:bg-cyan-600 w-full sm:w-auto"
              size="lg"
            >
              {isPosting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FlaskConical className="w-4 h-4 mr-2" />
              )}
              POST Kiosk Data
            </Button>

            {!sessionToken && (
              <p className="text-xs text-amber-600">Complete Step 1 first to get a session token.</p>
            )}

            {/* Result */}
            {postResult && (
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  postResult.success
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                {postResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className={`font-semibold text-sm ${postResult.success ? "text-green-700" : "text-red-700"}`}>
                    {postResult.success ? "Success" : "Failed"}
                  </p>
                  <p className="text-sm text-gray-700">{postResult.message}</p>
                  {postResult.data !== undefined && (
                    <pre className="text-xs bg-white border rounded p-2 mt-2 font-mono overflow-auto max-h-40">
                      {JSON.stringify(postResult.data as Record<string, unknown>, null, 2)}
                    </pre>
                  )}
                  {postResult.success && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Readings saved to the user's health history. Check <strong>My Health</strong> to verify.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
