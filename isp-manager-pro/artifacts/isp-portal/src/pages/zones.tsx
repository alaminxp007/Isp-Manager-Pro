import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetZoneTree,
  useCreateDistrict,
  useDeleteDistrict,
  useCreateThana,
  useDeleteThana,
  useCreateZone,
  useDeleteZone,
  useCreateSubZone,
  useDeleteSubZone,
  useCreateTjBox,
  useDeleteTjBox,
  getGetZoneTreeQueryKey,
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  MapPin, Plus, ChevronRight, ChevronDown, Building2, Landmark,
  Map, Layers, Box, Trash2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalType =
  | { type: "district" }
  | { type: "thana"; districtId: number; districtName: string }
  | { type: "zone"; thanaId: number; thanaName: string }
  | { type: "subZone"; zoneId: number; zoneName: string }
  | { type: "tjBox"; subZoneId: number; subZoneName: string };

// ─── Level config ─────────────────────────────────────────────────────────────

const LEVEL = {
  district: { label: "District", icon: Building2, color: "violet", bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700", icon_color: "text-violet-500", btn: "bg-violet-500 hover:bg-violet-600" },
  thana:    { label: "Thana",    icon: Landmark,  color: "blue",   bg: "bg-blue-50",   border: "border-blue-200",   badge: "bg-blue-100 text-blue-700",   icon_color: "text-blue-500",   btn: "bg-blue-500 hover:bg-blue-600" },
  zone:     { label: "Zone",     icon: Map,       color: "green",  bg: "bg-green-50",  border: "border-green-200",  badge: "bg-green-100 text-green-700", icon_color: "text-green-500",  btn: "bg-green-500 hover:bg-green-600" },
  subZone:  { label: "Sub Zone", icon: Layers,    color: "orange", bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700",icon_color: "text-orange-500", btn: "bg-orange-500 hover:bg-orange-600" },
  tjBox:    { label: "TJ/Box",   icon: Box,       color: "red",    bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-100 text-red-700",     icon_color: "text-red-500",    btn: "bg-red-500 hover:bg-red-600" },
};

// ─── Form schema ──────────────────────────────────────────────────────────────

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
type ItemForm = z.infer<typeof itemSchema>;

// ─── Delete button ────────────────────────────────────────────────────────────

function DeleteBtn({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{label}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete it and all its children. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Zones() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<ModalType | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: tree = [], isLoading } = useGetZoneTree();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetZoneTreeQueryKey() });

  const createDistrict = useCreateDistrict();
  const deleteDistrict = useDeleteDistrict();
  const createThana    = useCreateThana();
  const deleteThana    = useDeleteThana();
  const createZone     = useCreateZone();
  const deleteZone     = useDeleteZone();
  const createSubZone  = useCreateSubZone();
  const deleteSubZone  = useDeleteSubZone();
  const createTjBox    = useCreateTjBox();
  const deleteTjBox    = useDeleteTjBox();

  const form = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: "", description: "" },
  });

  const toggle = (key: string) =>
    setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const openModal = (m: ModalType) => {
    form.reset({ name: "", description: "" });
    setModal(m);
  };

  const isMutating =
    createDistrict.isPending || createThana.isPending || createZone.isPending ||
    createSubZone.isPending || createTjBox.isPending;

  const onSubmit = (values: ItemForm) => {
    if (!modal) return;
    const onSuccess = () => {
      invalidate();
      toast({ title: `${LEVEL[modal.type].label} added successfully` });
      setModal(null);
    };
    const onError = (err: any) =>
      toast({ title: "Error", description: err?.message ?? "Something went wrong", variant: "destructive" });

    if (modal.type === "district") {
      createDistrict.mutate({ data: values }, { onSuccess, onError });
    } else if (modal.type === "thana") {
      createThana.mutate({ data: { ...values, districtId: modal.districtId } }, { onSuccess, onError });
    } else if (modal.type === "zone") {
      createZone.mutate({ data: { ...values, thanaId: modal.thanaId } }, { onSuccess, onError });
    } else if (modal.type === "subZone") {
      createSubZone.mutate({ data: { ...values, zoneId: modal.zoneId } }, { onSuccess, onError });
    } else if (modal.type === "tjBox") {
      createTjBox.mutate({ data: { ...values, subZoneId: modal.subZoneId } }, { onSuccess, onError });
    }
  };

  const modalTitle = modal ? `Add ${LEVEL[modal.type].label}` : "";
  const modalParent = modal && modal.type !== "district"
    ? modal.type === "thana" ? modal.districtName
    : modal.type === "zone" ? modal.thanaName
    : modal.type === "subZone" ? modal.zoneName
    : (modal as any).subZoneName
    : null;

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
          <MapPin className="w-5 h-5 text-sky-500" />
          Zone Management
        </h2>
        <Button
          size="sm"
          onClick={() => openModal({ type: "district" })}
          className="bg-violet-500 hover:bg-violet-600 text-white"
        >
          <Plus className="w-4 h-4 mr-1" /> Add District
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
        {(["district", "thana", "zone", "subZone", "tjBox"] as const).map((k) => {
          const cfg = LEVEL[k];
          const Icon = cfg.icon;
          return (
            <span key={k} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
              <Icon className="w-3 h-3" /> {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <MapPin className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No districts yet</p>
            <p className="text-xs mt-1">Click "Add District" to get started</p>
          </div>
        ) : (
          tree.map((district) => {
            const dKey = `d-${district.id}`;
            const dOpen = expanded[dKey] !== false; // open by default
            return (
              <div key={district.id} className="rounded-lg border border-violet-200 bg-white shadow-sm overflow-hidden">
                {/* District row */}
                <div className={`flex items-center gap-2 px-3 py-2.5 bg-violet-50 group`}>
                  <button onClick={() => toggle(dKey)} className="text-violet-400 hover:text-violet-600">
                    {dOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <Building2 className="w-4 h-4 text-violet-500 flex-shrink-0" />
                  <span className="font-semibold text-violet-800 text-sm flex-1">{district.name}</span>
                  <span className="text-xs text-violet-500 mr-2">{district.thanas.length} thana{district.thanas.length !== 1 ? "s" : ""}</span>
                  <button
                    onClick={() => openModal({ type: "thana", districtId: district.id, districtName: district.name })}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 bg-violet-100 hover:bg-violet-200 px-2 py-0.5 rounded-full mr-1"
                  >
                    <Plus className="w-3 h-3" /> Thana
                  </button>
                  <DeleteBtn label={district.name} onDelete={() => deleteDistrict.mutate({ id: district.id }, { onSuccess: invalidate })} />
                </div>

                {dOpen && (
                  <div className="pl-4">
                    {district.thanas.length === 0 ? (
                      <div className="px-4 py-2 text-xs text-slate-400 italic">No thanas — hover and click "+ Thana" above</div>
                    ) : (
                      district.thanas.map((thana) => {
                        const tKey = `t-${thana.id}`;
                        const tOpen = expanded[tKey] !== false;
                        return (
                          <div key={thana.id} className="border-l-2 border-blue-200 ml-2 mb-1">
                            {/* Thana row */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 group rounded-r-md">
                              <button onClick={() => toggle(tKey)} className="text-blue-400 hover:text-blue-600">
                                {tOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                              <Landmark className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              <span className="font-medium text-blue-800 text-sm flex-1">{thana.name}</span>
                              <span className="text-xs text-blue-500 mr-2">{thana.zones.length} zone{thana.zones.length !== 1 ? "s" : ""}</span>
                              <button
                                onClick={() => openModal({ type: "zone", thanaId: thana.id, thanaName: thana.name })}
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded-full mr-1"
                              >
                                <Plus className="w-3 h-3" /> Zone
                              </button>
                              <DeleteBtn label={thana.name} onDelete={() => deleteThana.mutate({ id: thana.id }, { onSuccess: invalidate })} />
                            </div>

                            {tOpen && (
                              <div className="pl-4">
                                {thana.zones.length === 0 ? (
                                  <div className="px-4 py-1.5 text-xs text-slate-400 italic">No zones</div>
                                ) : (
                                  thana.zones.map((zone) => {
                                    const zKey = `z-${zone.id}`;
                                    const zOpen = expanded[zKey] !== false;
                                    return (
                                      <div key={zone.id} className="border-l-2 border-green-200 ml-2 mb-1">
                                        {/* Zone row */}
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 group rounded-r-md">
                                          <button onClick={() => toggle(zKey)} className="text-green-400 hover:text-green-600">
                                            {zOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                          </button>
                                          <Map className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                          <span className="font-medium text-green-800 text-sm flex-1">{zone.name}</span>
                                          <span className="text-xs text-green-500 mr-2">{zone.subZones.length} sub{zone.subZones.length !== 1 ? "s" : ""}</span>
                                          <button
                                            onClick={() => openModal({ type: "subZone", zoneId: zone.id, zoneName: zone.name })}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-green-600 hover:text-green-800 bg-green-100 hover:bg-green-200 px-2 py-0.5 rounded-full mr-1"
                                          >
                                            <Plus className="w-3 h-3" /> Sub Zone
                                          </button>
                                          <DeleteBtn label={zone.name} onDelete={() => deleteZone.mutate({ id: zone.id }, { onSuccess: invalidate })} />
                                        </div>

                                        {zOpen && (
                                          <div className="pl-4">
                                            {zone.subZones.length === 0 ? (
                                              <div className="px-4 py-1.5 text-xs text-slate-400 italic">No sub zones</div>
                                            ) : (
                                              zone.subZones.map((sub) => {
                                                const sKey = `s-${sub.id}`;
                                                const sOpen = expanded[sKey] !== false;
                                                return (
                                                  <div key={sub.id} className="border-l-2 border-orange-200 ml-2 mb-1">
                                                    {/* Sub Zone row */}
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 group rounded-r-md">
                                                      <button onClick={() => toggle(sKey)} className="text-orange-400 hover:text-orange-600">
                                                        {sOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                      </button>
                                                      <Layers className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                                                      <span className="font-medium text-orange-800 text-sm flex-1">{sub.name}</span>
                                                      <span className="text-xs text-orange-500 mr-2">{sub.tjBoxes.length} box{sub.tjBoxes.length !== 1 ? "es" : ""}</span>
                                                      <button
                                                        onClick={() => openModal({ type: "tjBox", subZoneId: sub.id, subZoneName: sub.name })}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-2 py-0.5 rounded-full mr-1"
                                                      >
                                                        <Plus className="w-3 h-3" /> TJ/Box
                                                      </button>
                                                      <DeleteBtn label={sub.name} onDelete={() => deleteSubZone.mutate({ id: sub.id }, { onSuccess: invalidate })} />
                                                    </div>

                                                    {sOpen && (
                                                      <div className="pl-4">
                                                        {sub.tjBoxes.length === 0 ? (
                                                          <div className="px-4 py-1.5 text-xs text-slate-400 italic">No TJ/Boxes</div>
                                                        ) : (
                                                          sub.tjBoxes.map((box) => (
                                                            <div key={box.id} className="border-l-2 border-red-200 ml-2 mb-0.5">
                                                              {/* TJ/Box row */}
                                                              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 group rounded-r-md">
                                                                <Box className="w-3.5 h-3.5 text-red-400 flex-shrink-0 ml-1" />
                                                                <span className="text-red-800 text-sm flex-1">{box.name}</span>
                                                                {box.description && (
                                                                  <span className="text-xs text-red-400 mr-2 truncate max-w-[120px]">{box.description}</span>
                                                                )}
                                                                <DeleteBtn label={box.name} onDelete={() => deleteTjBox.mutate({ id: box.id }, { onSuccess: invalidate })} />
                                                              </div>
                                                            </div>
                                                          ))
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modal && (() => { const cfg = LEVEL[modal.type]; const Icon = cfg.icon; return <Icon className={`w-5 h-5 ${cfg.icon_color}`} />; })()}
              {modalTitle}
              {modalParent && <span className="text-slate-400 font-normal text-sm">→ {modalParent}</span>}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder={`Enter ${modal ? LEVEL[modal.type].label.toLowerCase() : ""} name`} {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-slate-400 font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes..." className="resize-none" rows={2} {...field} />
                  </FormControl>
                </FormItem>
              )} />
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setModal(null)}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={isMutating}
                  className={modal ? `${LEVEL[modal.type].btn} text-white` : ""}
                >
                  {isMutating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
