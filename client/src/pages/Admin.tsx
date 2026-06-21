import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Phone,
  Mail,
  Loader2,
  ShieldAlert,
  Clock,
  X,
  Stethoscope,
  UserCog,
  Users,
  Building2,
  ClipboardList,
  ShieldCheck,
  Cpu,
  FlaskConical,
} from "lucide-react";
import { TimeSelect } from "@/components/TimeSelect";
import { UserSearchCombobox } from "@/components/UserSearchCombobox";
import { Link } from "wouter";
import { KioskDevicesTab } from "@/components/KioskDevicesTab";
import { KioskTestTab } from "@/components/KioskTestTab";

interface HourEntry {
  day: string;
  open: string;
  close: string;
}

interface KioskFormData {
  name: string;
  location: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  image: string;
  rating: string;
  hours: HourEntry[];
  services: string[];
}

const DEFAULT_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const emptyForm: KioskFormData = {
  name: "",
  location: "",
  address: "",
  latitude: "",
  longitude: "",
  phone: "",
  email: "",
  image: "",
  rating: "",
  hours: [],
  services: [],
};

type Tab = "users" | "expert-requests" | "kiosk-devices" | "kiosk-test" | "admins";

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const utils = trpc.useUtils();

  const ADMIN_TAB_KEY = "admin_active_tab";

  // Tabs each adminType is allowed to see.
  const allowedTabs = (adminType: string | null | undefined): Tab[] => {
    if (adminType === "expert") return ["expert-requests"];
    if (adminType === "kiosk") return ["kiosk-devices", "kiosk-test"];
    return ["users", "expert-requests", "kiosk-devices", "kiosk-test", "admins"]; // super
  };

  // Restore the last visited tab from sessionStorage.
  // If the saved tab is not allowed for this user's adminType, fall back to
  // the first allowed tab (evaluated after auth resolves).
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = sessionStorage.getItem(ADMIN_TAB_KEY) as Tab | null;
    return saved ?? "expert-requests"; // placeholder until auth resolves
  });

  // Once auth resolves, validate the saved tab against the user's allowed tabs.
  // This handles cross-account scenarios (e.g. super admin logs out, expert logs in).
  useEffect(() => {
    if (loading || !user) return;
    const allowed = allowedTabs(user.adminType);
    if (!allowed.includes(activeTab)) {
      const fallback = allowed[0];
      setActiveTab(fallback);
      sessionStorage.setItem(ADMIN_TAB_KEY, fallback);
    }
  }, [user, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist tab changes to sessionStorage so refresh restores the last tab.
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    sessionStorage.setItem(ADMIN_TAB_KEY, tab);
  };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<KioskFormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [serviceInput, setServiceInput] = useState("");

  // Owner assignment dialog state
  const [assigningKiosk, setAssigningKiosk] = useState<{ id: string; name: string; ownerId: number | null } | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<{ id: number; name: string | null; email: string | null; role: "user" | "expert" | "admin" } | null>(null);

  const { data: kiosks, isLoading } = trpc.admin.listKiosks.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: allUsers, isLoading: usersLoading } = trpc.admin.listUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });


  const { data: expertRequests, isLoading: expertRequestsLoading } = trpc.expertRequests.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const pendingExpertCount = expertRequests?.filter(r => r.status === "pending").length ?? 0;

  const promoteToAdminMutation = trpc.admin.promoteToAdmin.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      toast.success("User promoted to admin");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateAdminTypeMutation = trpc.admin.updateAdminType.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      toast.success("Admin type updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [selectedAdminType, setSelectedAdminType] = useState<"kiosk" | "expert" | "super">("kiosk");


  const approveExpertMutation = trpc.expertRequests.approve.useMutation({
    onSuccess: () => {
      utils.expertRequests.list.invalidate();
      utils.admin.listUsers.invalidate();
      toast.success("Expert request approved — user promoted to expert");
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectExpertMutation = trpc.expertRequests.reject.useMutation({
    onSuccess: () => {
      utils.expertRequests.list.invalidate();
      toast.success("Expert request rejected");
    },
    onError: (e) => toast.error(e.message),
  });


  const createMutation = trpc.admin.createKiosk.useMutation({
    onSuccess: () => {
      utils.admin.listKiosks.invalidate();
      utils.kiosks.list.invalidate();
      setShowForm(false);
      setFormData(emptyForm);
      setServiceInput("");
      toast.success("Kiosk created successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.admin.updateKiosk.useMutation({
    onSuccess: () => {
      utils.admin.listKiosks.invalidate();
      utils.kiosks.list.invalidate();
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
      setServiceInput("");
      toast.success("Kiosk updated successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = trpc.admin.toggleKiosk.useMutation({
    onSuccess: () => {
      utils.admin.listKiosks.invalidate();
      utils.kiosks.list.invalidate();
      toast.success("Kiosk status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.admin.deleteKiosk.useMutation({
    onSuccess: () => {
      utils.admin.listKiosks.invalidate();
      utils.kiosks.list.invalidate();
      setDeleteId(null);
      toast.success("Kiosk deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const assignOwnerMutation = trpc.admin.assignKioskOwner.useMutation({
    onSuccess: () => {
      utils.admin.listKiosks.invalidate();
      utils.admin.listUsers.invalidate();
      setAssigningKiosk(null);
      toast.success("Owner assigned successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateUserRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      toast.success("User role updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleEdit = (kiosk: any) => {
    setEditingId(kiosk.id);
    setFormData({
      name: kiosk.name,
      location: kiosk.location,
      address: kiosk.address,
      latitude: kiosk.latitude,
      longitude: kiosk.longitude,
      phone: kiosk.phone ?? "",
      email: kiosk.email ?? "",
      image: kiosk.image ?? "",
      rating: kiosk.rating ?? "",
      hours: Array.isArray(kiosk.hours) ? kiosk.hours : [],
      services: Array.isArray(kiosk.services) ? kiosk.services : [],
    });
    setServiceInput("");
    setShowForm(true);
  };

  const handleSubmit = () => {
    const payload = {
      name: formData.name,
      location: formData.location,
      address: formData.address,
      latitude: formData.latitude,
      longitude: formData.longitude,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      image: formData.image || undefined,
      rating: formData.rating || undefined,
      hours: formData.hours.length > 0 ? formData.hours : undefined,
      services: formData.services.length > 0 ? formData.services : undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setServiceInput("");
  };

  const openAssignOwner = (kiosk: any) => {
    setAssigningKiosk({ id: kiosk.id, name: kiosk.name, ownerId: kiosk.ownerId });
    // Pre-fill current owner if one exists
    if (kiosk.ownerId && allUsers) {
      const existing = allUsers.find((u: any) => u.id === kiosk.ownerId);
      setSelectedOwner(existing ?? null);
    } else {
      setSelectedOwner(null);
    }
  };

  const handleAssignOwner = () => {
    if (!assigningKiosk) return;
    assignOwnerMutation.mutate({ kioskId: assigningKiosk.id, ownerId: selectedOwner?.id ?? null });
  };

  // ── Hours helpers ────────────────────────────────────────────────────────────
  const addHourRow = () => {
    const usedDays = formData.hours.map((h) => h.day);
    const nextDay = DEFAULT_DAYS.find((d) => !usedDays.includes(d)) ?? "Sunday";
    setFormData((p) => ({
      ...p,
      hours: [...p.hours, { day: nextDay, open: "9:00 AM", close: "9:00 PM" }],
    }));
  };

  const updateHourRow = (idx: number, field: keyof HourEntry, value: string) => {
    setFormData((p) => {
      const updated = [...p.hours];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...p, hours: updated };
    });
  };

  const removeHourRow = (idx: number) => {
    setFormData((p) => ({ ...p, hours: p.hours.filter((_, i) => i !== idx) }));
  };

  // ── Services helpers ─────────────────────────────────────────────────────────
  const addService = () => {
    const trimmed = serviceInput.trim();
    if (!trimmed) return;
    if (formData.services.includes(trimmed)) {
      toast.error("Service already added");
      return;
    }
    setFormData((p) => ({ ...p, services: [...p.services, trimmed] }));
    setServiceInput("");
  };

  const removeService = (idx: number) => {
    setFormData((p) => ({ ...p, services: p.services.filter((_, i) => i !== idx) }));
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  // Helper: get owner name for a kiosk
  const getOwnerName = (ownerId: number | null) => {
    if (!ownerId || !allUsers) return null;
    const u = allUsers.find((u) => u.id === ownerId);
    return u ? (u.name || u.email || `User #${u.id}`) : `User #${ownerId}`;
  };

  // ── Auth guard ───────────────────────────────────────────────────────────────
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

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center max-w-md px-4">
            <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-6">This page is restricted to administrators only.</p>
            <Link href="/">
              <Button className="bg-cyan-500 hover:bg-cyan-600">Go Home</Button>
            </Link>
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
        <section className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-10">
          <div className="container flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">Admin Panel</h1>
              <p className="text-slate-300">Manage Tech Care kiosk locations and users</p>
            </div>

          </div>
        </section>

        {/* Tab Navigation */}
        <section className="bg-white border-b border-gray-200">
          <div className="container flex gap-0">

            {/* Users tab — super admin only */}
            {user?.adminType === "super" && (
              <button
                onClick={() => handleTabChange("users")}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "users"
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Users className="w-4 h-4" />
                Users ({allUsers?.length ?? 0})
              </button>
            )}

            {/* Expert Requests tab — expert + super admins */}
            {(user?.adminType === "expert" || user?.adminType === "super") && (
              <button
                onClick={() => handleTabChange("expert-requests")}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "expert-requests"
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                Expert Requests
                {pendingExpertCount > 0 && (
                  <span className="ml-1 bg-teal-400 text-teal-900 text-xs font-bold rounded-full px-1.5 py-0.5">
                    {pendingExpertCount}
                  </span>
                )}
              </button>
            )}

            {/* Kiosk Devices tab — kiosk + super admins */}
            {(user?.adminType === "kiosk" || user?.adminType === "super") && (
              <button
                onClick={() => handleTabChange("kiosk-devices")}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "kiosk-devices"
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Cpu className="w-4 h-4" />
                Kiosk Devices
              </button>
            )}

            {/* Kiosk Test tab — kiosk + super admins */}
            {(user?.adminType === "kiosk" || user?.adminType === "super") && (
              <button
                onClick={() => handleTabChange("kiosk-test")}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "kiosk-test"
                    ? "border-amber-500 text-amber-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                Kiosk Test
              </button>
            )}

            {/* Admins tab — super admin only */}
            {user?.adminType === "super" && (
              <button
                onClick={() => handleTabChange("admins")}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "admins"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Admins
              </button>
            )}
          </div>
        </section>







        {/* ── Users Tab ── */}
        {activeTab === "users" && (
          <section className="py-8">
            <div className="container">
              {usersLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {allUsers?.map((u) => (
                    <Card key={u.id} className="p-4 border-0 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{u.name || "(No name)"}</p>
                          <p className="text-sm text-gray-500">{u.email || "(No email)"}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge
                            variant="outline"
                            className={
                              u.role === "admin"
                                ? "border-red-200 text-red-600 bg-red-50"
                                : u.role === "expert"
                                ? "border-teal-200 text-teal-600 bg-teal-50"
                                : "border-gray-200 text-gray-600"
                            }
                          >
                            {u.role}
                          </Badge>
                          <Select
                            value={u.role}
                            onValueChange={(role) =>
                              updateUserRoleMutation.mutate({
                                userId: u.id,
                                role: role as "user" | "expert" | "admin",
                              })
                            }
                            disabled={updateUserRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">user</SelectItem>
                              <SelectItem value="expert">expert</SelectItem>
                              <SelectItem value="admin">admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Expert Requests Tab ── */}
        {activeTab === "expert-requests" && (
          <section className="py-8">
            <div className="container max-w-4xl space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Expert Registration Requests
                {pendingExpertCount > 0 && (
                  <Badge className="ml-2 bg-teal-100 text-teal-700">{pendingExpertCount} pending</Badge>
                )}
              </h2>
              {expertRequestsLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
              ) : !expertRequests || expertRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Stethoscope className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No expert registration requests yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {expertRequests.map((req) => {
                    const isPending = req.status === "pending";
                    return (
                      <Card key={req.id} className={isPending ? "border-teal-200" : ""}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={
                                  req.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                                  req.status === "approved" ? "bg-green-100 text-green-700" :
                                  "bg-red-100 text-red-700"
                                }>
                                  {isAr
                                    ? (req.status === "pending" ? "معلق" : req.status === "approved" ? "موافق" : "مرفوض")
                                    : req.status}
                                </Badge>
                                <span className="text-xs text-gray-400">
                                  {new Date(req.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="font-semibold text-gray-900">{req.userName || "Unknown User"}</p>
                              <p className="text-sm text-gray-500">{req.userEmail}</p>
                              <p className="text-sm font-medium text-teal-700 mt-1">{req.specialty}</p>
                              <p className="text-sm text-gray-600 mt-0.5">{req.credentials}</p>
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{req.bio}</p>
                              {req.adminNote && (
                                <p className="text-sm mt-2 p-2 bg-gray-50 rounded border-l-2 border-teal-400">
                                  <span className="font-medium">Admin note:</span> {req.adminNote}
                                </p>
                              )}
                            </div>
                            {isPending && (
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                  onClick={() => approveExpertMutation.mutate({ requestId: req.id })}
                                  disabled={approveExpertMutation.isPending || rejectExpertMutation.isPending}
                                >
                                  {approveExpertMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Approve"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectExpertMutation.mutate({ requestId: req.id })}
                                  disabled={approveExpertMutation.isPending || rejectExpertMutation.isPending}
                                >
                                  {rejectExpertMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reject"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
        {/* ── Kiosk Devices Tab ── */}
        {activeTab === "kiosk-devices" && <KioskDevicesTab />}

        {/* ── Kiosk Test Tab ── */}
        {activeTab === "kiosk-test" && <KioskTestTab />}

         {/* ── Admins Tab ── */}
        {activeTab === "admins" && (
          <section className="py-8">
            <div className="container max-w-3xl">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                Admin Management
              </h2>
              <Card className="mb-6">
                <CardContent className="pt-5 pb-5">
                  <p className="text-sm text-gray-600 mb-4">
                    Search for a user and promote them to a specific admin role. Kiosk admins manage kiosk requests; Expert admins manage expert registrations; Super admins have full access.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500 mb-1 block">Search user</Label>
                      <UserSearchCombobox
                        value={null}
                        onChange={(u) => {
                          if (u) {
                            promoteToAdminMutation.mutate({ userId: u.id, adminType: selectedAdminType });
                          }
                        }}
                        placeholder="Search by name or email…"
                      />
                    </div>
                    <div className="shrink-0">
                      <Label className="text-xs text-gray-500 mb-1 block">Admin type</Label>
                      <Select
                        value={selectedAdminType}
                        onValueChange={(v) => setSelectedAdminType(v as "kiosk" | "expert" | "super")}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kiosk">Kiosk Admin</SelectItem>
                          <SelectItem value="expert">Expert Admin</SelectItem>
                          <SelectItem value="super">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Selecting a user from the search will immediately promote them. This action can be reversed by changing their role in the Users tab.</p>
                </CardContent>
              </Card>

              {/* Current admins list */}
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Current Admins</h3>
              {usersLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-cyan-500 animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  {allUsers?.filter(u => u.role === "admin").map(u => (
                    <Card key={u.id} className="border-purple-100">
                      <CardContent className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{u.name || "Unknown"}</p>
                          <p className="text-sm text-gray-500">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            u.adminType === "super" ? "bg-purple-100 text-purple-700 border-purple-200" :
                            u.adminType === "expert" ? "bg-teal-100 text-teal-700 border-teal-200" :
                            u.adminType === "kiosk" ? "bg-cyan-100 text-cyan-700 border-cyan-200" :
                            "bg-gray-100 text-gray-500 border-gray-200"
                          }>
                            {u.adminType ?? "no type"}
                          </Badge>
                          <Select
                            value={u.adminType ?? ""}
                            onValueChange={(v) =>
                              updateAdminTypeMutation.mutate({ userId: u.id, adminType: v as "kiosk" | "expert" | "super" })
                            }
                            disabled={updateAdminTypeMutation.isPending}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue placeholder="Set type…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kiosk">Kiosk Admin</SelectItem>
                              <SelectItem value="expert">Expert Admin</SelectItem>
                              <SelectItem value="super">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {allUsers?.filter(u => u.role === "admin").length === 0 && (
                    <p className="text-sm text-gray-400 italic">No admins yet.</p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
      {/* ── Assign Owner Dialogg ──────────────────────────────────────────────── */}
      <Dialog open={!!assigningKiosk} onOpenChange={(open) => !open && setAssigningKiosk(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-cyan-500" />
              Assign Kiosk Owner
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-600">
              Kiosk: <span className="font-semibold">{assigningKiosk?.name}</span>
            </p>
            <div className="space-y-2">
              <Label>Select Owner</Label>
              <UserSearchCombobox
                value={selectedOwner}
                onChange={setSelectedOwner}
                placeholder="Search by name or email…"
              />
              {selectedOwner === null && assigningKiosk?.ownerId && (
                <p className="text-xs text-amber-600">
                  Saving with no owner selected will unassign the current owner.
                </p>
              )}
              <p className="text-xs text-gray-400">
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningKiosk(null)}>Cancel</Button>
            <Button
              className="bg-cyan-500 hover:bg-cyan-600"
              onClick={handleAssignOwner}
              disabled={assignOwnerMutation.isPending}
            >
              {assignOwnerMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign Owner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Kiosk" : "Add New Kiosk"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* ── Basic Info ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  { key: "name", label: "Station Name *", placeholder: "Red Sea Mall Health Station", full: true },
                  { key: "location", label: "Location / Area *", placeholder: "Red Sea Mall", full: false },
                  { key: "address", label: "Full Address *", placeholder: "King Abdulaziz Road, Jeddah", full: true },
                  { key: "latitude", label: "Latitude *", placeholder: "21.5433", full: false },
                  { key: "longitude", label: "Longitude *", placeholder: "39.1726", full: false },
                  { key: "phone", label: "Phone", placeholder: "+966 12 645 8888", full: false },
                  { key: "email", label: "Email", placeholder: "station@techcare.com", full: false },
                  { key: "image", label: "Image URL", placeholder: "https://...", full: true },
                  { key: "rating", label: "Rating (0–5)", placeholder: "4.8", full: false },
                ] as { key: keyof KioskFormData; label: string; placeholder: string; full: boolean }[]
              ).map(({ key, label, placeholder, full }) => (
                key === "hours" || key === "services" ? null : (
                  <div key={key} className={full ? "sm:col-span-2" : ""}>
                    <Label htmlFor={key} className="text-sm font-medium">{label}</Label>
                    <Input
                      id={key}
                      value={formData[key] as string}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="mt-1"
                    />
                  </div>
                )
              ))}
            </div>

            {/* ── Operating Hours ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-600" />
                  Operating Hours
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addHourRow}
                  disabled={formData.hours.length >= 7}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Day
                </Button>
              </div>

              {formData.hours.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-2">No hours added yet. Click "Add Day" to start.</p>
              ) : (
                <div className="space-y-2">
                  {formData.hours.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={row.day}
                        onChange={(e) => updateHourRow(idx, "day", e.target.value)}
                        className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      >
                        {DEFAULT_DAYS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <TimeSelect value={row.open} onChange={(v) => updateHourRow(idx, "open", v)} />
                      <span className="text-gray-400 text-sm">–</span>
                      <TimeSelect value={row.close} onChange={(v) => updateHourRow(idx, "close", v)} />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-600 px-1.5"
                        onClick={() => removeHourRow(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Services ── */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <Stethoscope className="w-4 h-4 text-cyan-600" />
                Available Services
              </Label>

              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="e.g. Blood Pressure, BMI, Heart Rate..."
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addService} disabled={!serviceInput.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {formData.services.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No services added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.services.map((svc, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1 bg-cyan-50 text-cyan-700 text-sm px-3 py-1 rounded-full"
                    >
                      {svc}
                      <button
                        type="button"
                        onClick={() => removeService(idx)}
                        className="ml-1 text-cyan-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>Cancel</Button>
            <Button
              className="bg-cyan-500 hover:bg-cyan-600"
              onClick={handleSubmit}
              disabled={isBusy || !formData.name || !formData.address || !formData.latitude || !formData.longitude}
            >
              {isBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Save Changes" : "Create Kiosk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Kiosk?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. The kiosk will be removed from the map
              and all station pages. Consider deactivating it instead if you may need it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
