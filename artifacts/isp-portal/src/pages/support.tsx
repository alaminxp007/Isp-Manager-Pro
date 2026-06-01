import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Ticket, Plus, Search, Filter, RefreshCw, Clock, CheckCircle2,
  AlertCircle, XCircle, Wifi, WifiOff, UserCheck, UserX,
  ChevronRight, Phone, MapPin, Package, Tag, MessageSquare,
  TriangleAlert, Zap, ArrowUpDown, Eye, PenLine,
} from "lucide-react";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "critical";
type TicketCategory = "connection" | "billing" | "hardware" | "software" | "other";

interface TicketItem {
  id: number;
  ticketNo: string;
  subject: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  clientId: number | null;
  clientFullName: string | null;
  clientUsername: string | null;
  clientPhone: string | null;
  clientStatus: string | null;
  clientIsOnline: boolean | null;
  zoneName: string | null;
  packageName: string | null;
}

interface TicketStats {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  total: number;
}

interface ClientSearchItem {
  id: number;
  comId: string | null;
  username: string | null;
  fullName: string;
  phone: string | null;
  status: string;
  isOnline: boolean;
  zoneName?: string | null;
  packageName?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  open:        { label: "Open",        color: "text-sky-600",    icon: AlertCircle,   bg: "bg-sky-50 border-sky-200" },
  in_progress: { label: "In Progress", color: "text-amber-600",  icon: Clock,         bg: "bg-amber-50 border-amber-200" },
  resolved:    { label: "Resolved",    color: "text-emerald-600",icon: CheckCircle2,  bg: "bg-emerald-50 border-emerald-200" },
  closed:      { label: "Closed",      color: "text-slate-500",  icon: XCircle,       bg: "bg-slate-100 border-slate-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  low:      { label: "Low",      color: "text-slate-500",  dot: "bg-slate-400" },
  medium:   { label: "Medium",   color: "text-sky-600",    dot: "bg-sky-500" },
  high:     { label: "High",     color: "text-orange-600", dot: "bg-orange-500" },
  critical: { label: "Critical", color: "text-red-600",    dot: "bg-red-500" },
};

const CATEGORY_LABELS: Record<string, string> = {
  connection: "Connection",
  billing:    "Billing",
  hardware:   "Hardware",
  software:   "Software",
  other:      "Other",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ClientStatusChip({ status, isOnline }: { status: string | null; isOnline: boolean | null }) {
  if (!status) return null;
  const active = status === "Active";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${active ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-red-500 bg-red-50 border-red-200"}`}>
        {active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
        {status}
      </span>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${isOnline ? "text-cyan-600 bg-cyan-50 border-cyan-200" : "text-slate-400 bg-slate-50 border-slate-200"}`}>
        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {isOnline ? "Online" : "Offline"}
      </span>
    </div>
  );
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Support() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const [newOpen, setNewOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<TicketItem | null>(null);

  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientSearchItem | null>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("connection");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [newNote, setNewNote] = useState("");

  const [updateStatus, setUpdateStatus] = useState("");
  const [updateNote, setUpdateNote] = useState("");

  const statsQ = useQuery<TicketStats>({
    queryKey: ["ticket-stats"],
    queryFn: () => customFetch({ url: "/api/tickets/stats" }),
    refetchInterval: 30000,
  });

  const ticketsQ = useQuery<{ data: TicketItem[]; total: number }>({
    queryKey: ["tickets", search, filterStatus, filterPriority, filterCategory],
    queryFn: () => {
      const p = new URLSearchParams({ limit: "50" });
      if (search) p.set("search", search);
      if (filterStatus !== "all") p.set("status", filterStatus);
      if (filterPriority !== "all") p.set("priority", filterPriority);
      if (filterCategory !== "all") p.set("category", filterCategory);
      return customFetch({ url: `/api/tickets?${p}` });
    },
  });

  const clientsQ = useQuery<{ data: ClientSearchItem[] }>({
    queryKey: ["clients-search-ticket", clientSearch],
    queryFn: () => {
      const p = new URLSearchParams({ limit: "10" });
      if (clientSearch) p.set("search", clientSearch);
      return customFetch({ url: `/api/clients?${p}` });
    },
    enabled: newOpen,
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => customFetch({ url: "/api/tickets", method: "POST", data: body }),
    onSuccess: () => {
      toast({ title: "Ticket created", description: "New support ticket has been opened." });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket-stats"] });
      handleCloseNew();
    },
    onError: () => toast({ title: "Error", description: "Failed to create ticket.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      customFetch({ url: `/api/tickets/${id}`, method: "PATCH", data: body }),
    onSuccess: (data) => {
      toast({ title: "Ticket updated" });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket-stats"] });
      setDetailTicket((prev) => prev ? { ...prev, ...data } : null);
      setUpdateStatus("");
      setUpdateNote("");
    },
    onError: () => toast({ title: "Error", description: "Update failed.", variant: "destructive" }),
  });

  const handleCloseNew = useCallback(() => {
    setNewOpen(false);
    setClientSearch("");
    setSelectedClient(null);
    setSubject("");
    setDescription("");
    setCategory("connection");
    setPriority("medium");
    setNewNote("");
  }, []);

  const handleCreate = () => {
    if (!subject.trim()) { toast({ title: "Subject required", variant: "destructive" }); return; }
    createMutation.mutate({
      clientId: selectedClient?.id ?? null,
      subject,
      description,
      category,
      priority,
      note: newNote || undefined,
    });
  };

  const handleStatusUpdate = () => {
    if (!detailTicket) return;
    const body: Record<string, string> = {};
    if (updateStatus && updateStatus !== detailTicket.status) body.status = updateStatus;
    if (updateNote.trim()) body.note = updateNote.trim();
    if (!Object.keys(body).length) return;
    updateMutation.mutate({ id: detailTicket.id, body });
  };

  const stats = statsQ.data;
  const tickets = ticketsQ.data?.data ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-sky-500" />
            Support & Ticket
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage client support tickets</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="bg-sky-600 hover:bg-sky-700 text-white h-9 gap-2 text-sm">
          <Plus className="w-4 h-4" />
          New Ticket
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: "total",       label: "Total",       icon: Ticket,       color: "text-slate-500",  bg: "bg-slate-100" },
          { key: "open",        label: "Open",        icon: AlertCircle,  color: "text-sky-500",    bg: "bg-sky-50" },
          { key: "in_progress", label: "In Progress", icon: Clock,        color: "text-amber-500",  bg: "bg-amber-50" },
          { key: "resolved",    label: "Resolved",    icon: CheckCircle2, color: "text-emerald-500",bg: "bg-emerald-50" },
          { key: "closed",      label: "Closed",      icon: XCircle,      color: "text-slate-400",  bg: "bg-slate-100" },
        ].map(({ key, label, icon: Icon, color, bg }) => (
          <Card key={key} className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                  {statsQ.isLoading
                    ? <Skeleton className="h-7 w-10 mt-1 bg-slate-100" />
                    : <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.[key as keyof TicketStats] ?? 0}</p>
                  }
                </div>
                <div className={`p-2 rounded-lg ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search tickets, clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-sky-500"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-[130px] text-xs bg-slate-50 border-slate-200">
                <Filter className="w-3 h-3 mr-1 text-slate-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-8 w-[130px] text-xs bg-slate-50 border-slate-200">
                <ArrowUpDown className="w-3 h-3 mr-1 text-slate-400" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 w-[130px] text-xs bg-slate-50 border-slate-200">
                <Tag className="w-3 h-3 mr-1 text-slate-400" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="connection">Connection</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
              onClick={() => qc.invalidateQueries({ queryKey: ["tickets"] })}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Table */}
      <Card className="bg-white border-slate-200">
        <CardHeader className="px-4 py-3 border-b border-slate-200">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-500" />
            Tickets
            <span className="text-slate-400 font-normal text-xs ml-1">
              ({ticketsQ.data?.total ?? 0} total)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ticketsQ.isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 bg-slate-100 rounded" />)}
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Ticket className="w-10 h-10 mb-3 text-slate-200" />
              <p className="text-sm font-medium">No tickets found</p>
              <p className="text-xs mt-1">Create a new ticket to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left text-slate-400 font-medium px-4 py-2.5 w-28">Ticket #</th>
                    <th className="text-left text-slate-400 font-medium px-3 py-2.5">Subject</th>
                    <th className="text-left text-slate-400 font-medium px-3 py-2.5 hidden sm:table-cell">Client</th>
                    <th className="text-left text-slate-400 font-medium px-3 py-2.5 hidden md:table-cell">Category</th>
                    <th className="text-left text-slate-400 font-medium px-3 py-2.5">Priority</th>
                    <th className="text-left text-slate-400 font-medium px-3 py-2.5">Status</th>
                    <th className="text-left text-slate-400 font-medium px-3 py-2.5 hidden lg:table-cell">Created</th>
                    <th className="text-right text-slate-400 font-medium px-4 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sky-600 font-medium">{t.ticketNo}</span>
                      </td>
                      <td className="px-3 py-3 max-w-[200px]">
                        <p className="text-slate-800 font-medium truncate">{t.subject}</p>
                        {t.description && (
                          <p className="text-slate-400 truncate mt-0.5 text-[11px]">{t.description}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        {t.clientFullName ? (
                          <div>
                            <p className="text-slate-700 font-medium">{t.clientFullName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {t.clientStatus && (
                                <span className={`text-[10px] font-medium ${t.clientStatus === "Active" ? "text-emerald-500" : "text-red-400"}`}>
                                  {t.clientStatus}
                                </span>
                              )}
                              {t.clientIsOnline !== null && (
                                <>
                                  <span className="text-slate-200">·</span>
                                  <span className={`text-[10px] font-medium ${t.clientIsOnline ? "text-cyan-500" : "text-slate-400"}`}>
                                    {t.clientIsOnline ? "Online" : "Offline"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic">No client</span>
                        )}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                          {CATEGORY_LABELS[t.category] ?? t.category}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell text-slate-400">
                        {timeAgo(t.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-slate-400 hover:text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => { setDetailTicket(t); setUpdateStatus(t.status); setUpdateNote(t.note ?? ""); }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── New Ticket Dialog ─── */}
      <Dialog open={newOpen} onOpenChange={(o) => { if (!o) handleCloseNew(); else setNewOpen(true); }}>
        <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Plus className="w-4 h-4 text-sky-500" /> Open New Ticket
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1 max-h-[70vh] overflow-y-auto pr-1">
            {/* Client Search */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                Client <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search by name, username, phone..."
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); }}
                  className="pl-8 h-9 text-sm bg-slate-50 border-slate-200"
                />
              </div>

              {/* Client dropdown */}
              {!selectedClient && clientSearch.length >= 1 && (
                <div className="border border-slate-200 rounded-lg mt-1 overflow-hidden shadow-sm bg-white max-h-52 overflow-y-auto">
                  {clientsQ.isLoading ? (
                    <div className="p-3 text-xs text-slate-400 text-center">Searching...</div>
                  ) : (clientsQ.data?.data ?? []).length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">No clients found</div>
                  ) : (
                    (clientsQ.data?.data ?? []).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedClient(c); setClientSearch(c.fullName); }}
                        className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-sky-50 text-left transition-colors border-b border-slate-100 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{c.fullName}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {c.phone && <span className="text-[11px] text-slate-400 flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{c.phone}</span>}
                            {c.username && <span className="text-[11px] text-slate-400">@{c.username}</span>}
                          </div>
                        </div>
                        <ClientStatusChip status={c.status} isOnline={c.isOnline} />
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Selected Client Info Card */}
              {selectedClient && (
                <div className="mt-2 border border-sky-200 bg-sky-50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{selectedClient.fullName}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {selectedClient.phone && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />{selectedClient.phone}
                          </span>
                        )}
                        {selectedClient.zoneName && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{selectedClient.zoneName}
                          </span>
                        )}
                        {selectedClient.packageName && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Package className="w-3 h-3" />{selectedClient.packageName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <ClientStatusChip status={selectedClient.status} isOnline={selectedClient.isOnline} />
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                    className="text-[10px] text-sky-500 hover:text-sky-700 mt-2 underline-offset-2 hover:underline"
                  >
                    Change client
                  </button>
                </div>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Subject <span className="text-red-400">*</span></label>
              <Input
                placeholder="Brief description of the issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-9 text-sm bg-slate-50 border-slate-200"
              />
            </div>

            {/* Category + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Category</label>
                <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                  <SelectTrigger className="h-9 text-sm bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connection">Connection</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Priority</label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                  <SelectTrigger className="h-9 text-sm bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</label>
              <textarea
                placeholder="Detailed description of the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
              />
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                Internal Note <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Input
                placeholder="Staff-only note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="h-9 text-sm bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseNew} className="border-slate-200 text-slate-600 hover:bg-slate-50 h-9">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-sky-600 hover:bg-sky-700 text-white h-9 gap-2"
            >
              {createMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Open Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail / Update Dialog ─── */}
      <Dialog open={!!detailTicket} onOpenChange={(o) => { if (!o) { setDetailTicket(null); setUpdateStatus(""); setUpdateNote(""); } }}>
        {detailTicket && (
          <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Ticket className="w-4 h-4 text-sky-500" />
                {detailTicket.ticketNo}
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-500 font-normal text-sm truncate max-w-[200px]">{detailTicket.subject}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-1 max-h-[65vh] overflow-y-auto pr-1">
              {/* Status + Priority row */}
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={detailTicket.status} />
                <PriorityBadge priority={detailTicket.priority} />
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                  {CATEGORY_LABELS[detailTicket.category] ?? detailTicket.category}
                </span>
                <span className="text-xs text-slate-400 ml-auto">{timeAgo(detailTicket.createdAt)}</span>
              </div>

              {/* Client info */}
              {detailTicket.clientFullName && (
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Client</p>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{detailTicket.clientFullName}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {detailTicket.clientPhone && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />{detailTicket.clientPhone}
                          </span>
                        )}
                        {detailTicket.zoneName && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{detailTicket.zoneName}
                          </span>
                        )}
                      </div>
                    </div>
                    <ClientStatusChip status={detailTicket.clientStatus} isOnline={detailTicket.clientIsOnline} />
                  </div>
                </div>
              )}

              {/* Description */}
              {detailTicket.description && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-200 leading-relaxed">
                    {detailTicket.description}
                  </p>
                </div>
              )}

              {/* Existing note */}
              {detailTicket.note && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1">Internal Note</p>
                  <p className="text-xs text-amber-800">{detailTicket.note}</p>
                </div>
              )}

              {/* Update section */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <PenLine className="w-3.5 h-3.5" /> Update Ticket
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">Change Status</label>
                    <Select value={updateStatus} onValueChange={setUpdateStatus}>
                      <SelectTrigger className="h-9 text-sm bg-slate-50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 mb-1 block">Add / Replace Note</label>
                    <Input
                      placeholder="Update internal note..."
                      value={updateNote}
                      onChange={(e) => setUpdateNote(e.target.value)}
                      className="h-9 text-sm bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => { setDetailTicket(null); setUpdateStatus(""); setUpdateNote(""); }}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 h-9"
              >
                Close
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={updateMutation.isPending}
                className="bg-sky-600 hover:bg-sky-700 text-white h-9 gap-2"
              >
                {updateMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Save Update
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
