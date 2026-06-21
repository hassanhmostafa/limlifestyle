import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Shared install state — exported so Navigation can use the same prompt
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });
  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

export function useInstallApp() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(
    typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true)
  );
  const [isIOS] = useState(() =>
    typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)
  );

  useEffect(() => {
    const update = () => {
      setPrompt(globalDeferredPrompt);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(standalone);
    };
    listeners.push(update);
    return () => {
      const idx = listeners.indexOf(update);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  const install = async () => {
    if (!globalDeferredPrompt) return false;
    await globalDeferredPrompt.prompt();
    const { outcome } = await globalDeferredPrompt.userChoice;
    if (outcome === "accepted") {
      globalDeferredPrompt = null;
      notifyListeners();
      return true;
    }
    return false;
  };

  // canInstall: true when the browser has the install prompt ready OR it's iOS (manual steps)
  const canInstall = !isInstalled && (!!prompt || isIOS);

  return { canInstall, isIOS, isInstalled, install };
}

// ─── iOS Instructions Modal ───────────────────────────────────────────────────
export function IOSInstallModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Install on iPhone</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <ol className="space-y-3 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            <span>Tap the <strong>Share</strong> button at the bottom of Safari (the square with an arrow pointing up)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            <span>Tap <strong>"Add"</strong> in the top right corner</span>
          </li>
        </ol>
        <Button
          className="w-full mt-5 bg-cyan-500 hover:bg-cyan-600 text-white"
          onClick={onClose}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}

// ─── Bottom Banner (shown automatically on first visit) ───────────────────────
export default function PWAInstallPrompt() {
  const { canInstall, isIOS, install } = useInstallApp();
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    if (!canInstall) return;
    const dismissed = sessionStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;
    const t = setTimeout(() => setShowBanner(true), 3000);
    return () => clearTimeout(t);
  }, [canInstall]);

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowBanner(false);
      setShowIOSModal(true);
      return;
    }
    const accepted = await install();
    if (accepted) setShowBanner(false);
  };

  return (
    <>
      {/* Bottom banner */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
          <div className="bg-white border border-cyan-200 rounded-2xl shadow-xl p-4 flex items-start gap-3">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663052167250/adQspJefUTFqKyf6yHum6G/pwa-icon-512-Njw5mfjYVQrS2JHikUmEfa.png"
              alt="Tech Care"
              className="w-12 h-12 rounded-xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">Install Tech Care</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Add to your home screen for quick access to your health data
              </p>
              <Button
                size="sm"
                onClick={handleInstall}
                className="mt-2 h-7 text-xs bg-cyan-500 hover:bg-cyan-600 text-white gap-1"
              >
                {isIOS ? <Share className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                {isIOS ? "How to install" : "Install"}
              </Button>
            </div>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS modal */}
      {showIOSModal && <IOSInstallModal onClose={() => setShowIOSModal(false)} />}
    </>
  );
}
