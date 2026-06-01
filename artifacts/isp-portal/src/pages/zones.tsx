import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePermission } from "@/hooks/usePermission";
import {
  useListZones,
  useCreateZone,
  useListClients,
  getListZonesQueryKey
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const zoneSchema = z.object({
  name: z.string().min(1, "Zone name is required"),
  description: z.string().optional(),
});

type ZoneFormValues = z.infer<typeof zoneSchema>;

export default function Zones() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermission();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: zones = [], isLoading: isZonesLoading } = useListZones();
  const { data: clientsData } = useListClients({ limit: 10000 }); // fetch enough to count clients
  const clients = clientsData?.data || [];

  const createZone = useCreateZone();

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const clientCountByZone = useMemo(() => {
    const counts: Record<number, number> = {};
    clients.forEach(c => {
      if (c.zoneId) {
        counts[c.zoneId] = (counts[c.zoneId] || 0) + 1;
      }
    });
    return counts;
  }, [clients]);

  const onSubmit = (values: ZoneFormValues) => {
    createZone.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListZonesQueryKey() });
          toast({ title: "Zone created successfully" });
          setIsModalOpen(false);
          form.reset();
        },
        onError: (err: any) => {
          toast({ title: "Error creating zone", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
          <MapPin className="w-5 h-5 text-sky-500" />
          Zones
        </h2>
        {can("zones.create") && (
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-sky-500 hover:bg-sky-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Add Zone
          </Button>
        )}
      </div>

      <Card className="flex-1 bg-white border-slate-200 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3">Zone Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-center">Clients</th>
                <th className="px-4 py-3">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isZonesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-12 mx-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                  </tr>
                ))
              ) : zones.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No zones found.
                  </td>
                </tr>
              ) : (
                zones.map((zone) => (
                  <tr key={zone.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{zone.name}</td>
                    <td className="px-4 py-3 text-slate-600">{zone.description || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-sky-700 bg-sky-100 rounded-full">
                        {clientCountByZone[zone.id] || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {format(new Date(zone.createdAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Zone</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Zone Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Uttara Sector 4" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Optional details..." className="resize-none" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white">Save Zone</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
