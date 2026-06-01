import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetDashboardStats,
  useGetDashboardClientTrend,
  useGetBillsMonthlyTrend,
  useGetBillsSummary,
} from "@workspace/api-client-react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Users,
  UserCheck,
  UserX,
  Wifi,
  UserPlus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  FileText,
  AlertCircle,
  Activity,
} from "lucide-react";

function fmt(val?: string | number) {
  const n = typeof val === "string" ? parseFloat(val) : (val ?? 0);
  if (Number.isNaN(n)) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtMoney(val?: string | number) {
  const n = typeof val === "string" ? parseFloat(val) : (val ?? 0);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMonth(m: string) {
  try {
    return new Date(m + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  } catch {
    return m;
  }
}

const PIE_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6"];

interface StatCardProps {
  title: string;
  value?: string | number;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  loading: boolean;
  subtitle?: string;
  subIcon?: React.ElementType;
  subColor?: string;
}

function StatCard({ title, value, icon: Icon, iconColor, bgColor, loading, subtitle, subIcon: SubIcon, subColor }: StatCardProps) {
  return (
    <Card className="bg-white border-slate-200 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-20 mt-1.5 bg-slate-100" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 mt-1 leading-none">{value ?? 0}</p>
            )}
            {subtitle && (
              <p className={`text-xs mt-1.5 flex items-center gap-1 ${subColor ?? "text-slate-400"}`}>
                {SubIcon && <SubIcon className="w-3 h-3" />}
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${bgColor} shrink-0`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="text-slate-700 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  );
};

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="text-slate-700 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{Number(p.value).toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: clientTrend, isLoading: trendLoading } = useGetDashboardClientTrend();
  const { data: monthlyTrend, isLoading: monthlyLoading } = useGetBillsMonthlyTrend();
  const { data: billsSummary, isLoading: summaryLoading } = useGetBillsSummary({});

  if (!user) return null;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const trendMap = new Map<string, number>();
  (clientTrend ?? []).forEach((d) => trendMap.set(d.date, d.count));
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().slice(0, 10);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: trendMap.get(dateStr) ?? 0,
    };
  });

  const zonePieData = (billsSummary?.zones ?? [])
    .filter((z) => parseFloat(z.totalDue) > 0)
    .map((z) => ({ name: z.zoneName, value: parseFloat(z.totalDue), ratio: z.collectionRatio }));

  const monthlyData = (monthlyTrend ?? []).slice(-12).map((m) => ({
    month: fmtMonth(m.month),
    Bill: m.bill,
    Collection: m.collection,
    Discount: m.discount,
  }));

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Welcome, <span className="text-sky-600">{user.fullName || user.username}</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">{currentMonthLabel} — Overview</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span className="text-xs text-emerald-600 font-medium">System Operational</span>
        </div>
      </div>

      {/* Stat Cards Row 1 — Clients */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatCard
          title="Total Clients"
          value={fmt(stats?.totalClients)}
          icon={Users}
          iconColor="text-sky-500"
          bgColor="bg-sky-50"
          loading={statsLoading}
        />
        <StatCard
          title="Active"
          value={fmt(stats?.activeClients)}
          icon={UserCheck}
          iconColor="text-emerald-500"
          bgColor="bg-emerald-50"
          loading={statsLoading}
        />
        <StatCard
          title="Inactive"
          value={fmt(stats?.inactiveClients)}
          icon={UserX}
          iconColor="text-red-500"
          bgColor="bg-red-50"
          loading={statsLoading}
        />
        <StatCard
          title="Online"
          value={fmt(stats?.onlineClients)}
          icon={Wifi}
          iconColor="text-cyan-500"
          bgColor="bg-cyan-50"
          loading={statsLoading}
        />
        <StatCard
          title="New This Month"
          value={fmt(stats?.newClientsThisMonth)}
          icon={UserPlus}
          iconColor="text-violet-500"
          bgColor="bg-violet-50"
          loading={statsLoading}
        />
        <StatCard
          title="Today Collection"
          value={`৳${fmt(stats?.todayCollection)}`}
          icon={DollarSign}
          iconColor="text-amber-500"
          bgColor="bg-amber-50"
          loading={statsLoading}
        />
        <StatCard
          title={`${currentMonth} Bill`}
          value={`৳${fmt(stats?.currentMonthBill)}`}
          icon={FileText}
          iconColor="text-blue-500"
          bgColor="bg-blue-50"
          loading={statsLoading}
        />
        <StatCard
          title={`${currentMonth} Collected`}
          value={`৳${fmt(stats?.currentMonthCollection)}`}
          icon={CreditCard}
          iconColor="text-teal-500"
          bgColor="bg-teal-50"
          loading={statsLoading}
        />
      </div>

      {/* Stat Cards Row 2 — Billing summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Current Month Due"
          value={`৳${fmtMoney(stats?.currentMonthDue)}`}
          icon={AlertCircle}
          iconColor="text-orange-500"
          bgColor="bg-orange-50"
          loading={statsLoading}
        />
        <StatCard
          title="Total Dues (All)"
          value={`৳${fmt(stats?.totalDues)}`}
          icon={TrendingDown}
          iconColor="text-red-500"
          bgColor="bg-red-50"
          loading={statsLoading}
        />
        <StatCard
          title="Prev Month Bill"
          value={`৳${fmt(stats?.prevMonthBill)}`}
          icon={FileText}
          iconColor="text-slate-500"
          bgColor="bg-slate-100"
          loading={statsLoading}
        />
        <StatCard
          title="Prev Month Due"
          value={`৳${fmtMoney(stats?.prevMonthDue)}`}
          icon={TrendingUp}
          iconColor="text-purple-500"
          bgColor="bg-purple-50"
          loading={statsLoading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Last 30 Days New Clients */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-violet-500" />
              Last 30 Days — New Clients
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {trendLoading ? (
              <Skeleton className="h-48 bg-slate-100 rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <BarChart data={last30} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#94a3b8", fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="count" name="New Clients" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Bill vs Collection */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-500" />
              Monthly Bill vs Collection (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {monthlyLoading ? (
              <Skeleton className="h-48 bg-slate-100 rounded" />
            ) : monthlyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No billing data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <AreaChart data={monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="billGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: "#e2e8f0" }} />
                  <Area type="monotone" dataKey="Bill" stroke="#0ea5e9" strokeWidth={2} fill="url(#billGrad)" dot={false} />
                  <Area type="monotone" dataKey="Collection" stroke="#22c55e" strokeWidth={2} fill="url(#colGrad)" dot={false} />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    formatter={(v) => <span className="text-slate-500">{v}</span>}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Zone Due Bill Summary — Pie */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Due Bill Summary by Zone — {currentMonth}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {summaryLoading ? (
              <Skeleton className="h-56 bg-slate-100 rounded" />
            ) : zonePieData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No outstanding dues</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={220}>
                  <PieChart>
                    <Pie
                      data={zonePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {zonePieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`৳${fmtMoney(v)}`, "Due"]}
                      contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "11px" }}
                      labelStyle={{ color: "#64748b" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 min-w-0">
                  {zonePieData.map((z, idx) => (
                    <div key={z.name} className="flex items-center gap-2 text-xs min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <span className="text-slate-700 truncate flex-1">{z.name}</span>
                      <span className="text-slate-500 font-mono shrink-0">৳{fmt(z.value)}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-slate-200">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Total Due</span>
                      <span className="text-slate-900 font-semibold">৳{fmtMoney(billsSummary?.totalDue)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-slate-400">Total Billed</span>
                      <span className="text-slate-700">৳{fmt(billsSummary?.totalGeneratedBill)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zone-wise collection table */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              Zone-wise Collection — {currentMonth}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {summaryLoading ? (
              <div className="px-4 pb-4"><Skeleton className="h-48 bg-slate-100 rounded" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left text-slate-400 font-medium px-4 py-2">Zone</th>
                      <th className="text-right text-slate-400 font-medium px-3 py-2">Clients</th>
                      <th className="text-right text-slate-400 font-medium px-3 py-2">Billed</th>
                      <th className="text-right text-slate-400 font-medium px-3 py-2">Collected</th>
                      <th className="text-right text-slate-400 font-medium px-4 py-2">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(billsSummary?.zones ?? []).map((z) => {
                      const due = parseFloat(z.totalDue);
                      return (
                        <tr key={z.zoneId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 text-slate-700 font-medium">{z.zoneName}</td>
                          <td className="px-3 py-2.5 text-right text-slate-500">
                            <span className="text-emerald-500">{z.activeClients}</span>
                            <span className="text-slate-300"> / </span>
                            <span className="text-red-400">{z.inactiveClients}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-700">৳{fmt(z.generatedBill)}</td>
                          <td className="px-3 py-2.5 text-right text-emerald-500">৳{fmt(z.collection)}</td>
                          <td className={`px-4 py-2.5 text-right font-medium ${due > 0 ? "text-orange-500" : "text-slate-400"}`}>
                            ৳{fmt(z.totalDue)}
                          </td>
                        </tr>
                      );
                    })}
                    {(billsSummary?.zones ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-slate-400 py-8">No billing data for this month</td>
                      </tr>
                    )}
                  </tbody>
                  {(billsSummary?.zones ?? []).length > 0 && (
                    <tfoot>
                      <tr className="border-t border-slate-300 bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-700 font-semibold">Total</td>
                        <td className="px-3 py-2.5 text-right text-slate-400">—</td>
                        <td className="px-3 py-2.5 text-right text-slate-900 font-semibold">৳{fmt(billsSummary?.totalGeneratedBill)}</td>
                        <td className="px-3 py-2.5 text-right text-emerald-600 font-semibold">৳{fmt(billsSummary?.totalCollection)}</td>
                        <td className="px-4 py-2.5 text-right text-orange-500 font-semibold">৳{fmt(billsSummary?.totalDue)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
