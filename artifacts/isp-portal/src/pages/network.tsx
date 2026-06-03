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
  CheckCircle2, ArrowUpFromLine, Loader2, Lock,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

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

type MkRow = {
  id: number; name: string; publicIp: string; login: string; password: string;
  autoMkSync: boolean; autoSync: boolean; activeGraph: boolean;
  webPort: number | null; note: string | null; status: string;
  model?: string | null; macAddress?: string | null; boardName?: string | null;
  lastSyncAt?: string | null;
};

type MikrotikForm = {
  name: string; publicIp: string; login: string; password: string;
  autoMkSync: boolean; autoSync: boolean; activeGraph: boolean;
  webPort: string; note: string;
};

const emptyForm: MikrotikForm = {
  name: "", publicIp: "", login: "", password: "",
  autoMkSync: false, autoSync: false, activeGraph: false, webPort: "", note: "",
};

function OnOffBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-white">ON</span>
  ) : (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500 text-white">OFF</span>
  );
}

type ActiveConn = {
  id: string; name: string; service: string; callerIp: string;
  address: string; uptime: string; txByte: string; rxByte: string;
};

function ActiveConnectionsModal({
  mk, open, onClose, token,
}: { mk: MkRow | null; open: boolean; onClose: () => void; token: string }) {
  const { toast } = useToast();
  const [conns, setConns] = useState<ActiveConn[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  async function load() {
    if (!mk) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/mikrotiks/${mk.id}/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" })) as { error?: string };
        throw new Error(err.error ?? "Failed to fetch");
      }
      const data = await res.json() as { connections: ActiveConn[] };
      setConns(data.connections ?? []);
      setLoaded(true);
    } catch (err) {
      toast({
        title: "Connection Error",
        description: err instanceof Error ? err.message : "Failed to fetch active connections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect(conn: ActiveConn) {
    if (!mk) return;
    setDisconnecting(conn.id);
    try {
      const res = await fetch(`/api/mikrotiks/${mk.id}/disconnect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: conn.id, username: conn.name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Disconnect failed" })) as { error?: string };
        throw new Error(err.error ?? "Disconnect failed");
      }
      setConns((prev) => prev.filter((c) => c.id !== conn.id));
      toast({ title: "Disconnected", description: `${conn.name} has been disconnected` });
    } catch (err) {
      toast({
        title: "Disconnect Error",
        description: err instanceof Error ? err.message : "Failed to disconnect",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(null);
    }
  }

  function handleOpen(o: boolean) {
    if (o && !loaded) load();
    if (!o) { onClose(); setLoaded(false); setSearch(""); setConns([]); }
  }

  const filtered = conns.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.address.includes(search) ||
    c.callerIp.includes(search)
  );

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="bg-white max-w-5xl p-0 max-h-[90vh] flex flex-col">
        <div className="bg-slate-700 px-5 py-3 rounded-t-lg flex items-center justify-between">
          <DialogTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Network Active Connections — {mk?.name}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLoaded(false); load(); }}
              className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-600 transition-colors"
              title="Refresh"
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Active Sessions: <span className="text-emerald-600">{filtered.length}</span>
            {conns.length !== filtered.length && <span className="text-slate-400"> (filtered from {conns.length})</span>}
          </span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / IP / MAC..."
              className="h-7 pl-8 text-xs w-52 border-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0">
              <tr className="bg-slate-700 text-white">
                <th className="px-3 py-2.5 text-left font-medium w-8">#</th>
                <th className="px-3 py-2.5 text-left font-medium">Username</th>
                <th className="px-3 py-2.5 text-left font-medium">IP Address</th>
                <th className="px-3 py-2.5 text-left font-medium">Caller ID / MAC</th>
                <th className="px-3 py-2.5 text-left font-medium">Uptime</th>
                <th className="px-3 py-2.5 text-left font-medium">TX</th>
                <th className="px-3 py-2.5 text-left font-medium">RX</th>
                <th className="px-3 py-2.5 text-left font-medium">Service</th>
                <th className="px-3 py-2.5 text-center font-medium w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-3 py-2.5"><Skeleton className="h-3.5 w-full rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    <Wifi className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">
                      {loaded ? "No active PPP sessions found" : "Loading..."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => (
                  <tr key={c.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{c.name}</td>
                    <td className="px-3 py-2 font-mono text-sky-600">{c.address || "—"}</td>
                    <td className="px-3 py-2 font-mono text-slate-500 text-[10px]">{c.callerIp || "—"}</td>
                    <td className="px-3 py-2 text-emerald-600 font-medium">{c.uptime || "—"}</td>
                    <td className="px-3 py-2 text-slate-700">{c.txByte}</td>
                    <td className="px-3 py-2 text-slate-700">{c.rxByte}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-700 uppercase">
                        {c.service}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleDisconnect(c)}
                        disabled={disconnecting === c.id}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 hover:bg-red-200 text-red-600 transition-colors disabled:opacity-50 flex items-center gap-1 mx-auto"
                      >
                        {disconnecting === c.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : null}
                        Disconnect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            {loaded
              ? `${conns.length} active session${conns.length !== 1 ? "s" : ""} on ${mk?.name}`
              : "Fetching from MikroTik…"}
          </span>
          <Button size="sm" variant="outline" onClick={onClose} className="h-7 text-xs">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type PppSecret = {
  id: string; name: string; service: string; profile: string;
  remoteAddress: string; comment: string; disabled: boolean;
};

function PppSecretsModal({
  mk, open, onClose, token,
}: { mk: MkRow | null; open: boolean; onClose: () => void; token: string }) {
  const { toast } = useToast();
  const [secrets, setSecrets] = useState<PppSecret[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (!mk) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/mikrotiks/${mk.id}/ppp-secrets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" })) as { error?: string };
        throw new Error(err.error ?? "Failed to fetch");
      }
      const data = await res.json() as { secrets: PppSecret[] };
      setSecrets(data.secrets ?? []);
      setLoaded(true);
    } catch (err) {
      toast({
        title: "Fetch Error",
        description: err instanceof Error ? err.message : "Failed to fetch PPP secrets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleOpen(o: boolean) {
    if (o && !loaded) load();
    if (!o) { onClose(); setLoaded(false); setSearch(""); setSecrets([]); }
  }

  const filtered = secrets.filter((s) =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.profile.toLowerCase().includes(search.toLowerCase()) ||
    s.comment.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="bg-white max-w-4xl p-0 max-h-[90vh] flex flex-col">
        <div className="bg-slate-700 px-5 py-3 rounded-t-lg flex items-center justify-between">
          <DialogTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Lock className="w-4 h-4" />
            PPP Secrets — {mk?.name}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLoaded(false); load(); }}
              className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-600 transition-colors"
              title="Refresh"
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Total: <span className="text-sky-600">{loaded ? secrets.length : "—"}</span>
            {secrets.length !== filtered.length && <span className="text-slate-400"> (filtered: {filtered.length})</span>}
          </span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username / profile..."
              className="h-7 pl-8 text-xs w-52 border-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0">
              <tr className="bg-slate-700 text-white">
                <th className="px-3 py-2.5 text-left font-medium w-8">#</th>
                <th className="px-3 py-2.5 text-left font-medium">Username</th>
                <th className="px-3 py-2.5 text-left font-medium">Service</th>
                <th className="px-3 py-2.5 text-left font-medium">Profile</th>
                <th className="px-3 py-2.5 text-left font-medium">Remote IP</th>
                <th className="px-3 py-2.5 text-left font-medium">Comment</th>
                <th className="px-3 py-2.5 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-3 py-2.5"><Skeleton className="h-3.5 w-full rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">
                      {loaded ? "No PPP secrets found" : "Loading..."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => (
                  <tr key={s.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{s.name}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-700 uppercase">
                        {s.service || "pppoe"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{s.profile || "—"}</td>
                    <td className="px-3 py-2 font-mono text-slate-500 text-[10px]">{s.remoteAddress || "—"}</td>
                    <td className="px-3 py-2 text-slate-400 italic text-[10px]">{s.comment || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      {s.disabled ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600">
                          Disabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-600">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            {loaded
              ? `${secrets.length} secret${secrets.length !== 1 ? "s" : ""} on ${mk?.name}`
              : "Fetching from MikroTik…"}
          </span>
          <Button size="sm" variant="outline" onClick={onClose} className="h-7 text-xs">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type QuickSettings = { autoMkSync: boolean; autoSync: boolean; activeGraph: boolean; webPort: string };

function QuickSettingsModal({
  mk, open, onClose, token, onSaved,
}: { mk: MkRow | null; open: boolean; onClose: () => void; token: string; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<QuickSettings>({
    autoMkSync: false, autoSync: false, activeGraph: false, webPort: "",
  });

  function handleOpen(o: boolean) {
    if (o && mk) {
      setSettings({
        autoMkSync: mk.autoMkSync,
        autoSync: mk.autoSync,
        activeGraph: mk.activeGraph,
        webPort: mk.webPort ? String(mk.webPort) : "",
      });
    }
    if (!o) onClose();
  }

  async function handleSave() {
    if (!mk) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/mikrotiks/${mk.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mk.name, publicIp: mk.publicIp, login: mk.login, password: mk.password,
          autoMkSync: settings.autoMkSync,
          autoSync: settings.autoSync,
          activeGraph: settings.activeGraph,
          webPort: settings.webPort ? parseInt(settings.webPort) : undefined,
          note: mk.note ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Settings saved", description: `${mk.name} settings updated` });
      onSaved();
      onClose();
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="bg-white max-w-sm p-0">
        <div className="bg-slate-700 px-5 py-3 rounded-t-lg flex items-center justify-between">
          <DialogTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Quick Settings — {mk?.name}
          </DialogTitle>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {([
            { label: "Auto MK Sync", field: "autoMkSync" as const, desc: "Sync PPP secrets automatically" },
            { label: "Auto Sync", field: "autoSync" as const, desc: "Auto sync client status" },
            { label: "Active Graph", field: "activeGraph" as const, desc: "Enable bandwidth graph" },
          ] as const).map(({ label, field, desc }) => (
            <div key={field} className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700">{label}</p>
                <p className="text-[10px] text-slate-400">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, [field]: !s[field] }))}
                className={`relative w-10 h-5 rounded-full transition-colors ${settings[field] ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${settings[field] ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          ))}

          <div className="pt-1 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700 block mb-1">API Port (RouterOS)</label>
            <Input
              value={settings.webPort}
              onChange={(e) => setSettings((s) => ({ ...s, webPort: e.target.value }))}
              placeholder="e.g. 8728 or 8090"
              className="h-8 text-xs border-slate-300"
            />
            {settings.activeGraph && !settings.webPort && (
              <p className="text-[10px] text-red-500 mt-1">API Port required when Active Graph is enabled</p>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-lg">
          <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs border-slate-300">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
  const [activeConnMk, setActiveConnMk] = useState<MkRow | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [pppSecretsMk, setPppSecretsMk] = useState<MkRow | null>(null);
  const [settingsMk, setSettingsMk] = useState<MkRow | null>(null);

  const token = localStorage.getItem("isp_token") ?? "";

  const { data, isLoading } = useListMikrotiks();
  const mikrotiks = ((data?.mikrotiks ?? []) as MkRow[]).filter((m) =>
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

  function openEdit(m: MkRow) {
    setEditingId(m.id);
    setForm({
      name: m.name, publicIp: m.publicIp, login: m.login, password: m.password,
      autoMkSync: m.autoMkSync, autoSync: m.autoSync, activeGraph: m.activeGraph,
      webPort: m.webPort ? String(m.webPort) : "", note: m.note ?? "",
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
        name: form.name.trim(), publicIp: form.publicIp.trim(),
        login: form.login.trim(), password: form.password.trim(),
        autoMkSync: form.autoMkSync, autoSync: form.autoSync, activeGraph: form.activeGraph,
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

  async function handleTestConnection(m: MkRow) {
    setTestingId(m.id);
    try {
      const res = await fetch(`/api/mikrotiks/${m.id}/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { success?: boolean; error?: string; mikrotik?: MkRow; resource?: Record<string, string> };
      if (!res.ok) throw new Error(data.error ?? "Connection failed");
      queryClient.invalidateQueries({ queryKey: getListMikrotiksQueryKey() });
      const board = data.resource?.["board-name"] ?? "";
      toast({
        title: "✅ Connected",
        description: `${m.name} is reachable${board ? ` — ${board}` : ""}`,
      });
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: getListMikrotiksQueryKey() });
      toast({
        title: "❌ Connection Failed",
        description: err instanceof Error ? err.message : "Cannot reach MikroTik",
        variant: "destructive",
      });
    } finally {
      setTestingId(null);
    }
  }

  async function handleSync(m: MkRow) {
    setSyncingId(m.id);
    try {
      const res = await fetch(`/api/mikrotiks/${m.id}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { success?: boolean; error?: string; synced?: number; totalSecrets?: number; totalActive?: number };
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      queryClient.invalidateQueries({ queryKey: getListMikrotiksQueryKey() });
      toast({
        title: "✅ Sync Complete",
        description: `Synced ${data.synced ?? 0} clients — ${data.totalActive ?? 0} active of ${data.totalSecrets ?? 0} secrets`,
      });
    } catch (err) {
      toast({
        title: "❌ Sync Failed",
        description: err instanceof Error ? err.message : "Sync failed",
        variant: "destructive",
      });
    } finally {
      setSyncingId(null);
    }
  }

  const connected = (data?.mikrotiks ?? []) as MkRow[];
  const connectedCount = connected.filter((m) => m.status === "connected").length;
  const disconnectedCount = connected.filter((m) => m.status !== "connected").length;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="w-5 h-5 text-sky-500" />
          <h1 className="text-lg font-bold text-slate-800">Network</h1>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {connectedCount} Connected
            </span>
            {disconnectedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {disconnectedCount} Disconnected
              </span>
            )}
          </div>
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
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Network List:</span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search:"
              className="h-7 pl-8 pr-7 text-xs w-40 border-slate-200 bg-slate-50"
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
                <th className="px-3 py-2.5 text-left font-medium w-20">Mikrotik Id</th>
                <th className="px-3 py-2.5 text-left font-medium">Name</th>
                <th className="px-3 py-2.5 text-center font-medium w-28">Status</th>
                <th className="px-0 py-0 w-60">
                  <div className="flex h-full">
                    <div className="flex-1 px-3 py-2.5 text-center font-medium border-r border-slate-600">OWN</div>
                    <div className="flex-1 px-3 py-2.5 text-center font-medium">Reseller</div>
                  </div>
                </th>
                <th className="px-3 py-2.5 text-left font-medium w-52">Details</th>
                <th className="px-3 py-2.5 text-center font-medium w-24">Users</th>
                <th className="px-3 py-2.5 text-center font-medium w-36">Action</th>
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
                  const isConnected = m.status === "connected";
                  const syncTime = m.lastSyncAt
                    ? new Date(m.lastSyncAt).toLocaleString("en-GB", {
                        day: "2-digit", month: "short", year: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })
                    : null;
                  const isTesting = testingId === m.id;
                  const isSyncing = syncingId === m.id;

                  return (
                    <tr key={m.id} className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-sky-50/30`}>
                      {/* MikroTik ID */}
                      <td className="px-3 py-3 text-slate-500 font-semibold text-center">{idx + 1}</td>

                      {/* Name */}
                      <td className="px-3 py-3">
                        <div className={`font-bold text-sm ${isConnected ? "text-slate-800" : "text-red-600"}`}>
                          {m.name}
                        </div>
                        {isConnected ? (
                          <>
                            {m.model && <div className="text-[10px] text-slate-500 mt-0.5">{m.model}</div>}
                            {m.macAddress && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{m.macAddress}</div>}
                            <div className="flex items-center gap-1 mt-1">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-white">PK</span>
                              {m.boardName && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600">{m.boardName}</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-[10px] text-red-400 italic mt-0.5">
                            {m.note ?? "Mikrotik Not Connected, Please check."}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        {isConnected ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-500 text-white uppercase tracking-wide">
                            CONNECTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-red-500 text-white uppercase tracking-wide">
                            DISCONNECTED
                          </span>
                        )}
                      </td>

                      {/* OWN | Reseller */}
                      <td className="px-0 py-3">
                        <div className="flex divide-x divide-slate-200">
                          <div className="flex-1 px-3">
                            {isConnected ? (
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
                            ) : (
                              <div className="space-y-0.5 text-slate-400">
                                <div className="flex gap-1"><span>Active:</span><span className="font-bold">0</span></div>
                                <div className="flex gap-1"><span>Inactive:</span><span className="font-bold">0</span></div>
                                <div className="flex gap-1 border-t border-slate-100 pt-0.5 mt-0.5"><span>Total:</span><span className="font-bold">0</span></div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 px-3">
                            <div className="space-y-0.5 text-slate-400">
                              <div className="flex gap-1"><span>Active:</span><span className="font-bold text-slate-500">0</span></div>
                              <div className="flex gap-1"><span>Inactive:</span><span className="font-bold text-slate-500">0</span></div>
                              <div className="flex gap-1 border-t border-slate-100 pt-0.5 mt-0.5"><span>Total:</span><span className="font-bold text-slate-500">0</span></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex px-3 mt-1.5 gap-1 text-[11px] font-bold border-t border-slate-100 pt-1">
                          <span className="text-sky-600">{isConnected ? stats.totalClients : 0}</span>
                          <span className="text-slate-300 mx-0.5">|</span>
                          <span className="text-slate-500">{isConnected ? stats.onlineClients : 0}</span>
                        </div>
                      </td>

                      {/* Details */}
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <div className="text-[10px]">
                            <span className="font-medium text-slate-500">IP:</span>{" "}
                            <span className="font-mono text-slate-700">{m.publicIp}</span>
                            {m.login && <span className="text-slate-400">@{m.login}</span>}
                            {m.webPort && <span className="text-slate-400">:{m.webPort}</span>}
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
                          {/* Active Connections */}
                          <button
                            onClick={() => isConnected && setActiveConnMk(m)}
                            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${isConnected ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-600 cursor-pointer" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
                            title={isConnected ? "Active Connections" : "Not connected"}
                          >
                            <Users className="w-3 h-3" />
                          </button>
                          {/* Sync */}
                          <button
                            onClick={() => isConnected && !isSyncing && handleSync(m)}
                            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${isConnected ? "bg-amber-100 hover:bg-amber-200 text-amber-600" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
                            title={isConnected ? "Sync PPP Secrets" : "Not connected"}
                            disabled={isSyncing}
                          >
                            {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpFromLine className="w-3 h-3" />}
                          </button>
                          {/* PPP Secrets */}
                          <button
                            onClick={() => isConnected && setPppSecretsMk(m)}
                            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${isConnected ? "bg-sky-100 hover:bg-sky-200 text-sky-600 cursor-pointer" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
                            title={isConnected ? "PPP Secrets" : "Not connected"}
                          >
                            <Lock className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* Test Connection */}
                          <button
                            onClick={() => !isTesting && handleTestConnection(m)}
                            className="w-6 h-6 flex items-center justify-center rounded transition-colors bg-emerald-100 hover:bg-emerald-200 text-emerald-600"
                            title="Test Connection"
                            disabled={isTesting}
                          >
                            {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => openEdit(m)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-sky-100 hover:bg-sky-200 text-sky-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          {/* Settings */}
                          <button
                            onClick={() => setSettingsMk(m)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Quick Settings"
                          >
                            <Settings className="w-3 h-3" />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(m.id, m.name)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-red-500 hover:bg-red-600 text-white transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
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

        {mikrotiks.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 flex items-center text-[10px] text-slate-400">
            Showing {mikrotiks.length} of {(data?.mikrotiks ?? []).length} entries
          </div>
        )}
      </div>

      {/* Online Clients Chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-600 mb-4 uppercase tracking-wide">
          Total Online Clients Count
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={generateOnlineChartData(stats.onlineClients || 6)}
              margin={{ top: 4, right: 12, left: -20, bottom: 0 }}
            >
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
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg p-0">
          <div className="bg-slate-700 px-5 py-3 rounded-t-lg">
            <DialogTitle className="text-sm font-semibold text-white">
              {editingId ? "Edit Mikrotik" : "Add Mikrotik"}
            </DialogTitle>
          </div>

          <div className="px-6 py-4 space-y-3.5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right font-semibold text-slate-700">
                Network Name <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-2 flex items-center gap-1">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Mikrotik-1 or Mikrotik-2 etc"
                  className="h-8 text-xs border-slate-300 focus-visible:ring-sky-500"
                />
                <button className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-500 shrink-0 text-xs font-bold">···</button>
              </div>
            </div>

            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right font-semibold text-slate-700">
                Public IP Address <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.publicIp}
                onChange={(e) => setForm((f) => ({ ...f, publicIp: e.target.value }))}
                placeholder="Mikrotik Public IP"
                className="col-span-2 h-8 text-xs border-slate-300 focus-visible:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right font-semibold text-slate-700">
                Mikrotik Login <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-2 flex items-center gap-1">
                <Input
                  type={showLogin ? "text" : "password"}
                  value={form.login}
                  onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
                  placeholder="Login Username"
                  className="h-8 text-xs border-slate-300 focus-visible:ring-sky-500"
                />
                <button onClick={() => setShowLogin((v) => !v)} className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-500 shrink-0">
                  {showLogin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right font-semibold text-slate-700">
                Mikrotik Password <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-2 flex items-center gap-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Login Password"
                  className="h-8 text-xs border-slate-300 focus-visible:ring-sky-500"
                />
                <button onClick={() => setShowPassword((v) => !v)} className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-500 shrink-0">
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {[
              { label: "Auto MK Sync?", field: "autoMkSync" as const },
              { label: "Auto Sync?", field: "autoSync" as const },
              { label: "Active Graph?", field: "activeGraph" as const },
            ].map(({ label, field }) => (
              <div key={field} className="grid grid-cols-3 items-center gap-3">
                <Label className="text-xs text-right text-slate-600">{label}</Label>
                <div className="col-span-2 flex items-center gap-5">
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
              <div className="grid grid-cols-3 gap-3">
                <div />
                <p className="col-span-2 text-[10px] text-red-500 italic">If Yes, You Require API Port</p>
              </div>
            )}

            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right text-slate-600">API Port No</Label>
              <Input
                value={form.webPort}
                onChange={(e) => setForm((f) => ({ ...f, webPort: e.target.value }))}
                placeholder="e.g. 8090 (RouterOS API service)"
                className="col-span-2 h-8 text-xs border-slate-300 focus-visible:ring-sky-500 max-w-[180px]"
              />
            </div>

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

          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 rounded-b-lg">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setForm({ ...emptyForm })}
              className="h-8 text-xs border-slate-300 text-slate-600 min-w-[70px]"
            >
              RESET
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createMk.isPending || updateMk.isPending}
              className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white min-w-[70px]"
            >
              {createMk.isPending || updateMk.isPending ? "Saving..." : "SUBMIT"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Connections Modal */}
      <ActiveConnectionsModal
        mk={activeConnMk}
        open={activeConnMk !== null}
        onClose={() => setActiveConnMk(null)}
        token={token}
      />

      {/* PPP Secrets Modal */}
      <PppSecretsModal
        mk={pppSecretsMk}
        open={pppSecretsMk !== null}
        onClose={() => setPppSecretsMk(null)}
        token={token}
      />

      {/* Quick Settings Modal */}
      <QuickSettingsModal
        mk={settingsMk}
        open={settingsMk !== null}
        onClose={() => setSettingsMk(null)}
        token={token}
        onSaved={() => queryClient.invalidateQueries({ queryKey: getListMikrotiksQueryKey() })}
      />
    </div>
  );
}
