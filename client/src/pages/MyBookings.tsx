import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

type Tab = "upcoming" | "past";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  confirmed: <Clock className="w-3 h-3" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

export default function MyBookings() {
  const { user, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  const { data: bookings, isLoading } = trpc.bookings.myBookings.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const cancelMutation = trpc.bookings.cancel.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم إلغاء الحجز بنجاح" : "Booking cancelled successfully");
      utils.bookings.myBookings.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Split bookings into upcoming (confirmed) and past (completed/cancelled)
  const today = new Date().toISOString().split("T")[0];

  const upcoming = (bookings ?? []).filter(
    (b) => b.status === "confirmed" && b.visitDate >= today
  );
  const past = (bookings ?? []).filter(
    (b) => b.status !== "confirmed" || b.visitDate < today
  );

  const displayed = activeTab === "upcoming" ? upcoming : past;

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm mx-auto px-4">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-800">
              {isAr ? "يرجى تسجيل الدخول" : "Please sign in"}
            </h2>
            <p className="text-gray-500 text-sm">
              {isAr
                ? "تحتاج إلى تسجيل الدخول لعرض حجوزاتك."
                : "You need to be signed in to view your bookings."}
            </p>
            <a href="/login">
              <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
                {isAr ? "تسجيل الدخول" : "Sign In"}
              </Button>
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container max-w-3xl py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <CalendarDays className="w-7 h-7 text-cyan-500" />
            <h1 className="text-3xl font-bold text-gray-900">
              {isAr ? "حجوزاتي" : "My Bookings"}
            </h1>
          </div>
          <p className="text-gray-500 text-sm mt-1 ml-10">
            {isAr
              ? "عرض وإدارة مواعيد الفحص الصحي المحجوزة"
              : "View and manage your scheduled health screening appointments"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {(["upcoming", "past"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white text-cyan-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "upcoming"
                ? isAr
                  ? `القادمة (${upcoming.length})`
                  : `Upcoming (${upcoming.length})`
                : isAr
                ? `السابقة (${past.length})`
                : `Past (${past.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              {activeTab === "upcoming"
                ? isAr
                  ? "لا توجد حجوزات قادمة."
                  : "No upcoming bookings."
                : isAr
                ? "لا توجد حجوزات سابقة."
                : "No past bookings."}
            </p>
            {activeTab === "upcoming" && (
              <Link href="/find-station">
                <Button
                  variant="outline"
                  className="mt-4 border-cyan-300 text-cyan-600 hover:bg-cyan-50"
                >
                  {isAr ? "ابحث عن محطة" : "Find a Station"}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map((booking) => (
              <Card
                key={booking.id}
                className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Kiosk name */}
                      <p className="font-semibold text-gray-900 text-base leading-tight">
                        {booking.kioskName ?? booking.kioskId}
                      </p>

                      {/* Location */}
                      {booking.kioskLocation && (
                        <p className="text-sm text-gray-500 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {booking.kioskLocation}
                        </p>
                      )}

                      {/* Date & time */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                          {formatDate(booking.visitDate, isAr)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                          {booking.timeSlot}
                        </span>
                      </div>

                      {/* Notes */}
                      {booking.notes && (
                        <p className="text-xs text-gray-400 italic">
                          {booking.notes}
                        </p>
                      )}
                    </div>

                    {/* Right: status + cancel */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <Badge
                        className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 ${
                          STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUS_ICONS[booking.status]}
                        {isAr
                          ? translateStatus(booking.status)
                          : capitalise(booking.status)}
                      </Badge>

                      {booking.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-200 hover:bg-red-50 h-8 text-xs"
                          onClick={() =>
                            cancelMutation.mutate({ bookingId: booking.id })
                          }
                          disabled={cancelMutation.isPending}
                        >
                          {cancelMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isAr ? (
                            "إلغاء"
                          ) : (
                            "Cancel"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function translateStatus(status: string) {
  const map: Record<string, string> = {
    confirmed: "مؤكد",
    completed: "مكتمل",
    cancelled: "ملغى",
  };
  return map[status] ?? status;
}

function formatDate(dateStr: string, isAr: boolean): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(isAr ? "ar-SA" : "en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}
