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
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { PlusCircle, Trash2, ClipboardList, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, className: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-100 text-red-700" },
};

export default function KioskRequests() {
  const { user, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const utils = trpc.useUtils();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  // Create request form state
  const [createForm, setCreateForm] = useState({
    name: "", location: "", address: "", phone: "", email: "", message: "",
  });

  // Delete request form state
  const [deleteForm, setDeleteForm] = useState({
    kioskId: "", kioskName: "", message: "",
  });

  const { data: myRequests, isLoading } = trpc.kioskRequests.myRequests.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: allKiosks } = trpc.kiosks.list.useQuery();

  const createMutation = trpc.kioskRequests.requestCreate.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم إرسال طلب الإنشاء بنجاح" : "Create request submitted successfully");
      utils.kioskRequests.myRequests.invalidate();
      setShowCreateForm(false);
      setCreateForm({ name: "", location: "", address: "", phone: "", email: "", message: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.kioskRequests.requestDelete.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم إرسال طلب الحذف بنجاح" : "Delete request submitted successfully");
      utils.kioskRequests.myRequests.invalidate();
      setShowDeleteForm(false);
      setDeleteForm({ kioskId: "", kioskName: "", message: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center pt-20">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
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
            <a href="/login">
              <Button>{isAr ? "تسجيل الدخول" : "Sign In"}</Button>
            </a>
          </div>
        </main>
      </div>
    );
  }

  const pendingCount = myRequests?.filter(r => r.status === "pending").length ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />

      <main className="flex-1 container max-w-3xl pt-24 pb-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-cyan-500" />
            {isAr ? "تسجيل كشكك" : "Register Your Kiosk"}
          </h1>
          <p className="text-gray-500 mt-1">
            {isAr
              ? "سجّل كشكك الصحي في منصة Tech Care أو اطلب إزالة كشك موجود. سيراجع المسؤول طلبك."
              : "Register your health kiosk with Tech Care or request removal of an existing one. An admin will review your submission."}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button onClick={() => setShowCreateForm(true)} className="bg-cyan-500 hover:bg-cyan-600">
            <PlusCircle className="w-4 h-4 mr-2" />
            {isAr ? "تسجيل كشك جديد" : "Register New Kiosk"}
          </Button>
          <Button variant="outline" onClick={() => setShowDeleteForm(true)} className="text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 className="w-4 h-4 mr-2" />
            {isAr ? "طلب إزالة كشك" : "Request Kiosk Removal"}
          </Button>
        </div>

        {/* Requests list */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            {isAr ? "كشكاتي" : "My Kiosks"}
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-yellow-100 text-yellow-700">{pendingCount} pending</Badge>
            )}
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
            </div>
          ) : !myRequests || myRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{isAr ? "لا توجد كشكات مسجلة بعد." : "No kiosks registered yet."}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => {
                const status = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG];
                const StatusIcon = status.icon;
                const payload = req.payload as Record<string, unknown>;
                return (
                  <Card key={req.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={req.type === "create" ? "text-green-700 border-green-200" : "text-red-700 border-red-200"}>
                              {req.type === "create" ? (isAr ? "إنشاء" : "Create") : (isAr ? "حذف" : "Delete")}
                            </Badge>
                            <Badge className={status.className}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="font-medium text-gray-900">
                            {req.type === "create"
                              ? String(payload.name ?? "New Kiosk")
                              : String(payload.kioskName ?? payload.kioskId ?? "Unknown Kiosk")}
                          </p>
                          {req.type === "create" && !!payload.location && (
                            <p className="text-sm text-gray-500">{String(payload.location)}</p>
                          )}
                          {req.message && (
                            <p className="text-sm text-gray-600 mt-1 italic">"{req.message}"</p>
                          )}
                          {req.adminNote && (
                            <p className="text-sm mt-2 p-2 bg-gray-50 rounded border-l-2 border-cyan-400">
                              <span className="font-medium text-gray-700">Admin note:</span> {req.adminNote}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* ── Create Request Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-cyan-500" />
              {isAr ? "تسجيل كشك جديد" : "Register New Kiosk"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{isAr ? "اسم الكشك" : "Kiosk Name"} *</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Al Hamra Mall Health Station"
              />
            </div>
            <div className="space-y-1">
              <Label>{isAr ? "المنطقة / الموقع" : "Area / Location"} *</Label>
              <Input
                value={createForm.location}
                onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                placeholder="e.g. Al Hamra Mall"
              />
            </div>
            <div className="space-y-1">
              <Label>{isAr ? "العنوان الكامل" : "Full Address"} *</Label>
              <Input
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                placeholder="e.g. King Fahd Road, Al Hamra Mall, Jeddah"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{isAr ? "الهاتف" : "Phone"}</Label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+966 12 xxx xxxx"
                />
              </div>
              <div className="space-y-1">
                <Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label>
                <Input
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="kiosk@example.com"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{isAr ? "رسالة إضافية (اختياري)" : "Additional Message (optional)"}</Label>
              <Textarea
                value={createForm.message}
                onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                placeholder={isAr ? "أي معلومات إضافية للمسؤول..." : "Any additional info for the admin..."}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              className="bg-cyan-500 hover:bg-cyan-600"
              onClick={() => createMutation.mutate({
                name: createForm.name,
                location: createForm.location,
                address: createForm.address,
                phone: createForm.phone || undefined,
                email: createForm.email || undefined,
                message: createForm.message || undefined,
              })}
              disabled={createMutation.isPending || !createForm.name || !createForm.location || !createForm.address}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isAr ? "إرسال" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Request Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showDeleteForm} onOpenChange={setShowDeleteForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {isAr ? "طلب إزالة كشك" : "Request Kiosk Removal"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{isAr ? "اختر الكشك" : "Select Kiosk"} *</Label>
              <select
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                value={deleteForm.kioskId}
                onChange={(e) => {
                  const selected = allKiosks?.find(k => k.id === e.target.value);
                  setDeleteForm({ ...deleteForm, kioskId: e.target.value, kioskName: selected?.name ?? "" });
                }}
              >
                <option value="">{isAr ? "-- اختر كشكاً --" : "-- Select a kiosk --"}</option>
                {allKiosks?.map(k => (
                  <option key={k.id} value={k.id}>{k.name} — {k.location}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>{isAr ? "سبب الطلب (اختياري)" : "Reason for Removal (optional)"}</Label>
              <Textarea
                value={deleteForm.message}
                onChange={(e) => setDeleteForm({ ...deleteForm, message: e.target.value })}
                placeholder={isAr ? "اشرح سبب طلب الحذف..." : "Explain why this kiosk should be removed..."}
                rows={3}
              />
            </div>
            <p className="text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded p-2">
              {isAr
                ? "ملاحظة: لن يتم حذف الكشك إلا بعد موافقة المسؤول."
                : "Note: The kiosk will only be removed after admin approval."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteForm(false)}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({
                kioskId: deleteForm.kioskId,
                kioskName: deleteForm.kioskName,
                message: deleteForm.message || undefined,
              })}
              disabled={deleteMutation.isPending || !deleteForm.kioskId}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isAr ? "إرسال الطلب" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
