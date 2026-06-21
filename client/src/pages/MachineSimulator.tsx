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
import { QRCodeSVG } from "qrcode.react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

type SimulatorState = "idle" | "waiting" | "confirmed" | "expired";

export default function MachineSimulator() {
  const { user, loading: authLoading } = useAuth();

  const [state, setState] = useState<SimulatorState>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [confirmedUser, setConfirmedUser] = useState<{ name: string | null; email: string | null } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [pollingEnabled, setPollingEnabled] = useState(false);

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

              <p className="text-gray-500 text-xs">
                In a real machine, measurements would now begin automatically.
                The data would be uploaded to the server tagged with this token,
                and appear in the user's health dashboard.
              </p>

              <Button
                onClick={handleStart}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
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
