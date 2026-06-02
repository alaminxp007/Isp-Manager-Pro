import React, { useState, useEffect, useMemo } from "react";
import { usePermission } from "@/hooks/usePermission";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  useListClients, 
  useCreateClient, 
  useListZones, 
  useListPackages,
  getListClientsQueryKey,
  customFetch
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Search, Users, ChevronDown, Maximize2, Settings, Shuffle, Trash2,
  Edit, Trash, Plus, User, MessageSquare, RefreshCw, Banknote, CreditCard,
  BarChart2, Download, Loader2, CheckSquare, Square, Wifi
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const clientSchema = z.object({
  comId: z.string().optional(),
  username: z.string().min(3, "PPPoE ID must be at least 3 characters"),
  fullName: z.string().min(1, "Client Name is required"),
  phone: z.string().min(1, "Cell No is required"),
  zoneId: z.coerce.number().min(1, "Zone is required"),
  address: z.string().optional(),
  packageId: z.coerce.number().min(1, "Package is required"),
  ipAddress: z.string().optional(),
  paymentDate: z.coerce.number().min(1).max(31).optional(),
  billDate: z.coerce.number().min(1).max(31).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  balance: z.string().optional(),
  password: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function Clients() {
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [zoneId, setZoneId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importMkId, setImportMkId] = useState<number | null>(null);
  const [importMkList, setImportMkList] = useState<{ id: number; name: string; status: string }[]>([]);
  const [importPreview, setImportPreview] = useState<Array<{ username: string; profile: string; fullName: string; disabled: boolean; remoteAddress: string; packageId: number | null; packageName: string | null }>>([]);
  const [importSelected, setImportSelected] = useState<Set<string>>(new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const token = localStorage.getItem("isp_token") ?? "";

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: clientsData, isLoading } = useListClients(
    {
      search: debouncedSearch || undefined,
      zoneId: zoneId !== "all" ? parseInt(zoneId) : undefined,
      status: status !== "all" ? status : undefined,
      page,
      limit,
    },
    {
      query: {
        queryKey: ["clients", debouncedSearch, zoneId, status, page, limit],
      },
    }
  );

  const { data: statsActive } = useListClients({ status: "active", limit: 1 }, { query: { queryKey: ["clients-stats", "active"] } });
  const { data: statsInactive } = useListClients({ status: "inactive", limit: 1 }, { query: { queryKey: ["clients-stats", "inactive"] } });

  const { data: zonesData } = useListZones();
  const { data: packagesData } = useListPackages();

  const { data: graphStats } = useQuery({
    queryKey: ["clients-graph-stats"],
    queryFn: () => customFetch<{
      zoneStats: { zone: string; total: number }[];
      statusStats: { active: number; inactive: number; online: number; offline: number };
      monthlyStats: { month: string; total: number }[];
    }>("/api/clients/stats"),
    enabled: showGraph,
  });

  const createClient = useCreateClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      comId: "",
      username: "",
      fullName: "",
      phone: "",
      zoneId: 0,
      address: "",
      packageId: 0,
      ipAddress: "",
      status: "active",
      balance: "",
      password: "",
    },
  });

  const generateComId = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  async function openImportModal() {
    setIsImportOpen(true);
    setImportPreview([]);
    setImportSelected(new Set());
    try {
      const res = await fetch("/api/mikrotiks", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json() as { mikrotiks: { id: number; name: string; status: string }[] };
      const connected = (data.mikrotiks ?? []).filter((m) => m.status === "connected");
      setImportMkList(connected);
      if (connected.length > 0 && connected[0]) {
        setImportMkId(connected[0].id);
        await fetchImportPreview(connected[0].id);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch MikroTik list", variant: "destructive" });
    }
  }

  async function fetchImportPreview(mkId: number) {
    setImportLoading(true);
    setImportPreview([]);
    setImportSelected(new Set());
    try {
      const res = await fetch(`/api/mikrotiks/${mkId}/import-clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Failed to fetch");
      }
      const data = await res.json() as { importable: typeof importPreview };
      setImportPreview(data.importable ?? []);
      const allUsernames = new Set((data.importable ?? []).map((c) => c.username));
      setImportSelected(allUsernames);
    } catch (err) {
      toast({ title: "Preview Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setImportLoading(false);
    }
  }

  async function handleImport() {
    if (!importMkId || importSelected.size === 0) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/mikrotiks/${importMkId}/import-clients`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: Array.from(importSelected) }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Import failed");
      }
      const data = await res.json() as { imported: number; skipped: number };
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
      toast({ title: `✅ Import Complete`, description: `${data.imported} clients imported, ${data.skipped} skipped (already exist)` });
      setIsImportOpen(false);
    } catch (err) {
      toast({ title: "Import Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  const onAddClientSelect = (type: string) => {
    if (type === "PPPoE") {
      setLocation("/clients/new");
    } else {
      toast({
        title: `Add ${type} Client`,
        description: "Coming soon.",
      });
    }
  };

  const onSubmit = (values: ClientFormValues) => {
    createClient.mutate(
      {
        data: {
          comId: values.comId || generateComId(),
          username: values.username,
          fullName: values.fullName,
          phone: values.phone || undefined,
          zoneId: values.zoneId,
          address: values.address || undefined,
          packageId: values.packageId,
          ipAddress: values.ipAddress || undefined,
          paymentDate: values.paymentDate || undefined,
          billDate: values.billDate || undefined,
          status: values.status as any,
          balance: values.balance || undefined,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          toast({
            title: "Client created",
            description: "The new client has been added successfully.",
          });
          setIsAddModalOpen(false);
          form.reset();
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message || "Failed to create client.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const clients = clientsData?.data || [];
  const total = clientsData?.total || 0;
  
  const activeCount = statsActive?.total || 0;
  const inactiveCount = statsInactive?.total || 0;

  const onlineCount = useMemo(() => clients.filter(c => c.isOnline).length, [clients]);
  const offlineCount = useMemo(() => clients.filter(c => !c.isOnline).length, [clients]);

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800">
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
        {/* Left Side: Title & Stats */}
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
            <Users className="w-5 h-5" />
            Clients
          </h2>
          <div className="flex items-center text-xs font-medium bg-white rounded-md border border-slate-200 px-3 py-1.5 shadow-sm">
            <span className="cursor-pointer hover:text-slate-900 transition-colors text-slate-700">Total: {total}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-emerald-500 cursor-pointer hover:text-emerald-600 transition-colors">Active: {activeCount}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-red-500 cursor-pointer hover:text-red-600 transition-colors">Inactive: {inactiveCount}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-emerald-500 cursor-pointer hover:text-emerald-600 transition-colors">Online: {onlineCount}</span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">Offline: {offlineCount}</span>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {/* Add Dropdown */}
          {can("clients.create") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm h-8 px-3">
                  ADD <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200">
                <DropdownMenuItem onClick={() => onAddClientSelect("PPPoE")} className="cursor-pointer text-slate-800 focus:bg-slate-100">PPPoE</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddClientSelect("Static IP")} className="cursor-pointer text-blue-600 focus:bg-slate-100">Static IP</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddClientSelect("Invoice Client")} className="cursor-pointer text-emerald-600 focus:bg-slate-100">Invoice Client</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddClientSelect("Reseller MAC")} className="cursor-pointer text-orange-600 focus:bg-slate-100">Reseller MAC</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Import from MikroTik */}
          <Button
            size="sm"
            variant="outline"
            className="bg-white border-sky-300 text-sky-700 hover:bg-sky-50 h-8 px-3 font-medium shadow-sm gap-1.5"
            onClick={openImportModal}
          >
            <Download className="w-3.5 h-3.5" />
            Import MikroTik
          </Button>

          {/* Graph Report Toggle */}
          <Button
            size="sm"
            variant={showGraph ? "default" : "outline"}
            className={showGraph
              ? "bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 font-medium shadow-sm"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 h-8 px-3"}
            onClick={() => setShowGraph(v => !v)}
          >
            <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
            Graph Report
          </Button>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 h-8 px-3">
                {status === 'all' ? 'All Clients' : status === 'active' ? 'Active' : 'Inactive'} <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200">
              <DropdownMenuItem onClick={() => { setStatus('all'); setPage(1); }} className="cursor-pointer text-slate-800 focus:bg-slate-100">All Clients</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setStatus('active'); setPage(1); }} className="cursor-pointer text-emerald-600 focus:bg-slate-100">Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setStatus('inactive'); setPage(1); }} className="cursor-pointer text-red-500 focus:bg-slate-100">Inactive</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-purple-600 focus:bg-slate-100">Auto Inactive</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-orange-600 focus:bg-slate-100">Invoice Clients</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-emerald-600 focus:bg-slate-100">Reseller Clients</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Action Icons */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900 hover:bg-slate-100"><Maximize2 className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900 hover:bg-slate-100"><Settings className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900 hover:bg-slate-100"><Shuffle className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-slate-100"><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-[200px]">
            <Input 
              placeholder="Search" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 bg-white border-slate-200 text-xs pr-8"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Graph Report Panel */}
      {showGraph && (
        <div className="mb-4 space-y-3">
          {/* Zone Wise Bar Chart */}
          <Card className="bg-white border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Zone Wise Clients Counting</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={graphStats?.zoneStats ?? []} barCategoryGap="30%">
                <XAxis dataKey="zone" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, "Clients"]} />
                <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                  {(graphStats?.zoneStats ?? []).map((_, i) => (
                    <Cell key={i} fill={["#22c55e","#3b82f6","#a855f7","#f97316","#06b6d4"][i % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Donut + Monthly side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Active/Inactive/Online Donut */}
            <Card className="bg-white border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Active / Inactive / Online / Offline</h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={180}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Active", value: graphStats?.statusStats.active ?? 0 },
                        { name: "Inactive", value: graphStats?.statusStats.inactive ?? 0 },
                        { name: "Online", value: graphStats?.statusStats.online ?? 0 },
                      ]}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={75}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      <Cell fill="#22c55e" />
                      <Cell fill="#ef4444" />
                      <Cell fill="#3b82f6" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /><span className="text-slate-600">Active: <strong className="text-emerald-600">{graphStats?.statusStats.active ?? 0}</strong></span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /><span className="text-slate-600">Inactive: <strong className="text-red-500">{graphStats?.statusStats.inactive ?? 0}</strong></span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /><span className="text-slate-600">Online: <strong className="text-blue-500">{graphStats?.statusStats.online ?? 0}</strong></span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-300 inline-block" /><span className="text-slate-600">Offline: <strong className="text-slate-400">{graphStats?.statusStats.offline ?? 0}</strong></span></div>
                </div>
              </div>
            </Card>

            {/* Monthly New Clients Bar Chart */}
            <Card className="bg-white border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Monthly New Clients</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={graphStats?.monthlyStats ?? []} barCategoryGap="30%">
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, "New Clients"]} />
                  <Bar dataKey="total" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="flex-1 flex flex-col bg-white border-slate-200 rounded-sm overflow-hidden min-h-[400px]">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            {/* Dark navy header matching reference */}
            <thead className="bg-[#1e293b] text-white sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 w-8 text-slate-400 font-medium text-center">#</th>
                <th className="px-3 py-2.5 font-semibold">ComID</th>
                <th className="px-3 py-2.5 font-semibold">Client Name</th>
                <th className="px-3 py-2.5 font-semibold">Phone No</th>
                <th className="px-3 py-2.5 font-semibold">Zone/Address</th>
                <th className="px-3 py-2.5 font-semibold">Package</th>
                <th className="px-3 py-2.5 text-center font-semibold">PD</th>
                <th className="px-3 py-2.5 font-semibold">Online Info</th>
                <th className="px-3 py-2.5 text-right font-semibold text-red-400">Due</th>
                <th className="px-3 py-2.5 text-center font-semibold">Status</th>
                <th className="px-3 py-2.5 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 11 }).map((__, j) => (
                      <td key={j} className="px-3 py-2.5">
                        <Skeleton className="h-7 bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                    No clients found.
                  </td>
                </tr>
              ) : (
                clients.map((client, idx) => {
                  const due = parseFloat(client.balance || '0');
                  return (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                      {/* # */}
                      <td className="px-3 py-2 text-center text-slate-400 text-[11px]">
                        {(page - 1) * limit + idx + 1}
                      </td>

                      {/* ComID only */}
                      <td className="px-3 py-2">
                        <span className="font-bold text-red-500 text-[11px] tracking-wide">
                          {client.comId || '-'}
                        </span>
                      </td>

                      {/* Client Name + PPPoE ID */}
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800 text-[12px] leading-tight">
                          {client.fullName || '-'}
                        </div>
                        <div className="text-[11px] text-sky-500 mt-0.5">{client.username}</div>
                      </td>

                      {/* Phone No */}
                      <td className="px-3 py-2">
                        {client.phone ? (
                          <a
                            href={`tel:${client.phone}`}
                            className="text-sky-500 hover:underline text-[11px]"
                          >
                            {client.phone}
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Zone / Address */}
                      <td className="px-3 py-2">
                        <div className="font-bold text-sky-600 text-[11px] cursor-pointer hover:underline">
                          {client.zoneName || '-'}
                        </div>
                        <div className="text-[10px] text-slate-500 max-w-[180px] truncate" title={client.address || ''}>
                          {client.address || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          [{client.connectionType || 'PPPoE'}]
                        </div>
                      </td>

                      {/* Package */}
                      <td className="px-3 py-2">
                        <div className="text-emerald-600 font-semibold text-[11px]">
                          {client.packageName || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400">{client.connectionType || 'PPPoE'}</div>
                        <div className="text-[11px] font-bold text-slate-700">
                          ৳{client.packagePrice || '0'}
                        </div>
                      </td>

                      {/* PD / SD */}
                      <td className="px-3 py-2 text-center">
                        <div className="text-slate-700 font-semibold text-[11px]">
                          {client.paymentDate ?? '-'}
                        </div>
                        <div className="text-[10px] text-slate-400">{client.billDate ?? '-'}</div>
                      </td>

                      {/* Online Info */}
                      <td className="px-3 py-2">
                        <div className="font-mono text-[11px] text-slate-700">
                          {client.ipAddress || '-'}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {client.macAddress || '-'}
                        </div>
                        {client.isOnline && (
                          <div className="text-[10px] text-emerald-500">Online</div>
                        )}
                      </td>

                      {/* Due */}
                      <td className="px-3 py-2 text-right">
                        {due > 0 ? (
                          <span className="font-bold text-red-500 text-[11px]">৳{due.toFixed(0)}</span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">৳0</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col gap-0.5 items-center min-w-[60px]">
                          {client.status === 'active' ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] py-0 px-2 rounded justify-center font-semibold">
                              ACTIVE
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500 hover:bg-red-600 text-white text-[10px] py-0 px-2 rounded justify-center font-semibold">
                              INACTIVE
                            </Badge>
                          )}
                          {client.isOnline ? (
                            <Badge className="bg-sky-500 hover:bg-sky-600 text-white text-[10px] py-0 px-2 rounded justify-center font-semibold">
                              ONLINE
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-200 text-slate-500 text-[10px] py-0 px-2 rounded justify-center font-normal">
                              OFFLINE
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Action Dropdown */}
                      <td className="px-3 py-2 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-[11px] bg-sky-500 hover:bg-sky-600 text-white font-medium rounded"
                            >
                              Action <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 bg-white border-slate-200 shadow-lg">
                            <DropdownMenuItem
                              onClick={() => setLocation(`/clients/${client.id}`)}
                              className="text-slate-700 focus:bg-slate-100 cursor-pointer text-xs"
                            >
                              <User className="w-3.5 h-3.5 mr-2 text-slate-400" /> Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 cursor-pointer text-xs">
                              <Edit className="w-3.5 h-3.5 mr-2 text-slate-400" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 cursor-pointer text-xs">
                              <MessageSquare className="w-3.5 h-3.5 mr-2 text-slate-400" /> Send SMS
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 cursor-pointer text-xs">
                              <RefreshCw className="w-3.5 h-3.5 mr-2 text-slate-400" /> Change Package
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 cursor-pointer text-xs">
                              <Banknote className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Cash Payment
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-slate-700 focus:bg-slate-100 cursor-pointer text-xs">
                              <CreditCard className="w-3.5 h-3.5 mr-2 text-sky-500" /> Online Payment
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem className="text-red-600 focus:bg-red-50 cursor-pointer text-xs">
                              <Trash className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 px-4 py-2 flex justify-between items-center text-xs text-slate-500 shrink-0">
          <div>
            Showing {total > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total} entries
          </div>
          <div className="flex gap-4 font-medium">
            <span className="text-emerald-500">Online: {onlineCount}</span>
            <span className="text-slate-400">Offline: {offlineCount}</span>
          </div>
        </div>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-4xl p-0 overflow-hidden gap-0">
          <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50">
            <DialogTitle className="text-lg text-slate-900">Add New Client</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[80vh] overflow-y-auto p-4 custom-scrollbar">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* BASIC INFORMATION */}
                <div className="space-y-3">
                  <div className="bg-slate-100 px-3 py-1.5 rounded-sm text-sm font-semibold text-slate-800">
                    BASIC INFORMATION
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 px-2">
                    {/* Left Col */}
                    <div className="space-y-4">
                      <FormField control={form.control} name="zoneId" render={({ field }) => (
                        <FormItem className="grid grid-cols-3 items-center gap-2 space-y-0">
                          <FormLabel className="text-slate-500 text-right text-xs">Zone *</FormLabel>
                          <div className="col-span-2">
                            <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? field.value.toString() : ""}>
                              <FormControl>
                                <SelectTrigger className="h-8 bg-white border-slate-200 text-xs">
                                  <SelectValue placeholder="-Select Zone-" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white border-slate-200">
                                {zonesData?.map((z) => (
                                  <SelectItem key={z.id} value={z.id.toString()}>{z.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px] mt-1" />
                          </div>
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-3 items-center gap-2">
                        <FormLabel className="text-slate-500 text-right text-xs">Network</FormLabel>
                        <div className="col-span-2">
                          <Input placeholder="Choose a Network..." className="h-8 bg-white border-slate-200 text-xs" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 items-start gap-2 pt-1">
                        <FormLabel className="text-slate-500 text-right text-xs pt-1.5">This Month Bill</FormLabel>
                        <div className="col-span-2">
                          <RadioGroup defaultValue="auto" className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="auto" id="auto" className="w-3 h-3 border-slate-300 text-sky-500" />
                              <label htmlFor="auto" className="text-xs text-slate-700">Auto (1200)</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="manual" id="manual" className="w-3 h-3 border-slate-300 text-sky-500" />
                              <label htmlFor="manual" className="text-xs text-slate-700">Manual</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="nobill" id="nobill" className="w-3 h-3 border-slate-300 text-sky-500" />
                              <label htmlFor="nobill" className="text-xs text-slate-700">No Bill</label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>

                      <FormField control={form.control} name="packageId" render={({ field }) => (
                        <FormItem className="grid grid-cols-3 items-center gap-2 space-y-0">
                          <FormLabel className="text-slate-500 text-right text-xs">Package *</FormLabel>
                          <div className="col-span-2">
                            <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? field.value.toString() : ""}>
                              <FormControl>
                                <SelectTrigger className="h-8 bg-white border-slate-200 text-xs">
                                  <SelectValue placeholder="-Select Package-" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white border-slate-200">
                                {packagesData?.map((p) => (
                                  <SelectItem key={p.id} value={p.id.toString()}>{p.name} — {p.price} Tk</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px] mt-1" />
                          </div>
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="ipAddress" render={({ field }) => (
                        <FormItem className="grid grid-cols-3 items-center gap-2 space-y-0">
                          <FormLabel className="text-slate-500 text-right text-xs">IP Address</FormLabel>
                          <div className="col-span-2">
                            <Input placeholder="Ex. 192.168.0.1" className="h-8 bg-white border-slate-200 text-xs" {...field} />
                          </div>
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="username" render={({ field }) => (
                        <FormItem className="grid grid-cols-3 items-center gap-2 space-y-0">
                          <FormLabel className="text-slate-500 text-right text-xs">PPPoE ID *</FormLabel>
                          <div className="col-span-2">
                            <Input placeholder="PPPoE username" className="h-8 bg-white border-slate-200 text-xs" {...field} />
                            <FormMessage className="text-[10px] mt-1" />
                          </div>
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem className="grid grid-cols-3 items-center gap-2 space-y-0">
                          <FormLabel className="text-slate-500 text-right text-xs">Password</FormLabel>
                          <div className="col-span-2">
                            <Input type="password" placeholder="PPPoE password" className="h-8 bg-white border-slate-200 text-xs" {...field} />
                          </div>
                        </FormItem>
                      )} />
                    </div>

                    {/* Right Col */}
                    <div className="space-y-4">
                      <FormField control={form.control} name="fullName" render={({ field }) => (
                        <FormItem className="grid grid-cols-3 items-center gap-2 space-y-0">
                          <FormLabel className="text-slate-500 text-right text-xs">Client Name *</FormLabel>
                          <div className="col-span-2">
                            <Input placeholder="Full name" className="h-8 bg-white border-slate-200 text-xs" {...field} />
                            <FormMessage className="text-[10px] mt-1" />
                          </div>
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem className="grid grid-cols-3 items-center gap-2 space-y-0">
                          <FormLabel className="text-slate-500 text-right text-xs">Cell No *</FormLabel>
                          <div className="col-span-2">
                            <Input placeholder="01XXXXXXXXX" className="h-8 bg-white border-slate-200 text-xs" {...field} />
                            <FormMessage className="text-[10px] mt-1" />
                          </div>
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="paymentDate" render={({ field }) => (
                        <FormItem className="grid grid-cols-3 items-center gap-2 space-y-0">
                          <FormLabel className="text-slate-500 text-right text-xs">Payment Date</FormLabel>
                          <div className="col-span-2">
                            <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? field.value.toString() : ""}>
                              <FormControl>
                                <SelectTrigger className="h-8 bg-white border-slate-200 text-xs">
                                  <SelectValue placeholder="Select Date" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white border-slate-200 max-h-48">
                                {Array.from({length: 31}).map((_, i) => (
                                  <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-3 items-center gap-2">
                        <FormLabel className="text-slate-500 text-right text-xs">Flat/House/Road</FormLabel>
                        <div className="col-span-2 grid grid-cols-3 gap-2">
                          <Input placeholder="Flat" className="h-8 bg-white border-slate-200 text-xs" />
                          <Input placeholder="House" className="h-8 bg-white border-slate-200 text-xs" />
                          <Input placeholder="Road" className="h-8 bg-white border-slate-200 text-xs" />
                        </div>
                      </div>

                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem className="grid grid-cols-3 items-start gap-2 space-y-0">
                          <FormLabel className="text-slate-500 text-right text-xs pt-2">Present Address</FormLabel>
                          <div className="col-span-2">
                            <Textarea className="min-h-[60px] bg-white border-slate-200 text-xs resize-none" {...field} />
                          </div>
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                {/* DIAGRAM & CONNECTIVITY */}
                <div className="space-y-3">
                  <div className="bg-slate-100 px-3 py-1.5 rounded-sm text-sm font-semibold text-slate-800">
                    DIAGRAM & CONNECTIVITY
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 px-2">
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 items-center gap-2">
                        <FormLabel className="text-slate-500 text-right text-xs">Cable Type</FormLabel>
                        <div className="col-span-2">
                          <Select defaultValue="utp">
                            <SelectTrigger className="h-8 bg-white border-slate-200 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                              <SelectItem value="utp">UTP</SelectItem>
                              <SelectItem value="fiber">Fiber</SelectItem>
                              <SelectItem value="coax">Coax</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 items-center gap-2">
                        <FormLabel className="text-slate-500 text-right text-xs">MAC Address</FormLabel>
                        <div className="col-span-2">
                          <Input className="h-8 bg-white border-slate-200 text-xs" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 items-center gap-2">
                        <FormLabel className="text-slate-500 text-right text-xs">Type of Connectivity</FormLabel>
                        <div className="col-span-2">
                          <Select defaultValue="shared">
                            <SelectTrigger className="h-8 bg-white border-slate-200 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                              <SelectItem value="shared">Shared</SelectItem>
                              <SelectItem value="dedicated">Dedicated</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 items-center gap-2">
                        <FormLabel className="text-slate-500 text-right text-xs">Connection Mode</FormLabel>
                        <div className="col-span-2">
                          <Input defaultValue="Active" readOnly className="h-8 bg-slate-50 border-slate-200 text-xs text-slate-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 items-center gap-2">
                        <FormLabel className="text-slate-500 text-right text-xs">Type of Client</FormLabel>
                        <div className="col-span-2">
                          <Select defaultValue="home">
                            <SelectTrigger className="h-8 bg-white border-slate-200 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                              <SelectItem value="home">Home</SelectItem>
                              <SelectItem value="office">Office</SelectItem>
                              <SelectItem value="corporate">Corporate</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ADVANCE */}
                <Collapsible open={isAdvanceOpen} onOpenChange={setIsAdvanceOpen} className="space-y-3">
                  <CollapsibleTrigger asChild>
                    <div className="bg-slate-100 px-3 py-1.5 rounded-sm text-sm font-semibold text-slate-800 cursor-pointer flex justify-between items-center hover:bg-slate-200 transition-colors">
                      <span>ADVANCE</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isAdvanceOpen ? "rotate-180" : ""}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 px-2 pt-2">
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 items-center gap-2">
                          <FormLabel className="text-slate-500 text-right text-xs">Email</FormLabel>
                          <div className="col-span-2">
                            <Input type="email" className="h-8 bg-white border-slate-200 text-xs" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-2">
                          <FormLabel className="text-slate-500 text-right text-xs">Joining Date</FormLabel>
                          <div className="col-span-2">
                            <Input readOnly defaultValue={new Date().toISOString().split('T')[0]} className="h-8 bg-slate-50 border-slate-200 text-xs text-slate-500" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 items-center gap-2">
                          <FormLabel className="text-slate-500 text-right text-xs">Occupation</FormLabel>
                          <div className="col-span-2">
                            <Input className="h-8 bg-white border-slate-200 text-xs" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-2">
                          <FormLabel className="text-slate-500 text-right text-xs">Payment Method</FormLabel>
                          <div className="col-span-2">
                            <Select defaultValue="cash">
                              <SelectTrigger className="h-8 bg-white border-slate-200 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200">
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="bkash">bKash</SelectItem>
                                <SelectItem value="bank">Bank</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} className="h-8 bg-transparent border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 px-6">
                    Close
                  </Button>
                  <Button type="submit" disabled={createClient.isPending} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-6">
                    {createClient.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* ── Import from MikroTik Modal ── */}
      <Dialog open={isImportOpen} onOpenChange={(o) => { if (!importing) setIsImportOpen(o); }}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-2xl w-full p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Wifi className="w-4 h-4 text-sky-600" />
              Import Clients from MikroTik
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 py-3 space-y-3">
            {/* MikroTik selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600 w-20 shrink-0">MikroTik</span>
              <Select
                value={importMkId?.toString() ?? ""}
                onValueChange={(v) => {
                  const id = parseInt(v, 10);
                  setImportMkId(id);
                  fetchImportPreview(id);
                }}
                disabled={importMkList.length === 0}
              >
                <SelectTrigger className="h-8 bg-white border-slate-200 text-xs flex-1">
                  <SelectValue placeholder={importMkList.length === 0 ? "No connected MikroTiks" : "Select MikroTik"} />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {importMkList.map((mk) => (
                    <SelectItem key={mk.id} value={mk.id.toString()} className="text-xs">
                      {mk.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
                disabled={!importMkId || importLoading}
                onClick={() => importMkId && fetchImportPreview(importMkId)}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${importLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Stats bar */}
            {!importLoading && importPreview.length > 0 && (
              <div className="flex items-center gap-3 text-xs bg-sky-50 border border-sky-200 rounded-md px-3 py-2">
                <span className="text-sky-700 font-medium">{importPreview.length} importable PPP secrets found</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600">{importSelected.size} selected</span>
                <div className="ml-auto flex gap-2">
                  <button
                    className="text-sky-600 hover:text-sky-800 font-medium"
                    onClick={() => setImportSelected(new Set(importPreview.map((c) => c.username)))}
                  >Select All</button>
                  <span className="text-slate-300">|</span>
                  <button
                    className="text-slate-500 hover:text-slate-700"
                    onClick={() => setImportSelected(new Set())}
                  >Deselect All</button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {importLoading && (
              <div className="flex items-center justify-center py-10 text-slate-500 gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                Fetching PPP secrets...
              </div>
            )}

            {/* Empty state */}
            {!importLoading && importMkId && importPreview.length === 0 && (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                All PPP secrets already exist as clients, or no secrets found.
              </div>
            )}

            {/* No MikroTik connected */}
            {!importLoading && importMkList.length === 0 && (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                No connected MikroTik found. Please connect one from the Network page.
              </div>
            )}

            {/* Secret list */}
            {!importLoading && importPreview.length > 0 && (
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <div className="grid grid-cols-[24px_1fr_1fr_120px_80px] gap-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-50 px-3 py-2 border-b border-slate-200">
                  <span />
                  <span>Username</span>
                  <span>Full Name</span>
                  <span>Package</span>
                  <span>Status</span>
                </div>
                <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                  {importPreview.map((item) => {
                    const checked = importSelected.has(item.username);
                    return (
                      <div
                        key={item.username}
                        className={`grid grid-cols-[24px_1fr_1fr_120px_80px] gap-0 items-center px-3 py-2 cursor-pointer transition-colors ${checked ? "bg-sky-50/50" : "hover:bg-slate-50"}`}
                        onClick={() => {
                          const next = new Set(importSelected);
                          if (checked) next.delete(item.username);
                          else next.add(item.username);
                          setImportSelected(next);
                        }}
                      >
                        <span className="text-slate-400">
                          {checked ? <CheckSquare className="w-3.5 h-3.5 text-sky-600" /> : <Square className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-xs font-mono text-slate-800 truncate pr-2">{item.username}</span>
                        <span className="text-xs text-slate-600 truncate pr-2">{item.fullName || "—"}</span>
                        <span className="text-xs truncate pr-2">
                          {item.packageName
                            ? <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">{item.packageName}</span>
                            : <span className="text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">{item.profile || "—"}</span>}
                        </span>
                        <span className={`text-xs font-medium ${item.disabled ? "text-red-500" : "text-emerald-600"}`}>
                          {item.disabled ? "Inactive" : "Active"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportOpen(false)}
              disabled={importing}
              className="h-8 px-5 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 px-5 bg-sky-600 hover:bg-sky-700 text-white font-medium gap-1.5"
              disabled={importSelected.size === 0 || importing || importLoading}
              onClick={handleImport}
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {importing ? "Importing..." : `Import ${importSelected.size} Clients`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}
