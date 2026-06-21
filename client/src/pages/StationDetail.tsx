import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { Clock, Phone, MapPin, Star, ArrowLeft, Heart, Droplet, Zap, Thermometer, Loader2, CalendarDays, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function StationDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";

  // Booking dialog state
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const utils = trpc.useUtils();

  const { data: kiosk, isLoading, error } = trpc.kiosks.byId.useQuery(
    { id: id ?? "" },
    { enabled: !!id }
  );

  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  }, []);

  const { data: slotData, isLoading: slotsLoading } = trpc.bookings.availableSlots.useQuery(
    { kioskId: id ?? "", visitDate: selectedDate },
    { enabled: !!id && !!selectedDate && showBooking }
  );

  const bookMutation = trpc.bookings.book.useMutation({
    onSuccess: () => {
      setBookingSuccess(true);
      utils.bookings.myBookings.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleBook = () => {
    if (!id || !selectedDate || !selectedSlot) return;
    bookMutation.mutate({
      kioskId: id,
      visitDate: selectedDate,
      timeSlot: selectedSlot,
      notes: bookingNotes || undefined,
    });
  };

  const handleOpenBooking = () => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    setShowBooking(true);
    setBookingSuccess(false);
    setSelectedDate("");
    setSelectedSlot("");
    setBookingNotes("");
  };

  const handleCloseBooking = () => {
    setShowBooking(false);
    setBookingSuccess(false);
    setSelectedDate("");
    setSelectedSlot("");
    setBookingNotes("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !kiosk) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">{isAr ? "المحطة غير موجودة" : "Station Not Found"}</h1>
            <p className="text-gray-600 mb-4">{isAr ? "المحطة التي تبحث عنها غير موجودة." : "The station you are looking for does not exist."}</p>
            <Link href="/find-station">
              <Button className="bg-cyan-500 hover:bg-cyan-600">{isAr ? "العودة إلى المحطات" : "Back to Stations"}</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const services: string[] = kiosk.services ?? [];
  const hours: { day: string; open: string; close: string }[] = kiosk.hours ?? [];
  const ratingNum = kiosk.rating ? parseFloat(kiosk.rating) : 0;

  const serviceIcons = [Droplet, Zap, Heart, Thermometer];

  const lat = kiosk.latitude ? parseFloat(kiosk.latitude) : null;
  const lng = kiosk.longitude ? parseFloat(kiosk.longitude) : null;

  const handleGetDirections = () => {
    if (!lat || !lng) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(kiosk.name)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 pt-20">
        {/* Header */}
        <section className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-8">
          <div className="container">
            <Link href="/find-station">
              <Button variant="ghost" className="text-white hover:bg-white/20 mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {isAr ? "العودة إلى المحطات" : "Back to Stations"}
              </Button>
            </Link>
            <h1 className="text-4xl font-bold mb-2">{kiosk.name}</h1>
            <p className="text-cyan-50">{kiosk.location}</p>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-8">
                {/* Hero Image */}
                {kiosk.image && (
                  <Card className="overflow-hidden border-0 shadow-lg">
                    <img src={kiosk.image} alt={kiosk.name} className="w-full h-96 object-cover" />
                  </Card>
                )}

                {/* About */}
                <Card className="p-8 border-0 shadow-lg">
                  <h2 className="text-2xl font-bold mb-4">{isAr ? "عن هذه المحطة" : "About This Station"}</h2>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    {isAr
                      ? "محطة الفحص الصحي هذه مجهزة بأحدث الأجهزة الطبية لتقديم تقييمات صحية شاملة. طاقمنا المدرب متاح لمساعدتك في جميع احتياجات الفحص."
                      : "This health screening station is equipped with state-of-the-art medical devices to provide comprehensive health assessments. Our trained staff is available to assist you with all your screening needs."}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-cyan-50 rounded-lg">
                      <div className="text-3xl font-bold text-cyan-600 mb-1">{services.length}</div>
                      <div className="text-sm text-gray-600">{isAr ? "خدمة متاحة" : "Services Available"}</div>
                    </div>
                    <div className="p-4 bg-cyan-50 rounded-lg">
                      <div className="text-3xl font-bold text-cyan-600 mb-1">{kiosk.rating ?? "N/A"}</div>
                      <div className="text-sm text-gray-600">{isAr ? "تقييم العملاء" : "Customer Rating"}</div>
                    </div>
                  </div>
                </Card>

                {/* Services */}
                {services.length > 0 && (
                  <Card className="p-8 border-0 shadow-lg">
                    <h2 className="text-2xl font-bold mb-6">{isAr ? "الخدمات المتاحة" : "Available Services"}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {services.map((service: string, idx: number) => {
                        const Icon = serviceIcons[idx % serviceIcons.length];
                        return (
                          <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-cyan-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{service}</h3>
                              <p className="text-sm text-gray-600">{isAr ? "قياس احترافي" : "Professional measurement"}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Operating Hours */}
                {hours.length > 0 && (
                  <Card className="p-8 border-0 shadow-lg">
                    <h2 className="text-2xl font-bold mb-6">{isAr ? "ساعات العمل" : "Operating Hours"}</h2>
                    <div className="space-y-3">
                      {hours.map((hour: { day: string; open: string; close: string }, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">{hour.day}</span>
                          <span className="text-gray-600">
                            {hour.open} – {hour.close}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Contact Card */}
                <Card className="p-6 border-0 shadow-lg sticky top-24">
                  <h3 className="text-xl font-bold mb-6">{isAr ? "معلومات التواصل" : "Contact Information"}</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-cyan-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-600">{isAr ? "العنوان" : "Address"}</p>
                        <p className="font-medium text-gray-900">{kiosk.address}</p>
                      </div>
                    </div>

                    {kiosk.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-cyan-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-600">{isAr ? "الهاتف" : "Phone"}</p>
                          <a href={`tel:${kiosk.phone}`} className="font-medium text-cyan-600 hover:text-cyan-700">
                            {kiosk.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {kiosk.email && (
                      <div className="flex items-start gap-3">
                        <Heart className="w-5 h-5 text-cyan-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-600">{isAr ? "البريد الإلكتروني" : "Email"}</p>
                          <a
                            href={`mailto:${kiosk.email}`}
                            className="font-medium text-cyan-600 hover:text-cyan-700 break-all"
                          >
                            {kiosk.email}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <Button
                      className="w-full bg-cyan-500 hover:bg-cyan-600 text-white mb-3"
                      onClick={handleOpenBooking}
                    >
                      <CalendarDays className="w-4 h-4 mr-2" />
                      {isAr ? "احجز فحصاً" : "Book Screening"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleGetDirections}
                      disabled={!lat || !lng}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      {isAr ? "الحصول على الاتجاهات" : "Get Directions"}
                    </Button>
                  </div>
                </Card>

                {/* Rating */}
                {kiosk.rating && (
                  <Card className="p-6 border-0 shadow-lg">
                    <h3 className="text-lg font-bold mb-4">{isAr ? "تقييم العملاء" : "Customer Rating"}</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.floor(ratingNum) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-2xl font-bold text-gray-900">{kiosk.rating}</span>
                    </div>
                    <p className="text-sm text-gray-600">{isAr ? "بناءً على تقييمات العملاء" : "Based on customer reviews"}</p>
                  </Card>
                )}

                {/* Tips */}
                <Card className="p-6 border-0 shadow-lg bg-cyan-50">
                  <h3 className="font-bold text-gray-900 mb-3">{isAr ? "نصائح سريعة" : "Quick Tips"}</h3>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>✓ {isAr ? "الفحوصات مجانية تماماً" : "Screenings are completely free"}</li>
                    <li>✓ {isAr ? "احجز موعداً لتجنب الانتظار" : "Book a slot to avoid waiting"}</li>
                    <li>✓ {isAr ? "النتائج متاحة فوراً" : "Results available immediately"}</li>
                    <li>✓ {isAr ? "خصوصيتك محمية بالكامل" : "Privacy fully protected"}</li>
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-12 mt-12">
          <div className="container text-center">
            <h2 className="text-3xl font-bold mb-4">{isAr ? "هل أنت مستعد لفحصك الصحي؟" : "Ready for Your Health Screening?"}</h2>
            <p className="text-cyan-50 mb-6 max-w-2xl mx-auto">
              {isAr
                ? `زُر ${kiosk.name} اليوم مع Tech Care وابدأ خطوتك الأولى نحو صحة أفضل`
                : `Visit ${kiosk.name} today with Tech Care and take the first step towards better health`}
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-cyan-600 hover:bg-gray-100"
                onClick={handleOpenBooking}
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                {isAr ? "احجز موعداً" : "Book a Slot"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/20"
                onClick={handleGetDirections}
                disabled={!lat || !lng}
              >
                <MapPin className="w-4 h-4 mr-2" />
                {isAr ? "الحصول على الاتجاهات" : "Get Directions"}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* ── Booking Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showBooking} onOpenChange={(open) => !open && handleCloseBooking()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-cyan-500" />
              {isAr ? "احجز موعد فحص" : "Book a Screening Slot"}
            </DialogTitle>
          </DialogHeader>

          {bookingSuccess ? (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-bold text-gray-900">{isAr ? "تم تأكيد الحجز!" : "Booking Confirmed!"}</h3>
              <p className="text-gray-600">
                {isAr
                  ? <>تم حجز موعد فحصك في <span className="font-semibold">{kiosk.name}</span> بتاريخ <span className="font-semibold">{selectedDate}</span> الساعة <span className="font-semibold">{selectedSlot}</span>.</>
                  : <>Your screening slot at <span className="font-semibold">{kiosk.name}</span> has been booked for{" "}<span className="font-semibold">{selectedDate}</span> at{" "}<span className="font-semibold">{selectedSlot}</span>.</>}
              </p>
              <p className="text-sm text-gray-500">{isAr ? "يمكنك عرض حجوزاتك في ملفك الشخصي." : "You can view your bookings in your profile."}</p>
              <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={handleCloseBooking}>
                {isAr ? "تم" : "Done"}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-5 py-2">
                {/* Date picker */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{isAr ? "اختر التاريخ" : "Select Date"}</label>
                  <input
                    type="date"
                    min={today}
                    max={maxDate}
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedSlot("");
                    }}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{isAr ? "اختر الوقت" : "Select Time Slot"}</label>
                    {slotsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isAr ? "جارٍ تحميل المواعيد المتاحة..." : "Loading available slots…"}
                      </div>
                    ) : slotData?.closed ? (
                      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {isAr ? "المحطة مغلقة في اليوم المحدد." : "This station is closed on the selected day."}
                      </div>
                    ) : !slotData?.slots || slotData.slots.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {isAr ? "لا توجد مواعيد متاحة لهذا اليوم. يرجى تجربة يوم آخر." : "No available slots for this date. Please try another day."}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {slotData.slots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-2 py-2 text-xs font-medium rounded-md border transition-colors ${
                              selectedSlot === slot
                                ? "bg-cyan-500 text-white border-cyan-500"
                                : "bg-white text-gray-700 border-gray-200 hover:border-cyan-400 hover:text-cyan-600"
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Optional notes */}
                {selectedSlot && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}</label>
                    <textarea
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder={isAr ? "أي متطلبات أو ملاحظات خاصة..." : "Any special requirements or notes…"}
                      rows={2}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                    />
                  </div>
                )}

                {/* Summary */}
                {selectedDate && selectedSlot && (
                  <div className="bg-cyan-50 border border-cyan-200 rounded-md p-3 text-sm">
                    <p className="font-medium text-cyan-800">{isAr ? "ملخص الحجز" : "Booking Summary"}</p>
                    <p className="text-cyan-700 mt-1">
                      {kiosk.name} · {selectedDate} · {selectedSlot}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseBooking}>{isAr ? "إلغاء" : "Cancel"}</Button>
                <Button
                  className="bg-cyan-500 hover:bg-cyan-600"
                  onClick={handleBook}
                  disabled={!selectedDate || !selectedSlot || bookMutation.isPending}
                >
                  {bookMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isAr ? "تأكيد الحجز" : "Confirm Booking"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
