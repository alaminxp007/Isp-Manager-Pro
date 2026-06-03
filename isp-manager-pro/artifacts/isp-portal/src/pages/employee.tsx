import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useListDepartments,
  useListRoles,
  getListEmployeesQueryKey,
} from "@workspace/api-client-react";
import { UserCheck, Plus, Trash2, Building2, ChevronLeft, Pencil, Eye, EyeOff, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type View = "list" | "add" | "edit";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function generateEmployeeId() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
}

const emptyForm = {
  employeeId: "",
  fullName: "",
  designation: "",
  departmentId: "",
  fatherName: "",
  motherName: "",
  dateOfBirth: "",
  joiningDate: "",
  gender: "",
  maritalStatus: "",
  bloodGroup: "",
  nationalId: "",
  basicSalary: "",
  mobileBill: "",
  houseRent: "",
  medical: "",
  food: "",
  otherAllowances: "",
  providentFund: "",
  professionalTax: "",
  incomeTax: "",
  presentAddress: "",
  permanentAddress: "",
  personalContact: "",
  officeContact: "",
  familyContact: "",
  firstReference: "",
  secondReference: "",
  email: "",
  skype: "",
  portalUsername: "",
  portalPassword: "",
  portalRoleId: "",
  enablePortalAccess: false,
};

export default function Employee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...emptyForm, employeeId: generateEmployeeId() });
  const [showPassword, setShowPassword] = useState(false);
  const [hasExistingPortal, setHasExistingPortal] = useState(false);

  const { data: employees = [], isLoading } = useListEmployees();
  const { data: departments = [] } = useListDepartments();
  const { data: roles = [] } = useListRoles();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      (e.designation ?? "").toLowerCase().includes(q) ||
      (e.departmentName ?? "").toLowerCase().includes(q)
    );
  });

  function handleFieldChange(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function openAdd() {
    setEditingId(null);
    setHasExistingPortal(false);
    setShowPassword(false);
    setForm({ ...emptyForm, employeeId: generateEmployeeId() });
    setView("add");
  }

  function openEdit(emp: typeof employees[number]) {
    setEditingId(emp.id);
    setHasExistingPortal(emp.hasPortalAccess);
    setShowPassword(false);
    setForm({
      ...emptyForm,
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      designation: emp.designation ?? "",
      departmentId: emp.departmentId ? String(emp.departmentId) : "",
      gender: emp.gender ?? "",
      joiningDate: emp.joiningDate ?? "",
      email: emp.email ?? "",
      personalContact: emp.personalContact ?? "",
      basicSalary: emp.basicSalary ?? "",
      portalUsername: emp.portalUsername ?? "",
      portalPassword: "",
      portalRoleId: "",
      enablePortalAccess: emp.hasPortalAccess,
    });
    setView("edit");
  }

  async function handleSubmit() {
    if (!form.fullName.trim()) {
      toast({ title: "Error", description: "Employee name is required", variant: "destructive" });
      return;
    }
    if (form.enablePortalAccess && !form.portalUsername.trim()) {
      toast({ title: "Error", description: "Portal username is required when enabling portal access", variant: "destructive" });
      return;
    }
    if (form.enablePortalAccess && !hasExistingPortal && !form.portalPassword.trim()) {
      toast({ title: "Error", description: "Portal password is required for new portal access", variant: "destructive" });
      return;
    }

    const payload: Record<string, unknown> = {
      ...form,
      departmentId: form.departmentId ? Number(form.departmentId) : undefined,
      portalUsername: form.enablePortalAccess ? (form.portalUsername.trim() || undefined) : undefined,
      portalPassword: form.enablePortalAccess && form.portalPassword.trim() ? form.portalPassword.trim() : undefined,
      portalRoleId: form.enablePortalAccess && form.portalRoleId ? Number(form.portalRoleId) : undefined,
      removePortalAccess: !form.enablePortalAccess && hasExistingPortal ? true : undefined,
    };
    delete payload["enablePortalAccess"];

    try {
      if (view === "edit" && editingId) {
        await updateEmployee.mutateAsync({ id: editingId, data: payload });
        toast({ title: "Updated", description: `${form.fullName} has been updated.` });
      } else {
        await createEmployee.mutateAsync({ data: payload });
        toast({ title: "Employee Added", description: `${form.fullName} has been added.` });
      }
      queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
      setView("list");
    } catch {
      toast({ title: "Error", description: "Failed to save employee", variant: "destructive" });
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete employee "${name}"? This will also remove their portal access.`)) return;
    try {
      await deleteEmployee.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
      toast({ title: "Deleted", description: "Employee removed" });
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  }

  const isPending = createEmployee.isPending || updateEmployee.isPending;

  // ─── Form View (Add / Edit) ───────────────────────────────────────────────────
  if (view === "add" || view === "edit") {
    return (
      <div className="space-y-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-sky-500" />
            <h1 className="text-lg font-bold text-slate-800">{view === "edit" ? "Edit Employee" : "Add Employee"}</h1>
          </div>
          <Button size="sm" variant="outline" onClick={() => setView("list")} className="h-8 text-xs gap-1.5 border-slate-200">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </Button>
        </div>

        {/* Basic Info Section */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-700 text-white text-xs font-semibold">
            {view === "edit" ? "Edit Employee Information" : "Add New Employee"}
          </div>
          <div className="p-4 grid grid-cols-1 gap-3">
            {[
              { label: "Employee ID", field: "employeeId" },
              { label: "Employee Name *", field: "fullName" },
              { label: "Designation", field: "designation" },
            ].map(({ label, field }) => (
              <div key={field} className="grid grid-cols-3 items-center gap-3">
                <Label className="text-xs text-right text-slate-600 font-medium col-span-1">{label}</Label>
                <Input
                  value={form[field as keyof typeof form] as string}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  className="col-span-2 h-8 text-xs border-slate-200 focus-visible:ring-sky-500 max-w-xs"
                />
              </div>
            ))}

            {/* Department */}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right text-slate-600 font-medium">Department</Label>
              <Select value={form.departmentId} onValueChange={(v) => handleFieldChange("departmentId", v)}>
                <SelectTrigger className="col-span-2 h-8 text-xs border-slate-200 max-w-xs">
                  <SelectValue placeholder="Choose Department Name" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)} className="text-xs">{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {[
              { label: "Father's Name", field: "fatherName" },
              { label: "Mother's Name", field: "motherName" },
              { label: "Date of Birth", field: "dateOfBirth", placeholder: "YYYY-MM-DD" },
              { label: "Joining Date", field: "joiningDate", placeholder: "YYYY-MM-DD" },
            ].map(({ label, field, placeholder }) => (
              <div key={field} className="grid grid-cols-3 items-center gap-3">
                <Label className="text-xs text-right text-slate-600 font-medium col-span-1">{label}</Label>
                <Input
                  value={form[field as keyof typeof form] as string}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  placeholder={placeholder}
                  className="col-span-2 h-8 text-xs border-slate-200 focus-visible:ring-sky-500 max-w-xs"
                />
              </div>
            ))}

            {/* Gender */}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right text-slate-600 font-medium">Gender</Label>
              <div className="col-span-2 flex items-center gap-4">
                {["Male", "Female"].map((g) => (
                  <label key={g} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={(e) => handleFieldChange("gender", e.target.value)} className="accent-sky-600" />
                    {g}
                  </label>
                ))}
              </div>
            </div>

            {/* Marital Status */}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right text-slate-600 font-medium">Marital Status</Label>
              <div className="col-span-2 flex items-center gap-4">
                {["Unmarried", "Married"].map((s) => (
                  <label key={s} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input type="radio" name="maritalStatus" value={s} checked={form.maritalStatus === s} onChange={(e) => handleFieldChange("maritalStatus", e.target.value)} className="accent-sky-600" />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            {/* Blood Group */}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right text-slate-600 font-medium">Blood Group</Label>
              <Select value={form.bloodGroup} onValueChange={(v) => handleFieldChange("bloodGroup", v)}>
                <SelectTrigger className="col-span-2 h-8 text-xs border-slate-200 max-w-xs">
                  <SelectValue placeholder="Choose Blood Group" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {BLOOD_GROUPS.map((g) => (
                    <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right text-slate-600 font-medium">National ID</Label>
              <Input
                value={form.nationalId}
                onChange={(e) => handleFieldChange("nationalId", e.target.value)}
                className="col-span-2 h-8 text-xs border-slate-200 focus-visible:ring-sky-500 max-w-xs"
              />
            </div>
          </div>
        </div>

        {/* Salary & Deductions */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-700 text-white text-xs font-semibold">Employee Salary &amp; Deductions</div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Salary &amp; Allowances</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: "Basic Salary *", field: "basicSalary" },
                  { label: "Mobile Bill", field: "mobileBill" },
                  { label: "House Rent", field: "houseRent" },
                  { label: "Medical", field: "medical" },
                  { label: "Food", field: "food" },
                  { label: "Others", field: "otherAllowances" },
                ].map(({ label, field }) => (
                  <div key={field} className="grid grid-cols-3 items-center gap-3">
                    <Label className="text-xs text-right text-slate-600 font-medium">{label}</Label>
                    <div className="col-span-2 flex items-center gap-1 max-w-xs">
                      <Input
                        type="number"
                        value={form[field as keyof typeof form] as string}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className="h-8 text-xs border-slate-200 focus-visible:ring-sky-500"
                      />
                      <span className="text-xs text-slate-400 font-medium">৳</span>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-3 items-center gap-3">
                  <Label className="text-xs text-right text-slate-600 font-medium">Net Gross Salary</Label>
                  <div className="col-span-2 flex items-center gap-1 max-w-xs">
                    <Input
                      readOnly
                      value={["basicSalary", "mobileBill", "houseRent", "medical", "food", "otherAllowances"]
                        .reduce((sum, f) => sum + (parseFloat(form[f as keyof typeof form] as string) || 0), 0)
                        .toFixed(2)}
                      className="h-8 text-xs border-slate-200 bg-slate-50"
                    />
                    <span className="text-xs text-slate-400 font-medium">৳</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Deductions</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: "Provident Fund", field: "providentFund" },
                  { label: "Professional Tax", field: "professionalTax" },
                  { label: "Income Tax", field: "incomeTax" },
                ].map(({ label, field }) => (
                  <div key={field} className="grid grid-cols-3 items-center gap-3">
                    <Label className="text-xs text-right text-slate-600 font-medium">{label}</Label>
                    <div className="col-span-2 flex items-center gap-1 max-w-xs">
                      <Input
                        type="number"
                        value={form[field as keyof typeof form] as string}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className="h-8 text-xs border-slate-200 focus-visible:ring-sky-500"
                      />
                      <span className="text-xs text-slate-400 font-medium">৳</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-700 text-white text-xs font-semibold">Employee Contact Information</div>
          <div className="p-4 grid grid-cols-1 gap-3">
            {[
              { label: "Present Address", field: "presentAddress" },
              { label: "Permanent Address", field: "permanentAddress" },
            ].map(({ label, field }) => (
              <div key={field} className="grid grid-cols-3 items-start gap-3">
                <Label className="text-xs text-right text-slate-600 font-medium pt-1.5">{label}</Label>
                <textarea
                  value={form[field as keyof typeof form] as string}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  rows={2}
                  className="col-span-2 text-xs border border-slate-200 rounded-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-xs w-full"
                />
              </div>
            ))}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right text-slate-600 font-medium col-span-1">Contact Info</Label>
              <span className="col-span-2 text-xs text-slate-400 italic">Fill in the contact details below</span>
            </div>
            {[
              { label: "Personal Contact No", field: "personalContact" },
              { label: "Office Contact No", field: "officeContact" },
              { label: "Family Contact No", field: "familyContact" },
              { label: "First Reference No", field: "firstReference" },
              { label: "Second Reference No", field: "secondReference" },
              { label: "Email", field: "email" },
              { label: "Skype", field: "skype" },
            ].map(({ label, field }) => (
              <div key={field} className="grid grid-cols-3 items-center gap-3">
                <Label className="text-xs text-right text-slate-600 font-medium col-span-1">{label}</Label>
                <Input
                  value={form[field as keyof typeof form] as string}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  className="col-span-2 h-8 text-xs border-slate-200 focus-visible:ring-sky-500 max-w-xs"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Portal Access Section */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-sky-700 text-white text-xs font-semibold flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5" />
            Portal Login Access
          </div>
          <div className="p-4 space-y-3">
            {/* Enable toggle */}
            <div className="grid grid-cols-3 items-center gap-3">
              <Label className="text-xs text-right text-slate-600 font-medium">Portal Access</Label>
              <div className="col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.enablePortalAccess}
                    onChange={() => handleFieldChange("enablePortalAccess", true)}
                    className="accent-sky-600"
                  />
                  Enable
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    checked={!form.enablePortalAccess}
                    onChange={() => handleFieldChange("enablePortalAccess", false)}
                    className="accent-red-500"
                  />
                  Disable
                </label>
                {hasExistingPortal && form.enablePortalAccess && (
                  <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                )}
                {hasExistingPortal && !form.enablePortalAccess && (
                  <span className="text-[10px] text-red-500 italic">Disabling will remove portal account</span>
                )}
              </div>
            </div>

            {form.enablePortalAccess && (
              <>
                {/* Username */}
                <div className="grid grid-cols-3 items-center gap-3">
                  <Label className="text-xs text-right text-slate-700 font-semibold">
                    Username *
                  </Label>
                  <Input
                    value={form.portalUsername}
                    onChange={(e) => handleFieldChange("portalUsername", e.target.value)}
                    placeholder="Portal login username"
                    className="col-span-2 h-8 text-xs border-slate-300 focus-visible:ring-sky-500 max-w-xs"
                  />
                </div>

                {/* Password */}
                <div className="grid grid-cols-3 items-center gap-3">
                  <Label className="text-xs text-right text-slate-700 font-semibold">
                    Password {hasExistingPortal ? "(leave blank to keep)" : "*"}
                  </Label>
                  <div className="col-span-2 flex items-center gap-1 max-w-xs">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.portalPassword}
                      onChange={(e) => handleFieldChange("portalPassword", e.target.value)}
                      placeholder={hasExistingPortal ? "New password (optional)" : "Set a password"}
                      className="h-8 text-xs border-slate-300 focus-visible:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 shrink-0"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div className="grid grid-cols-3 items-center gap-3">
                  <Label className="text-xs text-right text-slate-700 font-semibold">Role / Permission</Label>
                  <Select value={form.portalRoleId} onValueChange={(v) => handleFieldChange("portalRoleId", v)}>
                    <SelectTrigger className="col-span-2 h-8 text-xs border-slate-300 max-w-xs">
                      <SelectValue placeholder="Assign a role (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)} className="text-xs">{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div />
                  <p className="col-span-2 text-[10px] text-slate-400 italic max-w-xs">
                    The employee will be able to log in using the username and password above. Their access is controlled by the assigned role&apos;s permissions.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-2 pb-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (view === "edit") {
                setView("list");
              } else {
                setForm({ ...emptyForm, employeeId: generateEmployeeId() });
              }
            }}
            className="h-8 text-xs border-slate-200 text-slate-600"
          >
            {view === "edit" ? "Cancel" : "Reset"}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending}
            className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white"
          >
            {isPending ? "Saving..." : view === "edit" ? "Update" : "Submit"}
          </Button>
        </div>
      </div>
    );
  }

  // ─── List View ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-sky-500" />
          <h1 className="text-lg font-bold text-slate-800">Employee</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setLocation("/departments")} className="h-8 text-xs gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50">
            <Building2 className="w-3.5 h-3.5" /> Departments
          </Button>
          <Button size="sm" onClick={openAdd} className="h-8 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white">
            <Plus className="w-3.5 h-3.5" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Employees", value: employees.length, color: "text-sky-600" },
          { label: "Male", value: employees.filter((e) => e.gender === "Male").length, color: "text-blue-600" },
          { label: "Female", value: employees.filter((e) => e.gender === "Female").length, color: "text-pink-500" },
          { label: "Portal Access", value: employees.filter((e) => e.hasPortalAccess).length, color: "text-emerald-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-lg p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Employee List</span>
          <Input
            placeholder="Search by name, ID, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-60 text-xs border-slate-200 bg-slate-50 focus-visible:ring-sky-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500 w-10">#</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Employee ID</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Name</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Designation</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Department</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Gender</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Joining</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Salary</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Portal</th>
                <th className="px-3 py-2.5 text-center font-semibold text-slate-500 w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                    {search ? "No employees match your search." : "No employees yet. Click \"Add Employee\" to get started."}
                  </td>
                </tr>
              ) : (
                filtered.map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{emp.employeeId}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800">{emp.fullName}</td>
                    <td className="px-3 py-2.5 text-slate-500">{emp.designation ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {emp.departmentName ? (
                        <Badge variant="outline" className="text-[10px] border-sky-200 text-sky-700 bg-sky-50 font-medium">
                          {emp.departmentName}
                        </Badge>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{emp.gender ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{emp.joiningDate ?? "—"}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700">
                      {emp.basicSalary && parseFloat(emp.basicSalary) > 0 ? `৳${parseFloat(emp.basicSalary).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {emp.hasPortalAccess ? (
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] text-emerald-600 font-medium">{emp.portalUsername}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <ShieldOff className="w-3 h-3 text-slate-300" />
                          <span className="text-[10px] text-slate-400">No access</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(emp)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-sky-50 hover:bg-sky-100 text-sky-600 transition-colors"
                          title="Edit employee"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id, emp.fullName)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                          title="Delete employee"
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

        {!isLoading && (
          <div className="px-3 py-2 border-t border-slate-100 text-[10px] text-slate-400">
            Showing {filtered.length} of {employees.length} employees
          </div>
        )}
      </div>
    </div>
  );
}
