import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePermission } from "@/hooks/usePermission";
import {
  useListPackages,
  useCreatePackage,
  useListMikrotiks,
  getListPackagesQueryKey
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Layers, Plus, Edit2, RefreshCw, ChevronDown, Search, X, Loader2, Wifi
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type MkProfile = { name: string; rateLimit: string | null; mikrotikName: string };

const packageSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  price: z.string().min(1, "Price is required"),
  speed: z.string().optional(),
  description: z.string().optional(),
  mikrotikProfile: z.string().optional(),
});

type PackageFormValues = z.infer<typeof packageSchema>;

export default function Packages() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermission();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "reseller">("all");
  const [profiles, setProfiles] = useState<MkProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  const token = localStorage.getItem("isp_token") ?? "";
  const [selectedMikrotikId, setSelectedMikrotikId] = useState<number | null>(null);

  const { data: packages = [], isLoading } = useListPackages();
  const { data: mikrotikData } = useListMikrotiks();
  const mikrotiks = (mikrotikData as { mikrotiks?: Array<{ id: number; name: string; status: string }> })?.mikrotiks ?? [];
  const createPackage = useCreatePackage();

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: { name: "", price: "", speed: "", description: "", mikrotikProfile: "" },
  });

  async function fetchProfiles(mikrotikId?: number) {
    setProfilesLoading(true);
    setProfiles([]);
    try {
      const url = mikrotikId
        ? `/api/mikrotiks/profiles?mikrotikId=${mikrotikId}`
        : "/api/mikrotiks/profiles";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as { profiles: MkProfile[] };
        setProfiles(data.profiles ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setProfilesLoading(false);
    }
  }

  function handleMikrotikSelect(id: number | null) {
    setSelectedMikrotikId(id);
    form.setValue("mikrotikProfile", "");
    if (id) {
      fetchProfiles(id);
    } else {
      setProfiles([]);
    }
  }

  useEffect(() => {
    if (!isAddOpen) {
      setSelectedMikrotikId(null);
      setProfiles([]);
    }
  }, [isAddOpen]);

  const onSubmit = (values: PackageFormValues) => {
    createPackage.mutate(
      { data: { ...values, mikrotikProfile: values.mikrotikProfile || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
          toast({ title: "Package created successfully" });
          setIsAddOpen(false);
          form.reset();
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Unknown error";
          toast({ title: "Error creating package", description: msg, variant: "destructive" });
        }
      }
    );
  };

  const filtered = (packages as Array<{
    id: number; name: string; price: string; speed?: string | null;
    mikrotikProfile?: string | null; activeClients: number; inactiveClients: number; totalClients: number;
  }>).filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800">

      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold flex items-center gap-2 text-slate-900">
          <Layers className="w-4 h-4 text-slate-500" />
          Packages | Profiles
        </h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 border-slate-300 text-slate-600"
            onClick={() => queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() })}
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>
          {can("packages:create") && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-sky-500 hover:bg-sky-600 text-white"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              ADD
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-slate-300 text-slate-700">
                {viewMode === "all" ? "All Packages" : "Reseller"}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => setViewMode("all")} className="cursor-pointer">All Packages</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode("reseller")} className="cursor-pointer">Reseller</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3 relative w-64">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search packages..."
          className="h-8 text-xs pr-7 border-slate-200 bg-white"
        />
        <Search className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
      </div>

      {/* Table */}
      <Card className="flex-1 flex flex-col bg-white border-slate-200 rounded-sm overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-[#1e293b] text-white sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 w-10 text-slate-400 font-medium text-center">ID</th>
                <th className="px-3 py-2.5 font-semibold">Package Name</th>
                <th className="px-3 py-2.5 font-semibold">MikroTik Profile</th>
                <th className="px-3 py-2.5 text-center font-semibold text-cyan-300">Company Price</th>
                <th className="px-3 py-2.5 text-center font-semibold">Bandwidth</th>
                <th className="px-3 py-2.5 text-center font-semibold">Reseller Price</th>
                <th className="px-3 py-2.5 text-center font-semibold">Reseller Area</th>
                <th className="px-3 py-2.5 text-center font-semibold">On Signup?</th>
                <th className="px-3 py-2.5 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-3 py-2.5">
                        <Skeleton className="h-6 bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    No packages found.
                  </td>
                </tr>
              ) : (
                filtered.map((pkg, idx) => (
                  <tr key={pkg.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>

                    {/* Package Name + counts */}
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-slate-800 text-[12px]">{pkg.name}</div>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[10px] text-emerald-600 font-medium">Active: {pkg.activeClients}</span>
                        <span className="text-[10px] text-red-500 font-medium">Inactive: {pkg.inactiveClients}</span>
                        <span className="text-[10px] text-slate-500">Total: {pkg.totalClients}</span>
                      </div>
                    </td>

                    {/* MikroTik Profile */}
                    <td className="px-3 py-2.5">
                      {pkg.mikrotikProfile ? (
                        <div>
                          <div className="text-[11px] text-sky-700 font-semibold">{pkg.mikrotikProfile}</div>
                          <Badge className="bg-emerald-50 text-emerald-600 text-[10px] py-0 px-1.5 font-normal border border-emerald-200 rounded-sm hover:bg-emerald-50 mt-0.5">
                            Linked
                          </Badge>
                        </div>
                      ) : (
                        <div>
                          <div className="text-[11px] text-slate-400 italic">Not set</div>
                          <Badge className="bg-slate-100 text-slate-400 text-[10px] py-0 px-1.5 font-normal border border-slate-200 rounded-sm hover:bg-slate-100">
                            —
                          </Badge>
                        </div>
                      )}
                    </td>

                    {/* Company Price */}
                    <td className="px-3 py-2.5 text-center">
                      <span className="font-bold text-cyan-600 text-sm">
                        {pkg.price} ৳
                      </span>
                    </td>

                    {/* Bandwidth */}
                    <td className="px-3 py-2.5 text-center text-slate-600 text-[11px]">
                      {pkg.speed || '-'}
                    </td>

                    {/* Reseller Price */}
                    <td className="px-3 py-2.5 text-center text-slate-400 text-[11px]">
                      0.00 ৳
                    </td>

                    {/* Reseller Area */}
                    <td className="px-3 py-2.5 text-center text-slate-400 text-[11px]">
                      -
                    </td>

                    {/* On Signup? */}
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-[11px] text-slate-600 font-medium">Yes</span>
                    </td>

                    {/* Action */}
                    <td className="px-3 py-2.5 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 py-1.5 flex justify-between items-center text-[11px] text-slate-400 shrink-0 bg-white">
          <span>Showing 1 to {filtered.length} of {packages.length} entries</span>
        </div>
      </Card>

      {/* Add Package Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Layers className="w-4 h-4 text-sky-500" />
                Add New Packages
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MikroTik Selector Bar */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                <Wifi className="w-3.5 h-3.5 text-sky-500" />
                Select MikroTik:
              </div>
              <select
                className="h-8 border border-slate-300 rounded text-xs text-slate-700 bg-white px-2 focus:outline-none focus:ring-1 focus:ring-sky-400 min-w-[200px]"
                value={selectedMikrotikId ?? ""}
                onChange={(e) => handleMikrotikSelect(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">— Select a MikroTik —</option>
                {mikrotiks.map((mk) => (
                  <option key={mk.id} value={mk.id}>
                    {mk.name}
                    {mk.status === "connected" ? " ✓" : " (disconnected)"}
                  </option>
                ))}
              </select>
              {selectedMikrotikId && (
                <button
                  type="button"
                  onClick={() => fetchProfiles(selectedMikrotikId)}
                  className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
                  disabled={profilesLoading}
                >
                  {profilesLoading
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <RefreshCw className="w-3 h-3" />}
                  {profilesLoading ? "Syncing..." : "Sync Profiles"}
                </button>
              )}
              {selectedMikrotikId && !profilesLoading && profiles.length > 0 && (
                <span className="text-[11px] text-emerald-600 font-medium">
                  {profiles.length} profile{profiles.length !== 1 ? "s" : ""} loaded
                </span>
              )}
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="overflow-auto max-h-[65vh]">
                <table className="w-full text-xs">
                  <thead className="bg-[#1e293b] text-white">
                    <tr>
                      <th className="px-4 py-2.5 text-center text-slate-400 font-medium w-10">S/E</th>
                      <th className="px-4 py-2.5 text-center font-semibold">
                        <div className="flex items-center justify-center gap-1">
                          MIKROTIK PROFILE
                          {profilesLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                        </div>
                      </th>
                      <th className="px-4 py-2.5 font-semibold">PACKAGE NAME</th>
                      <th className="px-4 py-2.5 text-center font-semibold">BANDWIDTH</th>
                      <th className="px-4 py-2.5 text-center font-semibold">PRICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Row 1 — active / bound to form */}
                    <tr className="border-b border-slate-100 bg-white">
                      <td className="px-4 py-2.5 text-center text-slate-500 font-medium">1</td>
                      <td className="px-4 py-2.5">
                        <select
                          className="w-full h-8 border border-slate-200 rounded text-xs text-slate-700 bg-white px-2 focus:outline-none focus:ring-1 focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed"
                          {...form.register("mikrotikProfile")}
                          disabled={!selectedMikrotikId || profilesLoading}
                        >
                          <option value="">
                            {!selectedMikrotikId
                              ? "← Select a MikroTik first"
                              : profilesLoading
                              ? "Syncing profiles..."
                              : profiles.length === 0
                              ? "No profiles found"
                              : "Choose Profile"}
                          </option>
                          {profiles.map((p) => (
                            <option key={p.name} value={p.name}>
                              {p.name}
                              {p.rateLimit ? ` (${p.rateLimit})` : ""}
                            </option>
                          ))}
                        </select>
                        {profiles.length > 0 && (
                          <p className="text-[10px] text-emerald-600 mt-0.5">
                            ✓ {profiles.length} profile{profiles.length !== 1 ? "s" : ""} synced
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          placeholder="Package Name"
                          className="h-8 text-xs bg-white border-slate-200"
                          {...form.register("name")}
                        />
                        {form.formState.errors.name && (
                          <p className="text-red-500 text-[10px] mt-0.5">{form.formState.errors.name.message}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          placeholder="2.5 mbps"
                          className="h-8 text-xs bg-white border-slate-200 text-center"
                          {...form.register("speed")}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            placeholder="260"
                            className="h-8 text-xs bg-white border-slate-200 text-center"
                            {...form.register("price")}
                          />
                          <span className="text-slate-500 font-bold text-sm">৳</span>
                        </div>
                        {form.formState.errors.price && (
                          <p className="text-red-500 text-[10px] mt-0.5">{form.formState.errors.price.message}</p>
                        )}
                      </td>
                    </tr>

                    {/* Rows 2–10 — placeholder / disabled */}
                    {Array.from({ length: 9 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100 bg-slate-50/40">
                        <td className="px-4 py-2 text-center text-slate-400">{i + 2}</td>
                        <td className="px-4 py-2">
                          <select className="w-full h-7 border border-slate-200 rounded text-xs text-slate-400 bg-white px-2 focus:outline-none" disabled>
                            <option>Choose Profile</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <Input placeholder="Package Name" className="h-7 text-xs bg-white border-slate-200" disabled />
                        </td>
                        <td className="px-4 py-2">
                          <Input placeholder="2.5 mbps" className="h-7 text-xs bg-white border-slate-200 text-center" disabled />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <Input placeholder="260" className="h-7 text-xs bg-white border-slate-200 text-center" disabled />
                            <span className="text-slate-400 font-bold text-sm">৳</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-slate-300 text-slate-600 font-semibold px-5"
                  onClick={() => { form.reset(); setIsAddOpen(false); }}
                >
                  RESET
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-sky-500 hover:bg-sky-600 text-white font-semibold px-5"
                  disabled={createPackage.isPending}
                >
                  {createPackage.isPending ? "Saving..." : "SUBMIT"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
