import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMikrotiks,
  useCreateMikrotik,
  useUpdateMikrotik,
  useDeleteMikrotik,
  getListMikrotiksQueryKey,
} from "@workspace/api-client-react";
import {
  Wifi, Plus, Pencil, Trash2, Eye, EyeOff,
  RefreshCw, Settings, Users, Search, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

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

function OnOffBadge({ value, onLabel = "ON", offLabel = "OFF" }: { value: boolean; onLabel?: string; offLabel?: string }) {
  return value ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-white">
      {onLabel}
    </span>
  ) : (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500 text-white">
      {offLabel}
    </span>
  );
}

export default function Network() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MikrotikForm>({ ...emptyForm });
  const [showPassword, setShowPassword] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useListMikrotiks();
  const mikrotiks = (data?.mikrotiks ?? []).filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.publicIp.includes(search)
  );
  const stats = data?.stats ?? { totalClients: 0, activeClients: 0, inactiveClients: 0, onlineClients: 0 };

  const createMk = useCreateMikrotik();
  const updateMk = useUpdateMikrotik();
  const deleteMk = useDeleteMikrotik();

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
    try {
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="w-5 h-5 text-sky-500" />
          <h1 className="text-lg font-bold text-slate-800">Network</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => queryClient.invalidateQueries({ queryKey: getListMikrotiksQueryKey() })}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            SYNC LOG
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
            onClick={openAdd}
          >
            <Plus className="w-3.5 h-3.5" />
            ADD MIKROTIK
          </Button>
        </div>
      </div>

      {/* Network List Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {/* Table header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Network List:</span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search:"
              className="h-7 pl-8 pr-7 text-xs w-44 border-slate-200 bg-slate-50 focus-visible:ring-1 focus-visible:ring-sky-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="px-3 py-2.5 text-left font-medium w-24">Mikrotik Id</th>
                <th className="px-3 py-2.5 text-left font-medium">Name</th>
                <th className="px-3 py-2.5 text-center font-medium w-28">Status</th>
                {/* OWN | Reseller split header */}
                <th className="px-0 py-0 w-64">
                  <div className="flex">
                    <div className="flex-1 px-3 py-2.5 text-center font-medium border-r border-slate-600">OWN</div>
                    <div className="flex-1 px-3 py-2.5 text-center font-medium">Reseller</div>
                  </div>
                </th>
                <th className="px-3 py-2.5 text-left font-medium w-52">Details</th>
                <th className="px-3 py-2.5 text-center font-medium w-24">Users</th>
                <th className="px-3 py-2.5 text-center font-medium w-32">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-3 py-4"><Skeleton className="h-4 w-full rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : mikrotiks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Wifi className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No MikroTik routers registered</p>
                    <p className="text-xs mt-1">Click "+ ADD MIKROTIK" to add one</p>
                  </td>
                </tr>
              ) : (
                mikrotiks.map((m, idx) => {
                  const syncTime = (m as any).lastSyncAt
                    ? new Date((m as any).lastSyncAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                    : null;

                  return (
                    <tr key={m.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                      {/* MikroTik ID */}
                      <td className="px-3 py-3 text-slate-500 font-medium">{idx + 1}</td>

                      {/* Name column */}
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                        {(m as any).model && (
                          <div className="text-[10px] text-slate-500 mt-0.5">{(m as any).model}</div>
                        )}
                        {(m as any).macAddress && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{(m as any).macAddress}</div>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-white">
                            PK
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(m)}
                          className="focus:outline-none"
                          title="Click to toggle status"
                        >
                          {m.status === "connected" ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-500 text-white uppercase tracking-wide cursor-pointer hover:bg-emerald-600 transition-colors">
                              CONNECTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-red-500 text-white uppercase tracking-wide cursor-pointer hover:bg-red-600 transition-colors">
                              DISCONNECTED
                            </span>
                          )}
                        </button>
                      </td>

                      {/* OWN | Reseller */}
                      <td className="px-0 py-3">
                        <div className="flex divide-x divide-slate-200">
                          {/* OWN */}
                          <div className="flex-1 px-3">
                            <div className="space-y-0.5">
                              <div className="flex gap-1">
                                <span className="text-emerald-600 font-semibold">Active:</span>
                                <span className="font-bold text-slate-800">{stats.activeClients}</span>
                              </div>
                              <div className="flex gap-1">
                                <span className="text-red-500 font-semibold">Inactive:</span>
                                <span className="font-bold text-slate-800">{stats.inactiveClients}</span>
                              </div>
                              <div className="flex gap-1 border-t border-slate-100 pt-0.5 mt-0.5">
                                <span className="text-slate-500 font-semibold">Total:</span>
                                <span className="font-bold text-slate-700">{stats.totalClients}</span>
                              </div>
                            </div>
                          </div>
                          {/* Reseller */}
                          <div className="flex-1 px-3">
                            <div className="space-y-0.5">
                              <div className="flex gap-1">
                                <span className="text-emerald-600 font-semibold">Active:</span>
                                <span className="font-bold text-slate-800">0</span>
                              </div>
                              <div className="flex gap-1">
                                <span className="text-red-500 font-semibold">Inactive:</span>
                                <span className="font-bold text-slate-800">0</span>
                              </div>
                              <div className="flex gap-1 border-t border-slate-100 pt-0.5 mt-0.5">
                                <span className="text-slate-500 font-semibold">Total:</span>
                                <span className="font-bold text-slate-700">0</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* OWN total | Reseller total summary */}
                        <div className="flex px-3 mt-1.5 gap-1 text-[10px] font-bold">
                          <span className="text-slate-600">{stats.totalClients}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-600">0</span>
                        </div>
                      </td>

                      {/* Details */}
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-600">
                            <span className="font-medium">IP:</span>{" "}
                            <span className="font-mono text-slate-700">{m.publicIp}</span>
                            {m.login && (
                              <span className="text-slate-400">@{m.login}</span>
                            )}
                            {m.webPort && (
                              <span className="text-slate-400">:{m.webPort}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="text-slate-500 font-medium">Graph:</span>
                            <OnOffBadge value={m.activeGraph} />
                          </div>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="text-slate-500 font-medium">A.MK Sync:</span>
                            <OnOffBadge value={m.autoMkSync} />
                          </div>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="text-slate-500 font-medium">Auto Sync:</span>
                            <OnOffBadge value={m.autoSync} />
                          </div>
                          {syncTime && (
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              Sync at {syncTime}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Users */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            className="w-6 h-6 flex items-center justify-center rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-600 transition-colors"
                            title="View Users"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                          <button
                            className="w-6 h-6 flex items-center justify-center rounded bg-sky-100 hover:bg-sky-200 text-sky-600 transition-colors"
                            title="Upload"
                          >
                            <Users className="w-3 h-3" />
                          </button>
                          <button
                            className="w-6 h-6 flex items-center justify-center rounded bg-amber-100 hover:bg-amber-200 text-amber-600 transition-colors"
                            title="Star"
                          >
                            <Wifi className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(m)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-sky-100 hover:bg-sky-200 text-sky-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Settings"
                          >
                            <Settings className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id, m.name)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-red-100 hover:bg-red-200 text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button
                            className="w-6 h-6 flex items-center justify-center rounded bg-red-500 hover:bg-red-600 text-white transition-colors"
                            title="Add"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg p-0">
          <div className="bg-slate-700 px-5 py-3 rounded-t-lg">
            <DialogTitle className="text-sm font-semibold text-white">
              {editingId ? "Edit Mikrotik Information" : "Add New MikroTik"}
            </DialogTitle>
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Network Name */}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right font-semibold text-slate-700">Network Name <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Mikrotik-1 or Mikrotik-2 etc"
                className="col-span-2 h-8 text-xs border-slate-300 focus-visible:ring-sky-500"
              />
            </div>

            {/* Public IP */}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right font-semibold text-slate-700">Public IP Address <span className="text-red-500">*</span></Label>
              <Input
                value={form.publicIp}
                onChange={(e) => setForm((f) => ({ ...f, publicIp: e.target.value }))}
                placeholder="Mikrotik Public IP"
                className="col-span-2 h-8 text-xs border-slate-300 focus-visible:ring-sky-500"
              />
            </div>

            {/* Login */}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right font-semibold text-slate-700">Mikrotik Login <span className="text-red-500">*</span></Label>
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
              <Label className="text-xs text-right font-semibold text-slate-700">Mikrotik Password <span className="text-red-500">*</span></Label>
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
                  {(["Yes", "No"] as const).map((opt) => (
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
                placeholder="IP > Services > www"
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

          <DialogFooter className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setForm({ ...emptyForm })}
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
