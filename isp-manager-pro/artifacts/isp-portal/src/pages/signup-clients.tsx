import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSignups,
  useCreateSignup,
  useUpdateSignup,
  useDeleteSignup,
  getListSignupsQueryKey,
} from "@workspace/api-client-react";
import {
  UserPlus, Plus, Check, Trash2, Search, X,
  User, Phone, Mail, MapPin, Briefcase, CreditCard,
  Wifi, Banknote, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useListPackages } from "@workspace/api-client-react";

type Tab = "pending" | "done";

type SignupFormData = {
  fullName: string;
  packageId: string;
  connectivityType: string;
  paymentMethod: string;
  signupFee: string;
  phone: string;
  alternativePhone: string;
  address: string;
  occupation: string;
  email: string;
  nationalId: string;
  previousIsp: string;
  feedback: string;
  agreeConditions: boolean;
};

const emptyForm: SignupFormData = {
  fullName: "",
  packageId: "",
  connectivityType: "Shared",
  paymentMethod: "Cash from Home",
  signupFee: "",
  phone: "",
  alternativePhone: "",
  address: "",
  occupation: "",
  email: "",
  nationalId: "",
  previousIsp: "",
  feedback: "",
  agreeConditions: false,
};

export default function SignupClients() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SignupFormData>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Partial<SignupFormData>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading } = useListSignups({
    status: activeTab,
    search: search || undefined,
  });
  const signups = data?.signups ?? [];

  const { data: pkgData } = useListPackages();
  const packages = pkgData ?? [];

  const createMutation = useCreateSignup();
  const updateMutation = useUpdateSignup();
  const deleteMutation = useDeleteSignup();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListSignupsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListSignupsQueryKey({ status: "pending" }) });
    queryClient.invalidateQueries({ queryKey: getListSignupsQueryKey({ status: "done" }) });
  }

  function setField<K extends keyof SignupFormData>(key: K, value: SignupFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFormErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const errors: Partial<SignupFormData> = {};
    if (!form.fullName.trim()) errors.fullName = "Required";
    if (!form.phone.trim()) errors.phone = "Required";
    return errors;
  }

  async function handleSubmit() {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors as Partial<SignupFormData>);
      return;
    }

    try {
      await createMutation.mutateAsync({
        data: {
          fullName: form.fullName,
          packageId: form.packageId ? parseInt(form.packageId) : undefined,
          connectivityType: form.connectivityType,
          paymentMethod: form.paymentMethod,
          signupFee: form.signupFee || undefined,
          phone: form.phone,
          alternativePhone: form.alternativePhone || undefined,
          address: form.address || undefined,
          occupation: form.occupation || undefined,
          email: form.email || undefined,
          nationalId: form.nationalId || undefined,
          previousIsp: form.previousIsp || undefined,
          feedback: form.feedback || undefined,
          agreeConditions: form.agreeConditions,
        },
      });
      toast({ title: "Signup submitted", description: `${form.fullName} has been added to the pending list.` });
      setShowForm(false);
      setForm({ ...emptyForm });
      invalidate();
    } catch {
      toast({ title: "Error", description: "Failed to submit signup.", variant: "destructive" });
    }
  }

  async function handleApprove(id: number) {
    try {
      await updateMutation.mutateAsync({ id, data: { status: "done" } });
      toast({ title: "Approved", description: "Signup marked as done." });
      invalidate();
    } catch {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: "Deleted", description: "Signup application removed." });
      invalidate();
    } catch {
      toast({ title: "Error", description: "Failed to delete signup.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-sky-500" />
          <h1 className="text-lg font-bold text-slate-800">New Signup Clients</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === "pending" ? "default" : "outline"}
            className={activeTab === "pending"
              ? "bg-amber-500 hover:bg-amber-600 border-amber-500 text-white h-8 text-xs font-semibold"
              : "h-8 text-xs font-semibold border-slate-300 text-slate-600"}
            onClick={() => setActiveTab("pending")}
          >
            PENDING
          </Button>
          <Button
            size="sm"
            variant={activeTab === "done" ? "default" : "outline"}
            className={activeTab === "done"
              ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white h-8 text-xs font-semibold"
              : "h-8 text-xs font-semibold border-slate-300 text-slate-600"}
            onClick={() => setActiveTab("done")}
          >
            DONE
          </Button>
          <Button
            size="sm"
            className="bg-sky-500 hover:bg-sky-600 text-white h-8 text-xs font-semibold gap-1.5"
            onClick={() => { setForm({ ...emptyForm }); setFormErrors({}); setShowForm(true); }}
          >
            <Plus className="w-3.5 h-3.5" />
            SIGNUP NEW
          </Button>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        {/* Search bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Signup List</span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-7 pl-8 pr-3 text-xs w-44 border-slate-200 bg-slate-50 focus-visible:ring-1 focus-visible:ring-sky-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-2.5 text-left font-medium w-10">ID</th>
                <th className="px-3 py-2.5 text-left font-medium">Name</th>
                <th className="px-3 py-2.5 text-left font-medium">Address</th>
                <th className="px-3 py-2.5 text-left font-medium">Cell</th>
                <th className="px-3 py-2.5 text-left font-medium">Cell-2</th>
                <th className="px-3 py-2.5 text-left font-medium">E-Mail</th>
                <th className="px-3 py-2.5 text-left font-medium">Package</th>
                <th className="px-3 py-2.5 text-left font-medium">Signup Date</th>
                <th className="px-3 py-2.5 text-center font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <Skeleton className="h-3 w-full rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : signups.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No {activeTab} signup applications</p>
                    {activeTab === "pending" && (
                      <p className="text-xs mt-1">Click "SIGNUP NEW" to add a new application</p>
                    )}
                  </td>
                </tr>
              ) : (
                signups.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    <td className="px-3 py-2.5 font-medium text-slate-700">{s.id}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{s.fullName}</td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-[140px] truncate">{s.address ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600 font-mono">{s.phone}</td>
                    <td className="px-3 py-2.5 text-slate-500 font-mono">{s.alternativePhone ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{s.email ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {s.packageName ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-sky-200 text-sky-700 bg-sky-50 font-medium">
                          {s.packageName}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {new Date(s.signupDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        {activeTab === "pending" && (
                          <button
                            onClick={() => handleApprove(s.id)}
                            disabled={updateMutation.isPending}
                            className="w-6 h-6 rounded flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                            title="Mark as Done"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="w-6 h-6 rounded flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {signups.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400">
            Showing 1 to {signups.length} of {signups.length} entries
          </div>
        )}
      </div>

      {/* Signup Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-800 p-0">
          {/* Modal header */}
          <div className="bg-slate-800 px-5 py-3 rounded-t-lg">
            <DialogTitle className="text-sm font-semibold text-white">Client Signup Form</DialogTitle>
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Client Name */}
            <div className="grid grid-cols-[140px_1fr] items-start gap-3">
              <Label className="text-xs font-medium text-slate-600 pt-2 text-right">
                Client Name <span className="text-red-500">*</span>
              </Label>
              <div>
                <Input
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  className={`h-8 text-xs border-slate-300 ${formErrors.fullName ? "border-red-400" : ""}`}
                />
                {formErrors.fullName && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.fullName}</p>}
              </div>
            </div>

            {/* Package */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-xs font-medium text-slate-600 text-right">Package <span className="text-red-500">*</span></Label>
              <Select value={form.packageId} onValueChange={(v) => setField("packageId", v)}>
                <SelectTrigger className="h-8 text-xs border-slate-300">
                  <SelectValue placeholder="Choose a Package" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800">
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                      {p.name} — ৳{p.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type of Connectivity */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-xs font-medium text-slate-600 text-right">Type of Connectivity <span className="text-red-500">*</span></Label>
              <Select value={form.connectivityType} onValueChange={(v) => setField("connectivityType", v)}>
                <SelectTrigger className="h-8 text-xs border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800">
                  <SelectItem value="Shared" className="text-xs">Shared</SelectItem>
                  <SelectItem value="Dedicated" className="text-xs">Dedicated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-xs font-medium text-slate-600 text-right">Payment Method <span className="text-red-500">*</span></Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setField("paymentMethod", v)}>
                <SelectTrigger className="h-8 text-xs border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800">
                  <SelectItem value="Cash from Home" className="text-xs">Cash from Home</SelectItem>
                  <SelectItem value="bKash" className="text-xs">bKash</SelectItem>
                  <SelectItem value="Nagad" className="text-xs">Nagad</SelectItem>
                  <SelectItem value="Bank Transfer" className="text-xs">Bank Transfer</SelectItem>
                  <SelectItem value="Online" className="text-xs">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Signup Fee */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-xs font-medium text-slate-600 text-right">Signup Fee</Label>
              <Input
                value={form.signupFee}
                onChange={(e) => setField("signupFee", e.target.value)}
                placeholder="Ex: 1200"
                className="h-8 text-xs border-slate-300"
              />
            </div>

            {/* Cell No */}
            <div className="grid grid-cols-[140px_1fr] items-start gap-3">
              <Label className="text-xs font-medium text-slate-600 pt-2 text-right">
                Cell No <span className="text-red-500">*</span>
              </Label>
              <div>
                <Input
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="Must dial 880XXXXXXXXXX"
                  className={`h-8 text-xs border-slate-300 ${formErrors.phone ? "border-red-400" : ""}`}
                />
                {formErrors.phone && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.phone}</p>}
              </div>
            </div>

            {/* Alternative Cell No */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-xs font-medium text-slate-600 text-right">Alternative Cell No 1</Label>
              <Input
                value={form.alternativePhone}
                onChange={(e) => setField("alternativePhone", e.target.value)}
                placeholder="Alternative Cell No 1"
                className="h-8 text-xs border-slate-300"
              />
            </div>

            {/* Address */}
            <div className="grid grid-cols-[140px_1fr] items-start gap-3">
              <Label className="text-xs font-medium text-slate-600 pt-2 text-right">Address</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Full address"
                className="text-xs border-slate-300 min-h-[60px] resize-none"
              />
            </div>

            {/* Occupation */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-xs font-medium text-slate-600 text-right">Occupation</Label>
              <Input
                value={form.occupation}
                onChange={(e) => setField("occupation", e.target.value)}
                placeholder="Occupation"
                className="h-8 text-xs border-slate-300"
              />
            </div>

            {/* Email */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-xs font-medium text-slate-600 text-right">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="Ex: abc@domain.com"
                className="h-8 text-xs border-slate-300"
              />
            </div>

            {/* National ID */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-xs font-medium text-slate-600 text-right">National ID</Label>
              <Input
                value={form.nationalId}
                onChange={(e) => setField("nationalId", e.target.value)}
                placeholder="Ex: 1234567890"
                className="h-8 text-xs border-slate-300"
              />
            </div>

            {/* Previous ISP */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-xs font-medium text-slate-600 text-right">Previous ISP</Label>
              <Input
                value={form.previousIsp}
                onChange={(e) => setField("previousIsp", e.target.value)}
                placeholder="Ex: 1234"
                className="h-8 text-xs border-slate-300"
              />
            </div>

            {/* Feedback */}
            <div className="grid grid-cols-[140px_1fr] items-start gap-3">
              <Label className="text-xs font-medium text-slate-600 pt-2 text-right">Feedback</Label>
              <Textarea
                value={form.feedback}
                onChange={(e) => setField("feedback", e.target.value)}
                placeholder="Optional"
                className="text-xs border-slate-300 min-h-[60px] resize-none"
              />
            </div>

            {/* Agree with Conditions */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-xs font-medium text-slate-600 text-right">Agree With Our Conditions</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="agreeConditions"
                    checked={form.agreeConditions === true}
                    onChange={() => setField("agreeConditions", true)}
                    className="accent-sky-500"
                  />
                  Yes
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="agreeConditions"
                    checked={form.agreeConditions === false}
                    onChange={() => setField("agreeConditions", false)}
                    className="accent-sky-500"
                  />
                  No
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-slate-300 text-slate-600"
              onClick={() => setForm({ ...emptyForm })}
            >
              Reset
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-sky-500 hover:bg-sky-600 text-white"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
