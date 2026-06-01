import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, getListDepartmentsQueryKey } from "@workspace/api-client-react";
import { Building2, Plus, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Departments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [search, setSearch] = useState("");

  const { data: departments = [], isLoading } = useListDepartments();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const filtered = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setEditingId(null);
    setForm({ name: "", description: "" });
    setIsModalOpen(true);
  }

  function openEdit(d: { id: number; name: string; description: string | null }) {
    setEditingId(d.id);
    setForm({ name: d.name, description: d.description ?? "" });
    setIsModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast({ title: "Error", description: "Department name is required", variant: "destructive" });
      return;
    }
    try {
      if (editingId) {
        await updateDept.mutateAsync({ id: editingId, data: { name: form.name.trim(), description: form.description } });
        toast({ title: "Updated", description: "Department updated successfully" });
      } else {
        await createDept.mutateAsync({ data: { name: form.name.trim(), description: form.description } });
        toast({ title: "Created", description: "Department created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
      setIsModalOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to save department", variant: "destructive" });
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete department "${name}"?`)) return;
    try {
      await deleteDept.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
      toast({ title: "Deleted", description: "Department deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete department", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-sky-500" />
          <h1 className="text-lg font-bold text-slate-800">Department</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setLocation("/employee")} className="h-8 text-xs gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50">
            <Users className="w-3.5 h-3.5" /> Employee
          </Button>
          <Button size="sm" onClick={openAdd} className="h-8 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white">
            <Plus className="w-3.5 h-3.5" /> Add Department
          </Button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Department List</span>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-48 text-xs border-slate-200 bg-slate-50 focus-visible:ring-sky-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500 w-14">S/L</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500 w-24">Dept. ID</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Department Name</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500 w-24">Employees</th>
                <th className="px-3 py-2.5 text-center font-semibold text-slate-500 w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                    {search ? "No departments match your search." : "No departments yet. Add one to get started."}
                  </td>
                </tr>
              ) : (
                filtered.map((dept, idx) => (
                  <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-3 py-2.5 text-slate-500">{dept.id}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{dept.name}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 text-sky-600 font-medium">
                        <Users className="w-3 h-3" /> {dept.employeeCount}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(dept)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-sky-50 hover:bg-sky-100 text-sky-600 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id, dept.name)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="px-3 py-2 border-t border-slate-100 text-[10px] text-slate-400">
            Showing {filtered.length} of {departments.length} departments
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-800 font-bold">
              {editingId ? "Edit Department" : "Add Department"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-slate-600 font-medium">Department Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Technical Support"
                className="mt-1 h-8 text-xs border-slate-200 focus-visible:ring-sky-500"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600 font-medium">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                className="mt-1 h-8 text-xs border-slate-200 focus-visible:ring-sky-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsModalOpen(false)} className="h-8 text-xs border-slate-200">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createDept.isPending || updateDept.isPending}
              className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white"
            >
              {editingId ? "Save Changes" : "Add Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
