import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  isArabic() {
    try {
      const saved = localStorage.getItem("tc_lang");
      if (saved === "ar" || saved === "en") return saved === "ar";
    } catch {
      /* Browser storage is optional. */
    }
    return (
      typeof navigator !== "undefined" && navigator.language.startsWith("ar")
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          translate="no"
          lang={this.isArabic() ? "ar" : "en"}
          dir={this.isArabic() ? "rtl" : "ltr"}
          className="flex items-center justify-center min-h-screen p-8 bg-background"
        >
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">
              {typeof window !== "undefined" && this.isArabic()
                ? "حدث خطأ غير متوقع."
                : "An unexpected error occurred."}
            </h2>

            {import.meta.env.DEV && (
              <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
                <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                  {this.state.error?.stack}
                </pre>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              {typeof window !== "undefined" && this.isArabic()
                ? "إعادة تحميل الصفحة"
                : "Reload Page"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
