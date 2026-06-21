import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Cpu, Loader2, ToggleLeft, ToggleRight } from "lucide-react";

interface DeviceForm {
  deviceId: string;
  label: string;
  kioskId: string;
}

const emptyForm: DeviceForm = { deviceId: "", label: "", kioskId: "" };

export function KioskDevicesTab() {
  const utils = trpc.useUtils();

  const { data: devices, isLoading } = trpc.kioskIntegration.listDevices.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DeviceForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const registerMutation = trpc.kioskIntegration.registerDevice.useMutation({
    onSuccess: () => {
      utils.kioskIntegration.listDevices.invalidate();
      toast.success("Device registered successfully");
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.kioskIntegration.updateDevice.useMutation({
    onSuccess: () => {
      utils.kioskIntegration.listDevices.invalidate();
      toast.success("Device updated");
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.kioskIntegration.deleteDevice.useMutation({
    onSuccess: () => {
      utils.kioskIntegration.listDevices.invalidate();
      toast.success("Device removed");
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(device: { id: number; deviceId: string; label: string | null; kioskId: string | null; isActive: string }) {
    setEditingId(device.id);
    setForm({
      deviceId: device.deviceId,
      label: device.label ?? "",
      kioskId: device.kioskId ?? "",
    });
    setShowForm(true);
  }

  function handleSubmit() {
    if (editingId !== null) {
      updateMutation.mutate({
        id: editingId,
        label: form.label || undefined,
        kioskId: form.kioskId || undefined,
      });
    } else {
      registerMutation.mutate({
        deviceId: form.deviceId,
        label: form.label || undefined,
        kioskId: form.kioskId || undefined,
      });
    }
  }

  function toggleActive(device: { id: number; isActive: string }) {
    updateMutation.mutate({
      id: device.id,
      isActive: device.isActive === "true" ? "false" : "true",
    });
  }

  const isBusy = registerMutation.isPending || updateMutation.isPending;

  return (
    <section className="py-8">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-600" />
            Kiosk Devices
          </h2>
          <Button
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
            onClick={openAdd}
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Device
          </Button>
        </div>

        {/* Info card */}
        <Card className="mb-6 border-cyan-100 bg-cyan-50">
          <CardContent className="py-4 text-sm text-cyan-800">
            <p className="font-medium mb-1">How kiosk integration works</p>
            <p>
              Register each TRIPLEBIGHT kiosk machine here using its hardware Device ID (found in the kiosk Settings menu).
              After a patient authenticates on the kiosk, the machine will POST health readings to{" "}
              <code className="bg-white px-1 py-0.5 rounded text-xs font-mono">/api/kiosk/data</code>{" "}
              and the data will appear automatically in their health dashboard.
            </p>
            <p className="mt-2">
              <span className="font-medium">Kiosk ID</span> (optional): link this device to an existing station in the system so readings are tagged with the correct location.
            </p>
          </CardContent>
        </Card>

        {/* Devices list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
          </div>
        ) : !devices || devices.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Cpu className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No devices registered yet</p>
            <p className="text-sm mt-1">Click "Register Device" to add your first kiosk machine.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <Card key={device.id} className={`border ${device.isActive === "true" ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 font-mono text-sm">{device.deviceId}</span>
                      {device.label && (
                        <span className="text-gray-600 text-sm">— {device.label}</span>
                      )}
                      <Badge
                        className={device.isActive === "true"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"}
                      >
                        {device.isActive === "true" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {device.kioskId && (
                      <p className="text-xs text-gray-400 mt-1">
                        Linked to station: <span className="font-mono">{device.kioskId}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Registered: {new Date(device.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-500 hover:text-cyan-600"
                      onClick={() => toggleActive(device)}
                      title={device.isActive === "true" ? "Deactivate" : "Activate"}
                    >
                      {device.isActive === "true"
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-500 hover:text-cyan-600"
                      onClick={() => openEdit(device)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-500 hover:text-red-500"
                      onClick={() => setDeleteId(device.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Register / Edit Dialog ── */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Edit Device" : "Register New Device"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Device ID *</Label>
              <Input
                className="mt-1"
                placeholder="e.g. 2CFDA15B9372"
                value={form.deviceId}
                onChange={(e) => setForm(f => ({ ...f, deviceId: e.target.value }))}
                disabled={editingId !== null}
              />
              <p className="text-xs text-gray-400 mt-1">
                Find this in the kiosk Settings → Device Info. It's the hardware MAC/serial ID.
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Label (optional)</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Red Sea Mall — Floor 1"
                value={form.label}
                onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Linked Station ID (optional)</Label>
              <Input
                className="mt-1"
                placeholder="e.g. kiosk_abc123"
                value={form.kioskId}
                onChange={(e) => setForm(f => ({ ...f, kioskId: e.target.value }))}
              />
              <p className="text-xs text-gray-400 mt-1">
                Links readings from this device to a station on the map.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}>
              Cancel
            </Button>
            <Button
              className="bg-cyan-500 hover:bg-cyan-600"
              onClick={handleSubmit}
              disabled={isBusy || (!editingId && !form.deviceId.trim())}
            >
              {isBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId !== null ? "Save Changes" : "Register Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unregister the device. The kiosk machine will no longer be able to submit health readings until re-registered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Remove Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
