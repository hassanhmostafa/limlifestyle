import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Clock, Stethoscope, Phone, Mail, Edit, Plus, Trash2, Building2, AlertCircle, CalendarDays, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { TimeSelect } from "@/components/TimeSelect";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

type HoursRow = { day: string; open: string; close: string };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function HoursEditor({
  value,
  onChange,
  isAr,
}: {
  value: HoursRow[];
  onChange: (v: HoursRow[]) => void;
  isAr: boolean;
}) {
  const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const addRow = () => onChange([...value, { day: "Monday", open: "9:00 AM", close: "5:00 PM" }]);
  const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof HoursRow, val: string) => {
    const updated = [...value];
    updated[i] = { ...updated[i], [field]: val };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Select value={row.day} onValueChange={(v) => updateRow(i, "day", v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((d, idx) => (
                <SelectItem key={d} value={d}>{isAr ? DAYS_AR[idx] : d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TimeSelect value={row.open} onChange={(v) => updateRow(i, "open", v)} />
          <span className="text-gray-400 text-sm">–</span>
          <TimeSelect value={row.close} onChange={(v) => updateRow(i, "close", v)} />
          <Button variant="ghost" size="icon" onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow} className="mt-1">
        <Plus className="w-4 h-4 mr-1" /> {isAr ? "إضافة وقت" : "Add Hours"}
      </Button>
    </div>
  );
}

function ServicesEditor({
  value,
  onChange,
  isAr,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  isAr: boolean;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  };
  const remove = (s: string) => onChange(value.filter((v) => v !== s));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={isAr ? "مثال: ضغط الدم" : "e.g. Blood Pressure"}
        />
        <Button type="button" variant="outline" onClick={add}><Plus className="w-4 h-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((s) => (
          <Badge key={s} variant="secondary" className="flex items-center gap-1 pr-1">
            {s}
            <button onClick={() => remove(s)} className="ml-1 hover:text-red-500">×</button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

type KioskRecord = {
  id: string;
  name: string;
  location: string;
  address: string;
  phone: string | null;
  email: string | null;
  isActive: "true" | "false";
  hours: HoursRow[] | null;
  services: string[] | null;
  ownerId: number | null;
};

type EditForm = {
  name: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  isActive: "true" | "false";
  hours: HoursRow[];
  services: string[];
};

export default function MyKiosks() {
  const { user, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const utils = trpc.useUtils();

  const [editingKiosk, setEditingKiosk] = useState<KioskRecord | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [viewingBookingsKiosk, setViewingBookingsKiosk] = useState<{ id: string; name: string } | null>(null);

  const { data: myKiosks, isLoading } = trpc.kioskOwner.myKiosks.useQuery(undefined, {
    enabled: isAuthenticated && (user?.role === "admin"),
  });

  const { data: kioskBookings, isLoading: bookingsLoading } = trpc.kioskOwner.getKioskBookings.useQuery(
    { kioskId: viewingBookingsKiosk?.id ?? "" },
    { enabled: !!viewingBookingsKiosk }
  );

  const updateBookingStatusMutation = trpc.kioskOwner.updateBookingStatus.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تحديث حالة الحجز" : "Booking status updated");
      utils.kioskOwner.getKioskBookings.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.kioskOwner.updateMyKiosk.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تحديث الكشك بنجاح" : "Kiosk updated successfully");
      utils.kioskOwner.myKiosks.invalidate();
      setEditingKiosk(null);
      setEditForm(null);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const openEdit = (kiosk: KioskRecord) => {
    setEditingKiosk(kiosk);
    setEditForm({
      name: kiosk.name,
      location: kiosk.location,
      address: kiosk.address,
      phone: kiosk.phone ?? "",
      email: kiosk.email ?? "",
      isActive: kiosk.isActive,
      hours: kiosk.hours ?? [],
      services: kiosk.services ?? [],
    });
  };

  const handleSave = () => {
    if (!editingKiosk || !editForm) return;
    updateMutation.mutate({
      kioskId: editingKiosk.id,
      data: {
        name: editForm.name,
        location: editForm.location,
        address: editForm.address,
        phone: editForm.phone || undefined,
        email: editForm.email || undefined,
        isActive: editForm.isActive,
        hours: editForm.hours,
        services: editForm.services,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center pt-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-semibold">{isAr ? "يرجى تسجيل الدخول" : "Please sign in"}</h2>
            <a href="/login" className="inline-block">
              <Button>{isAr ? "تسجيل الدخول" : "Sign In"}</Button>
            </a>
          </div>
        </main>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold">{isAr ? "غير مصرح" : "Access Denied"}</h2>
            <p className="text-gray-500">
              {isAr
                ? "هذه الصفحة متاحة لأصحاب الكشكات فقط."
                : "This page is only available to kiosk owners."}
            </p>
            <Link href="/">
              <Button variant="outline">{isAr ? "العودة للرئيسية" : "Back to Home"}</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />

      <main className="flex-1 container max-w-4xl pt-24 pb-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-cyan-500" />
            {isAr ? "كشكاتي" : "My Kiosks"}
          </h1>
          <p className="text-gray-500 mt-1">
            {isAr
              ? "إدارة وتحديث معلومات الكشكات التي تملكها"
              : "Manage and update information for the kiosks you own"}
          </p>
        </div>

        {/* Kiosk List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
          </div>
        ) : !myKiosks || myKiosks.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {isAr ? "لا توجد كشكات مرتبطة بحسابك بعد." : "No kiosks are assigned to your account yet."}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {isAr
                  ? "يمكن للمسؤول تعيين كشك لك من لوحة الإدارة."
                  : "An admin can assign a kiosk to you from the Admin panel."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {myKiosks.map((kiosk) => (
              <Card key={kiosk.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {kiosk.name}
                        <Badge
                          variant={kiosk.isActive === "true" ? "default" : "secondary"}
                          className={kiosk.isActive === "true" ? "bg-green-100 text-green-700" : ""}
                        >
                          {kiosk.isActive === "true"
                            ? (isAr ? "نشط" : "Active")
                            : (isAr ? "غير نشط" : "Inactive")}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {kiosk.location}
                      </p>
                    </div>
                    <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingBookingsKiosk({ id: kiosk.id, name: kiosk.name })}
                      className="flex items-center gap-1 text-cyan-600 border-cyan-200 hover:bg-cyan-50"
                    >
                      <CalendarDays className="w-4 h-4" />
                      {isAr ? "الحجوزات" : "Bookings"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(kiosk as KioskRecord)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      {isAr ? "تعديل" : "Edit"}
                    </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="text-sm text-gray-600 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    {kiosk.address}
                  </p>
                  {kiosk.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" /> {kiosk.phone}
                    </p>
                  )}
                  {kiosk.email && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" /> {kiosk.email}
                    </p>
                  )}
                  {kiosk.hours && kiosk.hours.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {kiosk.hours.map((h, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {h.day}: {h.open}–{h.close}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {kiosk.services && kiosk.services.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {kiosk.services.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Bookings Dialog */}
      <Dialog open={!!viewingBookingsKiosk} onOpenChange={(open) => !open && setViewingBookingsKiosk(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-cyan-500" />
              {isAr ? "حجوزات" : "Bookings"}: {viewingBookingsKiosk?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {bookingsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
              </div>
            ) : !kioskBookings || kioskBookings.length === 0 ? (
              <div className="text-center py-10">
                <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{isAr ? "لا توجد حجوزات بعد." : "No bookings yet."}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {kioskBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">
                        {booking.visitDate} · {booking.timeSlot}
                      </p>
                      {booking.notes && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">{booking.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Badge className={
                        booking.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                        booking.status === "completed" ? "bg-green-100 text-green-700" :
                        "bg-red-100 text-red-700"
                      }>
                        {isAr
                          ? (booking.status === "confirmed" ? "مؤكد" : booking.status === "completed" ? "مكتمل" : "ملغى")
                          : booking.status}
                      </Badge>
                      {booking.status === "confirmed" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 h-7 px-2"
                            onClick={() => updateBookingStatusMutation.mutate({
                              bookingId: booking.id,
                              kioskId: viewingBookingsKiosk!.id,
                              status: "completed",
                            })}
                            disabled={updateBookingStatusMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 h-7 px-2"
                            onClick={() => updateBookingStatusMutation.mutate({
                              bookingId: booking.id,
                              kioskId: viewingBookingsKiosk!.id,
                              status: "cancelled",
                            })}
                            disabled={updateBookingStatusMutation.isPending}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingBookingsKiosk(null)}>
              {isAr ? "إغلاق" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingKiosk && editForm && (
        <Dialog open onOpenChange={() => { setEditingKiosk(null); setEditForm(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isAr ? "تعديل الكشك" : "Edit Kiosk"}: {editingKiosk.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>{isAr ? "الاسم" : "Name"}</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{isAr ? "المنطقة" : "Location"}</Label>
                  <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>{isAr ? "العنوان" : "Address"}</Label>
                <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>{isAr ? "الهاتف" : "Phone"}</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label>
                  <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>{isAr ? "الحالة" : "Status"}</Label>
                <Select
                  value={editForm.isActive}
                  onValueChange={(v) => setEditForm({ ...editForm, isActive: v as "true" | "false" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{isAr ? "نشط" : "Active"}</SelectItem>
                    <SelectItem value="false">{isAr ? "غير نشط" : "Inactive"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>{isAr ? "ساعات العمل" : "Operating Hours"}</Label>
                <HoursEditor
                  value={editForm.hours}
                  onChange={(v) => setEditForm({ ...editForm, hours: v })}
                  isAr={isAr}
                />
              </div>

              <div className="space-y-1">
                <Label>{isAr ? "الخدمات المتاحة" : "Available Services"}</Label>
                <ServicesEditor
                  value={editForm.services}
                  onChange={(v) => setEditForm({ ...editForm, services: v })}
                  isAr={isAr}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingKiosk(null); setEditForm(null); }}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                {updateMutation.isPending
                  ? (isAr ? "جارٍ الحفظ..." : "Saving...")
                  : (isAr ? "حفظ التغييرات" : "Save Changes")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
