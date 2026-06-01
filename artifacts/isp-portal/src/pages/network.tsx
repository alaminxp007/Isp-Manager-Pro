import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMikrotiks,
  useCreateMikrotik,
  useUpdateMikrotik,
  useDeleteMikrotik,
  getListMikrotiksQueryKey,
} from "@workspace/api-client-react";
import { Wifi, Plus, Pencil, Trash2, RefreshCw, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";

type MikrotikForm = {
  name: string;
  publicIp: string;
  login: string;
  password: string;
  autoMkSync: boolean;
  autoSync: boolean;
  activeGraph: boolean;
  webPort: string;
  note: string;
};

const emptyForm: MikrotikForm = {
  name: "",
  publicIp: "",
  login: "",
  password: "",
  autoMkSync: false,
  autoSync: false,
  activeGraph: false,
  webPort: "",
  note: "",
};

function generateOnlineChartData(total: number) {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now);
    hour.setHours(hour.getHours() - (23 - i));
    const variance = Math.floor(Math.random() * Math.max(1, total * 0.3));
    return {
      time: hour.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      online: Math.max(0, total - variance + Math.floor(Math.random() * variance * 0.5)),
    };
  });
}

export default function Network() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MikrotikForm>({ ...emptyForm });
  const [showPassword, setShowPassword] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const { data, isLoading } = useListMikrotiks();
  const mikrotiks = data?.mikrotiks ?? [];
  const stats = data?.stats ?? { totalClients: 0, activeClients: 0, inactiveClients: 0, onlineClients: 0 };

  const createMk = useCreateMikrotik();
  const updateMk = useUpdateMikrotik();
  const deleteMk = useDeleteMikrotik();

  const chartData = generateOnlineChartData(stats.totalClients);

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowPassword(false);
    setShowLogin(false);
    setIsModalOpen(true);
  }

  function openEdit(m: typeof mikrotiks[number]) {
    setEditingId(m.id);
    setForm({
      name: m.name,
      publicIp: m.publicIp,
      login: m.login,
      password: m.password,
      autoMkSync: m.autoMkSync,
      autoSync: m.autoSync,
      activeGraph: m.activeGraph,
      webPort: m.webPort ? String(m.webPort) : "",
      note: m.note ?? "",
    });
    setShowPassword(false);
    setShowLogin(false);
    setIsModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.publicIp.trim() || !form.login.trim() || !form.password.trim()) {
      toast({ title: "Error", description: "Name, Public IP, Login and Password are required", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name.trim(),
      publicIp: form.publicIp.trim(),
      login: form.login.trim(),
      password: form.password.trim(),
      autoMkSync: form.autoMkSync,
      autoSync: form.autoSync,
      activeGraph: form.activeGraph,
      webPort: form.webPort ? parseInt(form.webPort) : undefined,
      note: form.note.trim() || undefined,
    };
    try {
      if (editingId) {
        await updateMk.mutateAsync({ id: editingId, data: payload });
        toast({ title: "Updated", description: "MikroTik updated successfully" });
      } else {
        await createMk.mutateAsync({ data: payload });
        toast({ title: "Added", description: "MikroTik added successfully" });
      }
      queryClient.invalidateQueries({ queryKey: getListMikrotiksQueryKey() });
      setIsModalOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to save MikroTik", variant: "destructive" });
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Remove MikroTik "${name}"?`)) return;
    try {
      await deleteMk.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListMikrotiksQueryKey() });
      toast({ title: "Removed", description: `${name} has been removed` });
    } catch {
      toast({ title: "Error", description: "Failed to remove MikroTik", variant: "destructive" });
    }
  }

  async function handleToggleStatus(m: typeof mikrotiks[number]) {
    const nextStatus = m.status === "connected" ? "disconnected" : "connected";
    try {
      await updateMk.mutateAsync({ id: m.id, data: { ...m, webPort: m.webPort ?? undefined, note: m.note ?? undefined, status: nextStatus } });
      queryClient.invalidateQueries({ queryKey: getListMikrotiksQueryKey() });
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="w-5 h-5 text-sky-500" />
          <h1 className="text-lg font-bold text-slate-800">Network</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: getListMikrotiksQueryKey() })} className="h-8 text-xs gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5" /> Sync Log
          </Button>
          <Button size="sm" onClick={openAdd} className="h-8 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white">
            <Plus className="w-3.5 h-3.5" /> Add MikroTik
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Clients", value: stats.totalClients, color: "text-slate-700" },
          { label: "Active", value: stats.activeClients, color: "text-emerald-600" },
          { label: "Inactive", value: stats.inactiveClients, color: "text-red-500" },
          { label: "Online Now", value: stats.onlineClients, color: "text-sky-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-lg p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Network List */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Network List</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500 w-16">MK ID</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Name</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500 w-28">Status</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500 w-40">Details</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500 w-32">Sync Options</th>
                <th className="px-3 py-2.5 text-center font-semibold text-slate-500 w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-3 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : mikrotiks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-slate-400">
                    No MikroTik routers registered. Click "+ Add MikroTik" to add one.
                  </td>
                </tr>
              ) : (
                mikrotiks.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <div className="font-bold text-slate-800">{m.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{m.publicIp}</div>
                      {m.webPort && (
                        <div className="text-[10px] text-slate-400">Port: {m.webPort}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => handleToggleStatus(m)} className="focus:outline-none">
                        {m.status === "connected" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-semibold cursor-pointer hover:bg-emerald-200 transition-colors">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />CONNECTED
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-600 border-red-200 text-[10px] font-semibold cursor-pointer hover:bg-red-200 transition-colors">
                            <XCircle className="w-2.5 h-2.5 mr-1" />DISCONNECTED
                          </Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-slate-500">IP: <span className="font-mono text-slate-700">{m.publicIp}</span></div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-slate-500">Graph:</span>
                          <span className={m.activeGraph ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                            {m.activeGraph ? "ON" : "OFF"}
                          </span>
                        </div>
                        {m.note && <div className="text-[10px] text-slate-400 truncate max-w-[120px]" title={m.note}>{m.note}</div>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-slate-500">A.MK Sync:</span>
                          <span className={m.autoMkSync ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                            {m.autoMkSync ? "ON" : "OFF"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-slate-500">Auto Sync:</span>
                          <span className={m.autoSync ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                            {m.autoSync ? "ON" : "OFF"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(m)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-sky-50 hover:bg-sky-100 text-sky-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id, m.name)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Online Clients Chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-slate-600 mb-4 uppercase tracking-wide">Total Online Clients Count</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="onlineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff" }}
                labelStyle={{ color: "#475569", fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="online" stroke="#0ea5e9" strokeWidth={2} fill="url(#onlineGrad)" dot={false} name="Online" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-800 font-bold">
              {editingId ? "Edit Mikrotik" : "Add Mikrotik"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {/* Dark header band */}
            <div className="bg-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-md -mx-1">
              {editingId ? "Edit Mikrotik Information" : "Add New MikroTik"}
            </div>

            {/* Network Name */}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right font-semibold text-slate-700">Network Name*</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Mikrotik-1 or Mikrotik-2 etc"
                className="col-span-2 h-8 text-xs border-slate-300 focus-visible:ring-sky-500"
              />
            </div>

            {/* Public IP */}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right font-semibold text-slate-700">Public IP Address*</Label>
              <Input
                value={form.publicIp}
                onChange={(e) => setForm((f) => ({ ...f, publicIp: e.target.value }))}
                placeholder="Mikrotik Public IP"
                className="col-span-2 h-8 text-xs border-slate-300 focus-visible:ring-sky-500"
              />
            </div>

            {/* Login */}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right font-semibold text-slate-700">Mikrotik Login*</Label>
              <div className="col-span-2 flex items-center gap-1">
                <Input
                  type={showLogin ? "text" : "password"}
                  value={form.login}
                  onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
                  placeholder="Login Username"
                  className="h-8 text-xs border-slate-300 focus-visible:ring-sky-500"
                />
                <button onClick={() => setShowLogin((v) => !v)} className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 shrink-0">
                  {showLogin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right font-semibold text-slate-700">Mikrotik Password*</Label>
              <div className="col-span-2 flex items-center gap-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Login Password"
                  className="h-8 text-xs border-slate-300 focus-visible:ring-sky-500"
                />
                <button onClick={() => setShowPassword((v) => !v)} className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 shrink-0">
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Toggles */}
            {[
              { label: "Auto MK Sync?", field: "autoMkSync" as const },
              { label: "Auto Sync?", field: "autoSync" as const },
              { label: "Active Graph?", field: "activeGraph" as const },
            ].map(({ label, field }) => (
              <div key={field} className="grid grid-cols-3 items-center gap-3">
                <Label className="text-xs text-right text-slate-600">{label}</Label>
                <div className="col-span-2 flex items-center gap-4">
                  {["Yes", "No"].map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="radio"
                        checked={form[field] === (opt === "Yes")}
                        onChange={() => setForm((f) => ({ ...f, [field]: opt === "Yes" }))}
                        className="accent-sky-600"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Active Graph note */}
            {form.activeGraph && (
              <div className="grid grid-cols-3 items-center gap-3">
                <div />
                <p className="col-span-2 text-[10px] text-red-500 italic">If Yes, You Require Web Port</p>
              </div>
            )}

            {/* Web Port */}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right text-slate-600">Web Port No</Label>
              <Input
                value={form.webPort}
                onChange={(e) => setForm((f) => ({ ...f, webPort: e.target.value }))}
                placeholder="IP>Services>www"
                className="col-span-2 h-8 text-xs border-slate-300 focus-visible:ring-sky-500 max-w-[180px]"
              />
            </div>

            {/* Note */}
            <div className="grid grid-cols-3 items-start gap-3">
              <Label className="text-xs text-right text-slate-600 pt-1.5">Note</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Optional"
                rows={3}
                className="col-span-2 text-xs border-slate-300 focus-visible:ring-sky-500 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-100 pt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setForm({ ...emptyForm }); }}
              className="h-8 text-xs border-slate-200 text-slate-600"
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createMk.isPending || updateMk.isPending}
              className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white"
            >
              {createMk.isPending || updateMk.isPending ? "Saving..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
