import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRoles,
  useListPermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  getListRolesQueryKey,
} from "@workspace/api-client-react";
import { usePermission } from "@/hooks/usePermission";
import { ShieldCheck, Plus, Trash2, Edit, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const MODULES = [
  { key: "dashboard", label: "Dashboard",       actions: ["view"] },
  { key: "clients",   label: "Clients",         actions: ["view", "create", "edit", "delete"] },
  { key: "billing",   label: "Billing",         actions: ["view", "collect"] },
  { key: "payments",  label: "Online Payments", actions: ["view"] },
  { key: "reports",   label: "Reports",         actions: ["view"] },
  { key: "zones",     label: "Zones",           actions: ["view", "create", "edit", "delete"] },
  { key: "packages",  label: "Packages",        actions: ["view", "create", "edit", "delete"] },
  { key: "users",     label: "Users",           actions: ["view", "create", "edit", "delete"] },
  { key: "roles",     label: "Roles",           actions: ["view", "create", "edit", "delete"] },
  { key: "network",   label: "Network",         actions: ["view", "edit"] },
  { key: "settings",  label: "Settings",        actions: ["view", "edit"] },
];

type RoleWithPerms = {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  permissions: { id: number; name: string; module: string; action: string; description?: string | null }[];
};

function RoleModal({
  role,
  allPermissions,
  onClose,
  onSuccess,
}: {
  role: RoleWithPerms | null;
  allPermissions: { id: number; name: string; module: string; action: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(role?.permissions.map((p) => p.id) ?? [])
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleModule = (moduleKey: string) => {
    const modulePerms = allPermissions.filter((p) => p.module === moduleKey);
    const allSelected = modulePerms.every((p) => selectedIds.has(p.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      modulePerms.forEach((p) => (allSelected ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(allPermissions.map((p) => p.id)));
  const clearAll = () => setSelectedIds(new Set());

  const onSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Role name is required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        permissionIds: Array.from(selectedIds),
      };
      if (role) {
        await updateRole.mutateAsync({ id: role.id, data: payload });
        toast({ title: "Role updated" });
      } else {
        await createRole.mutateAsync({ data: payload });
        toast({ title: "Role created" });
      }
      onSuccess();
    } catch {
      toast({ title: "Failed to save role", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white border-slate-200 max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-500" />
            {role ? `Edit Role: ${role.name}` : "Create New Role"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Name & Description */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-slate-700">Role Name <span className="text-red-500">*</span></Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Billing Manager"
                className="h-8 bg-white border-slate-200 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-slate-700">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description..."
                className="h-8 bg-white border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Permission Matrix */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Permissions</Label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[10px] text-sky-500 hover:underline">Select All</button>
                <span className="text-slate-300 text-[10px]">|</span>
                <button onClick={clearAll} className="text-[10px] text-slate-400 hover:underline">Clear All</button>
              </div>
            </div>

            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-500 font-semibold w-36">Module</th>
                    <th className="px-3 py-2 text-center text-slate-500 font-semibold">View</th>
                    <th className="px-3 py-2 text-center text-slate-500 font-semibold">Create</th>
                    <th className="px-3 py-2 text-center text-slate-500 font-semibold">Edit</th>
                    <th className="px-3 py-2 text-center text-slate-500 font-semibold">Delete</th>
                    <th className="px-3 py-2 text-center text-slate-500 font-semibold">Other</th>
                    <th className="px-3 py-2 text-center text-slate-500 font-semibold w-16">All</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MODULES.map((mod) => {
                    const modPerms = allPermissions.filter((p) => p.module === mod.key);
                    const allSelected = modPerms.length > 0 && modPerms.every((p) => selectedIds.has(p.id));
                    const someSelected = modPerms.some((p) => selectedIds.has(p.id));

                    const getPermId = (action: string) =>
                      allPermissions.find((p) => p.module === mod.key && p.action === action)?.id;

                    const standardActions = ["view", "create", "edit", "delete"];
                    const otherActions = mod.actions.filter((a) => !standardActions.includes(a));

                    return (
                      <tr key={mod.key} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-700">{mod.label}</td>
                        {["view", "create", "edit", "delete"].map((action) => {
                          const pid = getPermId(action);
                          const hasAction = mod.actions.includes(action);
                          return (
                            <td key={action} className="px-3 py-2 text-center">
                              {hasAction && pid ? (
                                <Checkbox
                                  checked={selectedIds.has(pid)}
                                  onCheckedChange={() => toggle(pid)}
                                  className="border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                                />
                              ) : (
                                <span className="text-slate-200">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center">
                          {otherActions.length > 0 ? (
                            <div className="flex flex-col gap-1 items-center">
                              {otherActions.map((action) => {
                                const pid = getPermId(action);
                                return pid ? (
                                  <div key={action} className="flex items-center gap-1">
                                    <Checkbox
                                      checked={selectedIds.has(pid)}
                                      onCheckedChange={() => toggle(pid)}
                                      className="border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                                    />
                                    <span className="text-[10px] text-slate-500 capitalize">{action}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-200">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Checkbox
                            checked={allSelected}
                            data-state={someSelected && !allSelected ? "indeterminate" : undefined}
                            onCheckedChange={() => toggleModule(mod.key)}
                            className="border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-400">
              {selectedIds.size} of {allPermissions.length} permissions selected
            </p>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-slate-100 flex flex-row gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 bg-white border-slate-200 text-slate-700 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={isSaving}
            onClick={onSubmit}
            className="h-8 bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium"
          >
            {isSaving ? "Saving..." : (
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {role ? "Save Changes" : "Create Role"}
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Roles() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermission();

  const { data: roles = [], isLoading } = useListRoles();
  const { data: allPermissions = [] } = useListPermissions();
  const deleteRole = useDeleteRole();

  const [modalRole, setModalRole] = useState<RoleWithPerms | null | "new">(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getListRolesQueryKey() });
    setModalRole(null);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete role "${name}"? Users with this role will lose their permissions.`)) return;
    try {
      await deleteRole.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListRolesQueryKey() });
      toast({ title: "Role deleted" });
    } catch {
      toast({ title: "Cannot delete role — it may be assigned to users", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800">
      {modalRole && (
        <RoleModal
          role={modalRole === "new" ? null : modalRole as RoleWithPerms}
          allPermissions={allPermissions as { id: number; name: string; module: string; action: string }[]}
          onClose={() => setModalRole(null)}
          onSuccess={handleSuccess}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
          <ShieldCheck className="w-5 h-5 text-sky-500" />
          Roles & Permissions
        </h2>
        {can("roles.create") && (
          <Button size="sm" onClick={() => setModalRole("new")} className="bg-sky-500 hover:bg-sky-600 text-white h-8 text-xs">
            <Plus className="w-4 h-4 mr-1" /> New Role
          </Button>
        )}
      </div>

      <Card className="bg-white border-slate-200 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-3 w-6"></th>
                <th className="px-4 py-3">Role Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Permissions</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-5 bg-slate-100" /></td>
                    ))}
                  </tr>
                ))
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No roles yet. Create your first role to get started.
                  </td>
                </tr>
              ) : (
                (roles as RoleWithPerms[]).map((role) => {
                  const isExpanded = expandedId === role.id;
                  const grouped = MODULES.map((mod) => ({
                    ...mod,
                    perms: role.permissions.filter((p) => p.module === mod.key),
                  })).filter((m) => m.perms.length > 0);

                  return (
                    <>
                      <tr key={role.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : role.id)}>
                        <td className="px-4 py-3 text-slate-400">
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{role.name}</td>
                        <td className="px-4 py-3 text-slate-500">{role.description || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge className="bg-sky-50 text-sky-600 border border-sky-200 text-[10px] px-2 py-0">
                            {role.permissions.length} permissions
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(role.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {can("roles.edit") && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                                onClick={() => setModalRole(role)}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {can("roles.delete") && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDelete(role.id, role.name)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${role.id}-detail`} className="bg-slate-50/70">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="flex flex-wrap gap-3">
                              {grouped.map((mod) => (
                                <div key={mod.key} className="flex flex-col gap-1">
                                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{mod.label}</span>
                                  <div className="flex flex-wrap gap-1">
                                    {mod.perms.map((p) => (
                                      <Badge key={p.id} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-1.5 py-0 capitalize font-normal">
                                        {p.action}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              {grouped.length === 0 && (
                                <span className="text-xs text-slate-400">No permissions assigned</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Permission Legend */}
      <div className="mt-4 p-3 bg-white border border-slate-200 rounded-md text-xs text-slate-500">
        <p className="font-semibold text-slate-700 mb-2">Available Permissions ({allPermissions.length} total)</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {MODULES.map((mod) => (
            <div key={mod.key} className="flex items-center gap-1">
              <span className="font-medium text-slate-600">{mod.label}:</span>
              <span>{mod.actions.join(", ")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
