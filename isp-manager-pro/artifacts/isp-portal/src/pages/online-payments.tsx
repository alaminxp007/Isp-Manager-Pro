import React, { useState, useMemo } from "react";
import { useListPayments } from "@workspace/api-client-react";
import { ShoppingCart, Search, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const gatewayColors: Record<string, string> = {
  bkash: "bg-pink-50 text-pink-600 border-pink-200",
  bkash_t: "bg-pink-50 text-pink-500 border-pink-200",
  rocket: "bg-violet-50 text-violet-600 border-violet-200",
  nagad: "bg-orange-50 text-orange-600 border-orange-200",
  ipay: "bg-blue-50 text-blue-600 border-blue-200",
  sslcommerz: "bg-teal-50 text-teal-600 border-teal-200",
  webhook: "bg-slate-100 text-slate-500 border-slate-200",
};

function formatPaymentDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  const day = d.getDate();
  const suffix = ["th", "st", "nd", "rd"][(day % 10 > 3 || [11, 12, 13].includes(day % 100)) ? 0 : day % 10] ?? "th";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const time = d.toTimeString().slice(0, 8);
  return `${day}${suffix} ${months[d.getMonth()]} ${d.getFullYear()} / ${time}`;
}

export default function OnlinePayments() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [draftDateFrom, setDraftDateFrom] = useState(dateFrom);
  const [draftDateTo, setDraftDateTo] = useState(dateTo);
  const [draftGateway, setDraftGateway] = useState("all");
  
  const [gateway, setGateway] = useState("all");
  const [referenceStatus, setReferenceStatus] = useState<"all" | "matched" | "unmatched" | "without_ref">("all");
  const [search, setSearch] = useState("");
  
  const [page, setPage] = useState(1);
  const limit = 30;

  const { data, isLoading } = useListPayments(
    {
      dateFrom,
      dateTo,
      gateway: gateway !== "all" ? gateway : undefined,
      referenceStatus: referenceStatus !== "all" ? referenceStatus : undefined,
      page,
      limit,
    },
    {
      query: {
        queryKey: ["payments", dateFrom, dateTo, gateway, referenceStatus, page, limit],
      },
    }
  );

  const applyFilters = () => {
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setGateway(draftGateway);
    setPage(1);
  };

  const payments = data?.data || [];
  
  const filteredPayments = useMemo(() => {
    if (!search) return payments;
    const lowerSearch = search.toLowerCase();
    return payments.filter(p => 
      p.transactionId?.toLowerCase().includes(lowerSearch) ||
      p.referenceId?.toLowerCase().includes(lowerSearch) ||
      p.autoClientUsername?.toLowerCase().includes(lowerSearch) ||
      p.autoClientPhone?.toLowerCase().includes(lowerSearch)
    );
  }, [payments, search]);

  const totalCollection = data?.totalCollection ?? "0.00";
  const totalCharged = data?.totalCharged ?? "0.00";
  const totalCountAmt = data?.totalCount ?? "0.00";
  const totalEntries = data?.total ?? 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4">
        {/* Header Left */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <ShoppingCart className="w-5 h-5 text-sky-500" />
              Online Payments
            </h2>
            <div className="xl:hidden text-xs text-slate-500 font-mono bg-white border border-slate-200 px-2 py-1 rounded">
              {dateFrom} → {dateTo}
            </div>
          </div>
          <div className="flex flex-wrap items-center text-xs bg-white rounded-md border border-slate-200 px-3 py-1.5 shadow-sm gap-2">
            <span className="text-slate-500">Total Collection:</span>
            <span className="text-sky-600 font-bold">{totalCollection} tk</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Total Charged:</span>
            <span className="text-sky-600 font-bold">{totalCharged} tk</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Total Count:</span>
            <span className="text-sky-600 font-bold">{totalCountAmt} tk</span>
          </div>
        </div>

        {/* Filters Top Right */}
        <div className="flex flex-col gap-3 w-full xl:w-auto">
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <div className="hidden xl:block text-xs text-slate-500 font-mono bg-white border border-slate-200 px-2 py-1.5 rounded h-8 leading-tight flex items-center">
              {dateFrom} → {dateTo}
            </div>
            <Input 
              type="date" 
              value={draftDateFrom}
              onChange={(e) => setDraftDateFrom(e.target.value)}
              className="w-[130px] h-8 bg-white border-slate-200 text-xs"
            />
            <Input 
              type="date" 
              value={draftDateTo}
              onChange={(e) => setDraftDateTo(e.target.value)}
              className="w-[130px] h-8 bg-white border-slate-200 text-xs"
            />
            <Select value={draftGateway} onValueChange={setDraftGateway}>
              <SelectTrigger className="w-[140px] h-8 bg-white border-slate-200 text-xs">
                <SelectValue placeholder="All Gateway" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="all">All Gateway</SelectItem>
                <SelectItem value="bkash">bKash</SelectItem>
                <SelectItem value="bkash_t">bKash (T)</SelectItem>
                <SelectItem value="rocket">Rocket</SelectItem>
                <SelectItem value="nagad">Nagad</SelectItem>
                <SelectItem value="ipay">iPay</SelectItem>
                <SelectItem value="sslcommerz">SSLCommerz</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" onClick={applyFilters} className="h-8 w-8 bg-sky-600 hover:bg-sky-700 text-white shrink-0">
              <Search className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center justify-between xl:justify-end gap-4 w-full">
            <RadioGroup 
              value={referenceStatus} 
              onValueChange={(val: any) => { setReferenceStatus(val); setPage(1); }} 
              className="flex items-center gap-4"
            >
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="all" id="r-all" className="w-3.5 h-3.5 border-slate-300 text-sky-500" />
                <label htmlFor="r-all" className="text-xs text-slate-700 cursor-pointer">All</label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="matched" id="r-matched" className="w-3.5 h-3.5 border-slate-300 text-sky-500" />
                <label htmlFor="r-matched" className="text-xs text-slate-700 cursor-pointer">Reference Matched</label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="unmatched" id="r-unmatched" className="w-3.5 h-3.5 border-slate-300 text-sky-500" />
                <label htmlFor="r-unmatched" className="text-xs text-slate-700 cursor-pointer">Reference Not Matched</label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="without_ref" id="r-without" className="w-3.5 h-3.5 border-slate-300 text-sky-500" />
                <label htmlFor="r-without" className="text-xs text-slate-700 cursor-pointer">Without Ref</label>
              </div>
            </RadioGroup>

            <div className="relative w-[180px]">
              <Input 
                placeholder="Search:" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 bg-white border-slate-200 text-xs pr-8 text-right"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="flex-1 flex flex-col bg-white border-slate-200 rounded-sm overflow-hidden min-h-[500px]">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2">SL NO</th>
                <th className="px-3 py-2">Date Time</th>
                <th className="px-3 py-2">Auto Added</th>
                <th className="px-3 py-2">Payment Details</th>
                <th className="px-3 py-2">Force Added To</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">Charged</th>
                <th className="px-3 py-2 text-right">Count Amount</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2"><Skeleton className="h-6 w-8 bg-slate-100" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-6 w-32 bg-slate-100" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-10 w-40 bg-slate-100" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-10 w-48 bg-slate-100" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-10 w-40 bg-slate-100" /></td>
                    <td className="px-3 py-2 text-right"><Skeleton className="h-6 w-16 bg-slate-100 ml-auto" /></td>
                    <td className="px-3 py-2 text-right"><Skeleton className="h-6 w-16 bg-slate-100 ml-auto" /></td>
                    <td className="px-3 py-2 text-right"><Skeleton className="h-6 w-20 bg-slate-100 ml-auto" /></td>
                    <td className="px-3 py-2 text-center"><Skeleton className="h-6 w-6 bg-slate-100 mx-auto" /></td>
                  </tr>
                ))
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">
                    No online payments found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const badgeColor = gatewayColors[payment.gateway?.toLowerCase()] || gatewayColors.webhook;
                  
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-3 py-1.5 align-top text-slate-700">
                        {payment.id}
                      </td>
                      <td className="px-3 py-1.5 align-top">
                        <span className="text-slate-700">{formatPaymentDate(payment.createdAt)}</span>
                      </td>
                      <td className="px-3 py-1.5 align-top">
                        <div className="flex flex-col gap-0.5">
                          {payment.autoClientUsername ? (
                            <>
                              <span className="text-sky-600 font-bold">{payment.autoClientUsername}</span>
                              <span className="text-slate-700 text-[11px]">{payment.autoClientName}</span>
                              <span className="text-slate-400 text-[11px]">{payment.autoClientPhone}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                          <div className="mt-1 flex items-center gap-1">
                            {payment.status === "unmatched" && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                            {payment.status === "without_ref" && <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />}
                            <span className="text-slate-400">Ref: </span>
                            <span className="text-red-500">{payment.referenceId || "None"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 align-top">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge className={`${badgeColor} rounded text-[10px] py-0 px-1.5 border capitalize`}>
                            {payment.gateway}
                          </Badge>
                          <span className="text-slate-700 font-mono mt-0.5">{payment.transactionId || "-"}</span>
                          {payment.deviceId && (
                            <span className="text-slate-400 font-mono text-[10px]">{payment.deviceId}</span>
                          )}
                          <div className="mt-0.5 text-red-500 cursor-pointer hover:underline text-[11px]">
                            Ref: {payment.referenceId || "None"}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 align-top">
                        {payment.forceClientUsername ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <ChevronRight className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                              <span className="text-slate-800 font-medium">{payment.forceClientName}</span>
                            </div>
                            <span className="text-slate-500 text-[11px] pl-4.5">{payment.forceClientPhone}</span>
                            <span className="text-slate-400 text-[10px] mt-1 pl-4.5">
                              [Add by: {payment.forceClientUsername}]
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 align-top text-right text-slate-700">
                        {payment.amount}
                      </td>
                      <td className="px-3 py-1.5 align-top text-right text-slate-700">
                        {payment.charged}
                      </td>
                      <td className="px-3 py-1.5 align-top text-right text-sky-600 font-bold">
                        {payment.countAmount}
                      </td>
                      <td className="px-3 py-1.5 align-top text-center">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-sky-500 hover:text-sky-600 hover:bg-sky-50">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-2 flex justify-between items-center text-xs text-slate-500 shrink-0">
          <div>
            Showing {totalEntries > 0 ? (page - 1) * limit + 1 : 0}-{Math.min(page * limit, totalEntries)} of {totalEntries} entries
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <div className="px-2 font-medium text-slate-700">{page}</div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= totalEntries}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
