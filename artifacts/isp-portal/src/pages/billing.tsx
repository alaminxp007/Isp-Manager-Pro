import { useState, useEffect, useMemo } from "react";
import { usePermission } from "@/hooks/usePermission";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetBillsMonthlyTrend, 
  useGetBillsSummary, 
  useListBills, 
  useListZones,
  useCollectBill,
} from "@workspace/api-client-react";
import { 
  CreditCard, Printer, ChevronDown, Search, 
  ChevronUp, AlertTriangle, Circle, CheckCircle2
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const COLORS = ['#0ea5e9', '#3b82f6', '#8b5cf6', '#6366f1', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(mo)-1]} ${y}`;
}

const collectSchema = z.object({
  collectedAmount: z.string().min(1, "Amount required"),
  discount: z.string().optional(),
  note: z.string().optional(),
  paymentMethod: z.string().optional(),
});
type CollectForm = z.infer<typeof collectSchema>;

type BillRow = {
  id: number;
  comId?: string | null;
  fullName?: string | null;
  username?: string | null;
  phone?: string | null;
  zoneName?: string | null;
  packageName?: string | null;
  packagePrice?: string | null;
  generatedAmount: string;
  collectedAmount: string;
  discount: string;
  extraBill: string;
  payableAmount: string;
  status: string;
  isOnline?: boolean | null;
  clientStatus?: string | null;
  paymentDate?: string | null;
  billDate?: string | null;
  address?: string | null;
  note?: string | null;
};

function CollectModal({ bill, onClose, onSuccess }: { bill: BillRow; onClose: () => void; onSuccess: () => void }) {
  const collectBill = useCollectBill();
  const payable = parseFloat(bill.payableAmount ?? "0");
  const generated = parseFloat(bill.generatedAmount ?? "0");
  const existingDiscount = parseFloat(bill.discount ?? "0");

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CollectForm>({
    resolver: zodResolver(collectSchema),
    defaultValues: {
      collectedAmount: payable > 0 ? payable.toFixed(2) : generated.toFixed(2),
      discount: existingDiscount > 0 ? existingDiscount.toFixed(2) : "0",
      note: bill.note ?? "",
      paymentMethod: "cash",
    },
  });

  const collectedVal = parseFloat(watch("collectedAmount") || "0");
  const discountVal = parseFloat(watch("discount") || "0");
  const newPayable = generated - discountVal - collectedVal;

  const onSubmit = async (data: CollectForm) => {
    await collectBill.mutateAsync({ id: bill.id, data });
    onSuccess();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white border-slate-200 max-w-md p-0 gap-0">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-100">
          <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-sky-500" />
            Collect Bill Payment
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-800">{bill.fullName ?? bill.username ?? "—"}</p>
              <p className="text-[11px] text-sky-600 font-medium">{bill.comId ?? "—"}</p>
              {bill.phone && <p className="text-[11px] text-slate-500">{bill.phone}</p>}
              {bill.zoneName && <p className="text-[11px] text-slate-400">{bill.zoneName}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Generated Bill</p>
              <p className="text-lg font-bold text-slate-800">{generated.toFixed(2)}</p>
              <p className="text-[10px] text-slate-400">{bill.packageName} · {bill.packagePrice}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-slate-700">Payment Method</Label>
            <Select defaultValue="cash" onValueChange={(v) => setValue("paymentMethod", v)}>
              <SelectTrigger className="h-8 bg-white border-slate-200 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bkash">bKash</SelectItem>
                <SelectItem value="nagad">Nagad</SelectItem>
                <SelectItem value="rocket">Rocket</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-slate-700">Collected Amount <span className="text-red-500">*</span></Label>
              <Input
                {...register("collectedAmount")}
                type="number"
                step="0.01"
                min="0"
                className="h-8 bg-white border-slate-200 text-xs font-mono"
              />
              {errors.collectedAmount && (
                <p className="text-[10px] text-red-500">{errors.collectedAmount.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-slate-700">Discount</Label>
              <Input
                {...register("discount")}
                type="number"
                step="0.01"
                min="0"
                className="h-8 bg-white border-slate-200 text-xs font-mono"
              />
            </div>
          </div>

          <div className={`rounded p-2.5 text-xs flex items-center justify-between ${newPayable <= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <span className={newPayable <= 0 ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
              {newPayable <= 0 ? '✓ Bill will be marked as PAID' : `Remaining due after collection:`}
            </span>
            <span className={`font-bold text-sm ${newPayable <= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {newPayable.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-slate-700">Note (optional)</Label>
            <Textarea
              {...register("note")}
              rows={2}
              placeholder="Optional note..."
              className="bg-white border-slate-200 text-xs resize-none"
            />
          </div>

          {collectBill.error && (
            <p className="text-[11px] text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
              Failed to collect payment. Please try again.
            </p>
          )}

          <DialogFooter className="flex flex-row gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1 h-8 bg-white border-slate-200 text-slate-700 text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={collectBill.isPending}
              className="flex-1 h-8 bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium"
            >
              {collectBill.isPending ? "Saving..." : (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Collect Payment
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Billing() {
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"summary" | "list">("summary");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [collectBill, setCollectBill] = useState<BillRow | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);
  const limit = 30;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const monthOptions = useMemo(() => {
    const opts = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      opts.push(d.toISOString().slice(0, 7));
      d.setMonth(d.getMonth() - 1);
    }
    return opts;
  }, []);

  const { data: trendData, isLoading: isLoadingTrend } = useGetBillsMonthlyTrend();
  const { data: summaryData, isLoading: isLoadingSummary } = useGetBillsSummary(
    { month: selectedMonth },
    { query: { queryKey: ["bills-summary", selectedMonth] } }
  );
  const { data: listData, isLoading: isLoadingList } = useListBills(
    { 
      month: selectedMonth, 
      zoneId: zoneFilter !== "all" ? parseInt(zoneFilter) : undefined, 
      status: statusFilter !== "all" ? statusFilter : undefined, 
      search: debouncedSearch || undefined, 
      page, 
      limit 
    },
    { query: { queryKey: ["bills-list", selectedMonth, zoneFilter, statusFilter, debouncedSearch, page, limit], enabled: view === "list" } }
  );
  const { data: zonesData } = useListZones();

  const handleSetView = (newView: "summary" | "list", newStatus?: string) => {
    setView(newView);
    if (newStatus) setStatusFilter(newStatus);
    setPage(1);
  };

  const handleCollectSuccess = () => {
    if (collectBill) setSuccessId(collectBill.id);
    setCollectBill(null);
    queryClient.invalidateQueries({ queryKey: ["bills-list"] });
    queryClient.invalidateQueries({ queryKey: ["bills-summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bills/monthly-trend"] });
    setTimeout(() => setSuccessId(null), 3000);
  };

  const zonesSummary = summaryData?.zones || [];
  const pieData = zonesSummary.filter(z => parseFloat(String(z.totalDue ?? "0")) > 0).map(z => ({
    name: z.zoneName,
    value: parseFloat(String(z.totalDue ?? "0"))
  }));

  const bills = (listData?.data || []) as BillRow[];
  const totalBillsCount = listData?.total || 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800">
      {collectBill && (
        <CollectModal
          bill={collectBill}
          onClose={() => setCollectBill(null)}
          onSuccess={handleCollectSuccess}
        />
      )}

      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
          <CreditCard className="w-5 h-5 text-sky-500" />
          Billing
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-slate-700 hover:text-slate-900">
                COLLECTIONS <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-white border-slate-200">
              <DropdownMenuItem onClick={() => handleSetView("list", "due")} className="text-slate-700 focus:bg-slate-100">
                Collect Bill
              </DropdownMenuItem>
              <DropdownMenuItem className="text-slate-700 focus:bg-slate-100">Collect Advance</DropdownMenuItem>
              <DropdownMenuItem className="text-slate-700 focus:bg-slate-100">Collect Extra</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-slate-700 hover:text-slate-900">
                BILLING <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-white border-slate-200">
              <DropdownMenuItem onClick={() => handleSetView("list", "all")} className="text-slate-700 focus:bg-slate-100">All Bills</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSetView("list", "due")} className="text-slate-700 focus:bg-slate-100">Due Bills</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSetView("list", "paid")} className="text-slate-700 focus:bg-slate-100">Paid Bills</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSetView("summary")} className="text-slate-700 focus:bg-slate-100">Billing Summary</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" className="h-8 bg-white border-slate-200 text-slate-700 hover:bg-slate-100">
            INVOICE CLIENTS
          </Button>

          <Button variant="outline" size="sm" className="h-8 bg-white border-slate-200 text-slate-700 hover:bg-slate-100 px-2">
            <Printer className="w-4 h-4" />
          </Button>

          <Select value={selectedMonth} onValueChange={(val) => { setSelectedMonth(val); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-8 bg-white border-slate-200 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              {monthOptions.map(m => (
                <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === "summary" ? (
        <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          <Card className="bg-white border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly Bills, Collections & Discounts</h3>
            <div className="h-[320px] w-full">
              {isLoadingTrend ? (
                <Skeleton className="w-full h-full bg-slate-100 rounded" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', fontSize: '12px' }} itemStyle={{ color: '#1e293b' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} verticalAlign="top" align="right" />
                    <Bar dataKey="bill" name="Bill" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="collection" name="Collection" fill="#f97316" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="discount" name="Discount" fill="#eab308" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="bg-white border-slate-200 flex flex-col xl:col-span-2 overflow-hidden">
              <div className="p-3 border-b border-slate-200 bg-white sticky top-0 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Bills vs Collections ({formatMonth(selectedMonth)})</h3>
                <Button size="sm" onClick={() => handleSetView("list", "due")} className="h-7 text-[11px] bg-sky-500 hover:bg-sky-600 text-white">
                  Collect Due Bills
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 w-10">SL</th>
                      <th className="px-3 py-2">Zone</th>
                      <th className="px-3 py-2 text-right">Generated</th>
                      <th className="px-3 py-2 text-right">Collection</th>
                      <th className="px-3 py-2 text-right">Discount</th>
                      <th className="px-3 py-2 text-right">Total Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingSummary ? (
                      <tr><td colSpan={6} className="p-4"><Skeleton className="h-32 bg-slate-100" /></td></tr>
                    ) : zonesSummary.length === 0 ? (
                      <tr><td colSpan={6} className="p-4 text-center text-slate-400">No data available.</td></tr>
                    ) : (
                      <>
                        {zonesSummary.map((zone, i) => {
                          const isPositiveDue = parseFloat(String(zone.totalDue ?? "0")) > 0;
                          const ratio = parseFloat(String(zone.collectionRatio ?? "0"));
                          return (
                            <tr key={zone.zoneId} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                              <td className="px-3 py-2">
                                <div className="font-bold text-slate-700">{zone.zoneName}</div>
                                <div className="text-[10px] mt-0.5 text-slate-400">
                                  <span className="text-emerald-500">Active: {zone.activeClients || 0}</span>
                                  <span className="mx-1 text-slate-300">|</span>
                                  <span className="text-red-400">Inactive: {zone.inactiveClients || 0}</span>
                                  <span className="mx-1 text-slate-300">|</span>
                                  <span className="text-sky-500">{ratio.toFixed(1)}% collected</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right text-sky-600 font-medium">{parseFloat(String(zone.generatedBill ?? "0")).toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-emerald-600 font-medium">{parseFloat(String(zone.collection ?? "0")).toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-slate-700 font-medium">{parseFloat(String(zone.discount ?? "0")).toFixed(2)}</td>
                              <td className={`px-3 py-2 text-right font-bold ${isPositiveDue ? 'text-red-500' : 'text-emerald-500'}`}>
                                {parseFloat(String(zone.totalDue ?? "0")).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                          <td colSpan={2} className="px-3 py-3 text-right text-slate-700">TOTAL</td>
                          <td className="px-3 py-3 text-right text-sky-600">{parseFloat(String(summaryData?.totalGeneratedBill ?? "0")).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right text-emerald-600">{parseFloat(String(summaryData?.totalCollection ?? "0")).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right text-slate-700">{parseFloat(String(summaryData?.totalDiscount ?? "0")).toFixed(2)}</td>
                          <td className={`px-3 py-3 text-right ${parseFloat(String(summaryData?.totalDue ?? "0")) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {parseFloat(String(summaryData?.totalDue ?? "0")).toFixed(2)}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="bg-white border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Due Bills by Zone [{formatMonth(selectedMonth)}]</h3>
              <div className="h-[300px] w-full relative">
                {isLoadingSummary ? (
                  <Skeleton className="w-full h-full bg-slate-100 rounded" />
                ) : pieData.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">No due bills</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', fontSize: '12px' }} itemStyle={{ color: '#1e293b' }} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 h-full overflow-hidden">
          <div className="flex flex-col xl:flex-row justify-between gap-4">
            <div className="flex flex-wrap items-center text-xs bg-white rounded-md border border-slate-200 px-3 py-2 shadow-sm gap-2">
              <span className="text-slate-500">Total:</span>
              <span className="text-slate-800 font-bold">{listData?.totalBill || '0'}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Paid:</span>
              <span className="text-emerald-600 font-bold">{listData?.totalPaid || '0'}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Due:</span>
              <span className="text-red-500 font-bold">{listData?.totalDue || '0'}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Online:</span>
              <span className="text-sky-600 font-bold">{listData?.totalOnline || 0}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Offline:</span>
              <span className="text-slate-400 font-bold">{listData?.totalOffline || 0}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-[200px]">
                <Input 
                  placeholder="Search..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 bg-white border-slate-200 text-xs pr-8"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                <SelectTrigger className="w-[120px] h-8 bg-white border-slate-200 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="due">Due</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={zoneFilter} onValueChange={(val) => { setZoneFilter(val); setPage(1); }}>
                <SelectTrigger className="w-[140px] h-8 bg-white border-slate-200 text-xs">
                  <SelectValue placeholder="All Zone" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="all">All Zone</SelectItem>
                  {zonesData?.map(z => (
                    <SelectItem key={z.id} value={z.id.toString()}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="flex-1 flex flex-col bg-white border-slate-200 rounded-sm overflow-hidden min-h-[400px]">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 w-12 text-center">#</th>
                    <th className="px-2 py-2">ID / Name / Cell</th>
                    <th className="px-2 py-2">Zone / Package</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Discount / Extra</th>
                    <th className="px-2 py-2 text-center">PD / BD</th>
                    <th className="px-2 py-2 text-right">Payable</th>
                    <th className="px-2 py-2 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingList ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-2 py-2"><Skeleton className="h-6 bg-slate-100" /></td>
                        ))}
                      </tr>
                    ))
                  ) : bills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        No bills found for this criteria.
                      </td>
                    </tr>
                  ) : (
                    bills.map((bill, index) => {
                      const num = (page - 1) * limit + index + 1;
                      const payable = parseFloat(bill.payableAmount || '0');
                      const isRecentlyPaid = successId === bill.id;
                      
                      return (
                        <tr key={bill.id} className={`hover:bg-slate-50 transition-colors ${isRecentlyPaid ? 'bg-emerald-50' : ''}`}>
                          <td className="px-2 py-1.5 align-top text-center text-slate-400">
                            <div className="flex flex-col items-center gap-1">
                              <span>{num}</span>
                              {bill.isOnline ? (
                                <ChevronUp className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                              ) : bill.clientStatus === 'inactive' ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              ) : (
                                <Circle className="w-2 h-2 text-slate-300 fill-slate-300" />
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-sky-600">{bill.comId}</span>
                              <span className="text-[11px] text-slate-500">{bill.username}</span>
                              <span className="text-[11px] text-slate-700">{bill.fullName}</span>
                              {bill.phone && (
                                <a href={`tel:${bill.phone}`} className="text-[10px] text-sky-500 hover:underline">{bill.phone}</a>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-700">{bill.zoneName || '-'}</span>
                              <span className="text-[11px] text-slate-400 max-w-[160px] truncate">{bill.address || '-'}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-emerald-600 text-[11px] font-medium">{bill.packageName}</span>
                                <span className="text-slate-400 text-[11px]">{bill.packagePrice}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <div className="flex flex-col gap-1 items-start">
                              {bill.clientStatus === 'active' ? (
                                <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-[10px] py-0 px-1.5 font-normal">Active</Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-500 border border-slate-200 rounded text-[10px] py-0 px-1.5 font-normal">Inactive</Badge>
                              )}
                              <span className={`text-[10px] ${bill.isOnline ? 'text-sky-500' : 'text-slate-400'}`}>
                                {bill.isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <div className="flex flex-col text-[11px] text-slate-500 font-mono gap-0.5">
                              <span>Disc: {bill.discount || '0.00'}</span>
                              <span>Extra: {bill.extraBill || '0.00'}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 align-top text-center">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-slate-700">{bill.paymentDate || '-'}</span>
                              <span className="text-slate-400 text-[11px]">{bill.billDate || '-'}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 align-top text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={`font-bold ${payable > 0 ? 'text-red-500' : payable < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                {payable.toFixed(2)}
                              </span>
                              {bill.status === 'paid' ? (
                                <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-[10px] py-0 px-1.5 font-normal">Paid</Badge>
                              ) : (
                                <Badge className="bg-red-50 text-red-500 border border-red-200 rounded text-[10px] py-0 px-1.5 font-normal">Due</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 align-top text-center">
                            {bill.status === 'paid' ? (
                              <span className="text-emerald-500 text-[10px] flex items-center justify-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Paid
                              </span>
                            ) : can("billing.collect") ? (
                              <Button
                                size="sm"
                                onClick={() => setCollectBill(bill)}
                                className="h-7 px-2.5 text-[11px] bg-sky-500 hover:bg-sky-600 text-white font-medium"
                              >
                                Collect
                              </Button>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Due</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="bg-white border-t border-slate-200 p-2 flex justify-between items-center text-xs text-slate-500 shrink-0">
              <div>
                Showing {totalBillsCount > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, totalBillsCount)} of {totalBillsCount} entries
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-100" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <div className="px-2 font-medium text-slate-700">{page}</div>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-100" onClick={() => setPage(p => p + 1)} disabled={page * limit >= totalBillsCount}>
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
