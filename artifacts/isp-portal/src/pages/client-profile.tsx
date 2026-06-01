import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useGetClient, useListBills } from "@workspace/api-client-react";
import {
  ArrowLeft, Wifi, WifiOff, Printer, Edit, Trash2, Plus,
  RefreshCw, User, MapPin, Settings2, Phone, FileText,
  Activity, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

function TrafficChart() {
  const points = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    const dl = Math.max(0, Math.sin(t * Math.PI) * 800 + Math.random() * 100);
    const ul = Math.max(0, Math.sin(t * Math.PI) * 120 + Math.random() * 30);
    const h = 7 + Math.floor(i * 40 / 60);
    const m = (7 * 60 + i * 40) % 60;
    const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return { time: label, download: Math.round(dl), upload: Math.round(ul) };
  });

  return (
    <div className="bg-white border border-slate-200 rounded p-3">
      <div className="text-xs font-semibold text-slate-600 mb-2">Live Traffic</div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={points} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="ulGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={4} />
          <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="k" />
          <Tooltip
            contentStyle={{ fontSize: 10, background: "#ffffff", border: "1px solid #e2e8f0", color: "#1e293b", borderRadius: 4 }}
            formatter={(v: number, n: string) => [`${v} kbps`, n === "download" ? "Download" : "Upload"]}
          />
          <Area type="monotone" dataKey="download" stroke="#22c55e" strokeWidth={1.5} fill="url(#dlGrad)" dot={false} />
          <Area type="monotone" dataKey="upload" stroke="#3b82f6" strokeWidth={1.5} fill="url(#ulGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-1 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block" /> Download (kb)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Upload (kb)</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value?: string | number | null; highlight?: boolean }) {
  return (
    <div className="flex items-start py-0.5">
      <span className="text-slate-400 text-xs w-36 shrink-0">{label}</span>
      <span className="text-slate-400 text-xs mr-1">:</span>
      <span className={`text-xs font-medium ${highlight ? "text-sky-600" : "text-slate-700"}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="bg-slate-100 border-l-4 border-sky-500 px-3 py-1.5 mb-3 rounded-r">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function ClientProfile() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const rawId = params?.id ?? "";
  const clientId = /^\d+$/.test(rawId) ? parseInt(rawId, 10) : 0;
  const [trafficTab, setTrafficTab] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");

  const { data: client, isLoading: clientLoading } = useGetClient(
    clientId,
    { query: { queryKey: ["client", clientId], enabled: !!clientId } }
  );

  const { data: billsData, isLoading: billsLoading } = useListBills(
    { clientId },
    { query: { queryKey: ["client-bills", clientId], enabled: !!clientId } }
  );

  const bills = billsData?.data ?? [];

  if (clientLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-64 bg-slate-100" />
        <Skeleton className="h-40 w-full bg-slate-100" />
        <Skeleton className="h-64 w-full bg-slate-100" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg font-semibold">Client not found</p>
        <Button variant="outline" size="sm" className="mt-3 border-slate-200 text-slate-700" onClick={() => setLocation("/clients")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Clients
        </Button>
      </div>
    );
  }

  const totalDue = bills.reduce((acc, b) => acc + (parseFloat(b.payableAmount ?? "0") - parseFloat(b.collectedAmount ?? "0")), 0);

  const trafficTabs = [
    { key: "daily", label: '"DAILY" (5 MIN AVERAGE)' },
    { key: "weekly", label: '"WEEKLY" (30 MIN AVERAGE)' },
    { key: "monthly", label: '"MONTHLY" (2 HR AVERAGE)' },
    { key: "yearly", label: '"YEARLY" (1 DAY AVERAGE)' },
  ] as const;

  return (
    <div className="bg-white text-slate-800 min-h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
        <span
          className="cursor-pointer hover:text-sky-500 transition-colors"
          onClick={() => setLocation("/dashboard")}
        >Home</span>
        <ChevronRight className="w-3 h-3" />
        <span
          className="cursor-pointer hover:text-sky-500 transition-colors"
          onClick={() => setLocation("/clients")}
        >Clients</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700">Client Profile</span>
      </div>

      {/* Page Title + Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-sky-500" />
          <h2 className="text-lg font-bold text-slate-900">Client Profile</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-100" onClick={() => setLocation("/clients")}>
            <ArrowLeft className="w-3 h-3 mr-1" /> Back
          </Button>
          <Button size="sm" className="h-7 px-2.5 text-xs bg-sky-600 hover:bg-sky-700 text-white">
            <Edit className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button size="sm" className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-3 h-3 mr-1" /> Collect Bill
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-100">
            <RefreshCw className="w-3 h-3 mr-1" /> Renew
          </Button>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-slate-200 text-red-400 hover:bg-red-50 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Client Header Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wide">{client.fullName}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span className="text-sky-600 font-mono font-semibold">{client.comId}</span>
              <span className="text-slate-300">·</span>
              <span>{client.zoneName ?? "—"}</span>
              <span className="text-slate-300">·</span>
              <span>SINCE: {client.createdAt ? new Date(client.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase() : "—"}</span>
            </div>
            {client.phone && (
              <a href={`tel:${client.phone}`} className="text-xs text-sky-500 hover:underline mt-1 block font-mono">
                {client.phone}
              </a>
            )}
          </div>
          <div>
            {client.status === "active" ? (
              <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs px-3 py-1">
                <Wifi className="w-3 h-3 mr-1.5" />
                {client.isOnline ? "ONLINE" : "ACTIVE"}
              </Badge>
            ) : (
              <Badge className="bg-red-50 text-red-600 border border-red-200 text-xs px-3 py-1">
                <WifiOff className="w-3 h-3 mr-1.5" />
                INACTIVE
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status + Traffic */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 text-xs">
          <div className="space-y-1">
            <div className="flex items-center">
              <span className="text-slate-400 w-28">UPTIME</span>
              <span className="text-slate-400 mr-1">:</span>
              <span className="text-emerald-500 font-mono">{client.isOnline ? "02h:14m:33s" : "—"}</span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-400 w-28">LAST LOGOUT</span>
              <span className="text-slate-400 mr-1">:</span>
              <span className="text-slate-700 font-mono">{new Date().toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-400 w-28">DEVICE VENDOR</span>
              <span className="text-slate-400 mr-1">:</span>
              <span className="text-slate-700">D-Link International</span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-400 w-28">STATUS</span>
              <span className="text-slate-400 mr-1">:</span>
              <span className={client.isOnline ? "text-emerald-500 font-bold" : "text-slate-400"}>
                {client.isOnline ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center">
              <span className="text-slate-400 w-28">IP ADDRESS</span>
              <span className="text-slate-400 mr-1">:</span>
              <span className="text-sky-600 font-mono">{client.ipAddress ?? "—"}</span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-400 w-28">MAC ADDRESS</span>
              <span className="text-slate-400 mr-1">:</span>
              <span className="text-slate-700 font-mono">{client.macAddress ?? "—"}</span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-400 w-28">UPLOAD</span>
              <span className="text-slate-400 mr-1">:</span>
              <span className="text-blue-500 font-mono">{client.isOnline ? "432 kbps" : "—"}</span>
              <span className="text-slate-400 ml-2 text-[10px]">/ 10.00 Mbps</span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-400 w-28">DOWNLOAD</span>
              <span className="text-slate-400 mr-1">:</span>
              <span className="text-emerald-500 font-mono">{client.isOnline ? "8,867 kbps" : "—"}</span>
              <span className="text-slate-400 ml-2 text-[10px]">/ 10.00 Mbps</span>
            </div>
          </div>
        </div>

        <TrafficChart />

        {/* Traffic Tabs */}
        <div className="flex gap-1 mt-3">
          {trafficTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTrafficTab(tab.key)}
              className={`flex-1 text-[10px] py-1.5 px-1 rounded border transition-colors ${
                trafficTab === tab.key
                  ? "bg-sky-50 border-sky-400 text-sky-600"
                  : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Basic Info */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <Section title="Basic Info">
            <div className="grid grid-cols-2 gap-x-6">
              <div className="space-y-1">
                <InfoRow label="Client Name" value={client.fullName} />
                <InfoRow label="Client ID" value={client.comId} highlight />
                <InfoRow label="Occupation" value={null} />
                <InfoRow label="Package" value={client.packageName} highlight />
                <InfoRow label="Signup Fee" value="0.00" />
                <InfoRow label="P.Deadline" value={client.paymentDate ?? null} />
              </div>
              <div className="space-y-1">
                <InfoRow label="Father" value={null} />
                <InfoRow label="Company ID" value={null} />
                <InfoRow label="National ID" value={null} />
                <InfoRow label="Package Rate" value={client.packagePrice ? `${client.packagePrice} Tk` : null} />
                <InfoRow label="Previous ISP" value={null} />
                <InfoRow label="B.Deadline" value={client.billDate ?? null} />
              </div>
            </div>
          </Section>
        </div>

        {/* Address */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <Section title="Address">
            <div className="grid grid-cols-2 gap-x-6">
              <div className="space-y-1">
                <InfoRow label="Zone" value={client.zoneName} highlight />
                <InfoRow label="Flat No" value={null} />
                <InfoRow label="Road No" value={null} />
                <InfoRow label="Present Address" value={client.address} />
              </div>
              <div className="space-y-1">
                <InfoRow label="Box" value={null} />
                <InfoRow label="House No" value={null} />
                <InfoRow label="Thana" value={null} />
                <InfoRow label="Old Address" value={null} />
              </div>
            </div>
          </Section>
        </div>

        {/* Technical Info */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <Section title="Technical Info">
            <div className="grid grid-cols-2 gap-x-6">
              <div className="space-y-1">
                <InfoRow label="Client Type" value="Home" />
                <InfoRow label="Bill Mon" value={null} />
                <InfoRow label="Cable Type" value="UTP" />
                <InfoRow label="Required Cable" value={null} />
                <InfoRow label="Line Status" value="Active" highlight />
              </div>
              <div className="space-y-1">
                <InfoRow label="Connectivity" value={client.connectionType ?? "Shared"} />
                <InfoRow label="Technician" value={null} />
                <InfoRow label="ONU Mac" value={client.macAddress} />
                <InfoRow label="Cable Status" value={null} />
              </div>
            </div>
          </Section>
        </div>

        {/* Contacts */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <Section title="Contacts">
            <div className="grid grid-cols-2 gap-x-6">
              <div className="space-y-1">
                <InfoRow label="Main Cell No" value={client.phone} highlight />
                <InfoRow label="Alternative 1" value={null} />
                <InfoRow label="Alternative 2" value={null} />
              </div>
              <div className="space-y-1">
                <InfoRow label="Email" value={client.email} highlight />
                <InfoRow label="Alternative 3" value={null} />
                <InfoRow label="Alternative 4" value={null} />
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Note */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4">
        <div className="text-xs font-semibold text-slate-500 mb-1.5">Note</div>
        <div className="text-xs text-slate-400 italic min-h-[24px]">—</div>
      </div>

      {/* Billing Information */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-500" />
            Billing Information
          </div>
          <div className="text-sm font-semibold">
            Total Due:{" "}
            <span className={totalDue > 0 ? "text-red-500" : "text-emerald-500"}>
              {totalDue > 0 ? `-${totalDue.toLocaleString()}` : "0.00"} Tk
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Package / Bandwidth</th>
                <th className="px-3 py-2 text-right font-medium">Package Rate</th>
                <th className="px-3 py-2 text-right font-medium">Pd.Account</th>
                <th className="px-3 py-2 text-right font-medium">Pd.Extra Bill</th>
                <th className="px-3 py-2 text-right font-medium">Total Bill</th>
                <th className="px-3 py-2 text-right font-medium">Discount</th>
                <th className="px-3 py-2 text-right font-medium">Payment</th>
                <th className="px-3 py-2 text-left font-medium">Method</th>
                <th className="px-3 py-2 text-left font-medium">Mk/TrxID</th>
                <th className="px-3 py-2 text-left font-medium">Entry By</th>
                <th className="px-3 py-2 text-center font-medium">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 12 }).map((_, j) => (
                      <td key={j} className="px-3 py-2">
                        <Skeleton className="h-4 w-16 bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-6 text-center text-slate-400">
                    No billing records found.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => {
                  const due = parseFloat(bill.payableAmount ?? "0") - parseFloat(bill.collectedAmount ?? "0");
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 text-slate-700 font-medium">{bill.month}</td>
                      <td className="px-3 py-2 text-emerald-600">{bill.packageName ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{parseFloat(bill.generatedAmount ?? "0").toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{parseFloat(bill.collectedAmount ?? "0").toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{parseFloat(bill.extraBill ?? "0").toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800">{parseFloat(bill.payableAmount ?? "0").toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-amber-500">{parseFloat(bill.discount ?? "0").toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={due <= 0 ? "text-emerald-500 font-semibold" : "text-red-500 font-semibold"}>
                          {parseFloat(bill.collectedAmount ?? "0").toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500">Cash</td>
                      <td className="px-3 py-2 text-slate-400 font-mono">—</td>
                      <td className="px-3 py-2 text-slate-500">Admin</td>
                      <td className="px-3 py-2 text-center">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-sky-500 hover:bg-sky-50">
                          <Printer className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
