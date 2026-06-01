import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetCurrentUser, customFetch } from "@workspace/api-client-react";
import {
  Settings as SettingsIcon, User, Mail, Shield, Building, Key,
  Globe, Phone, MapPin, FileText, Briefcase, DollarSign, Clock,
  Hash, Link2, Save, RefreshCw, CheckCircle2, Image, StickyNote,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Tab = "profile" | "company" | "security";

interface CompanySettings {
  id: number;
  companyName: string;
  tagline: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  businessType: string | null;
  taxId: string | null;
  licenseNo: string | null;
  currency: string | null;
  currencySymbol: string | null;
  timezone: string | null;
  logoUrl: string | null;
  footerNote: string | null;
  updatedAt: string;
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" /> {label}
      </label>
      {children}
    </div>
  );
}

function ReadonlyField({ value }: { value?: string | null }) {
  return (
    <div className="text-sm font-medium text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 min-h-[38px]">
      {value || <span className="text-slate-400 font-normal italic">Not set</span>}
    </div>
  );
}

function EditableInput({
  value, onChange, placeholder, type = "text",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 text-sm bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-sky-500 rounded-lg"
    />
  );
}

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("profile");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<CompanySettings>>({});
  const [saved, setSaved] = useState(false);

  const { data: user, isLoading: userLoading } = useGetCurrentUser();

  const companyQ = useQuery<CompanySettings>({
    queryKey: ["company-settings"],
    queryFn: () => customFetch({ url: "/api/company-settings" }),
  });

  useEffect(() => {
    if (companyQ.data) setForm(companyQ.data);
  }, [companyQ.data]);

  const saveMutation = useMutation({
    mutationFn: (body: Partial<CompanySettings>) =>
      customFetch({ url: "/api/company-settings", method: "PUT", data: body }),
    onSuccess: (data) => {
      qc.setQueryData(["company-settings"], data);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast({ title: "Company profile saved", description: "Changes have been applied." });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const set = (key: keyof CompanySettings) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleCancel = () => {
    setForm(companyQ.data ?? {});
    setEditing(false);
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "company", label: "Company Profile", icon: Building },
    { id: "security", label: "Security", icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <SettingsIcon className="w-5 h-5 text-sky-500" />
        <h2 className="text-lg font-bold text-slate-900">Settings</h2>
        <ChevronRight className="w-4 h-4 text-slate-300" />
        <span className="text-slate-500 text-sm">{TABS.find((t) => t.id === tab)?.label}</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setEditing(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              tab === id
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── My Profile Tab ── */}
      {tab === "profile" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="col-span-1 md:col-span-2 bg-white border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base">My Profile</CardTitle>
              <CardDescription>Your personal account information</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {userLoading || !user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-24" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-5">
                    <Avatar className="w-16 h-16 border-2 border-white shadow">
                      <AvatarFallback className="bg-sky-100 text-sky-700 text-xl font-bold">
                        {user.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{user.fullName}</h3>
                      <p className="text-sm text-slate-500">@{user.username}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge className="bg-sky-50 text-sky-700 border border-sky-200 pointer-events-none text-xs">
                          {user.role.name}
                        </Badge>
                        {user.isSuperAdmin && (
                          <Badge className="bg-purple-50 text-purple-700 border border-purple-200 pointer-events-none text-xs">
                            Super Admin
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8 pt-4 border-t border-slate-100">
                    <Field label="Full Name" icon={User}><ReadonlyField value={user.fullName} /></Field>
                    <Field label="Email Address" icon={Mail}><ReadonlyField value={user.email} /></Field>
                    <Field label="Role Level" icon={Shield}><ReadonlyField value={user.role.name} /></Field>
                    <Field label="Organization" icon={Building}><ReadonlyField value="ISP Manager Pro" /></Field>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 h-fit">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" /> Security
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="p-3 bg-sky-50 rounded-lg border border-sky-100 flex gap-3">
                <Shield className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-sky-900">Active Session</h4>
                  <p className="text-xs text-sky-700 mt-1 leading-relaxed">
                    You are securely logged into the portal.
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                To update your password, contact the system administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Company Profile Tab ── */}
      {tab === "company" && (
        <div className="space-y-5">
          {/* Action bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-slate-500">
              This information is used across billing, invoices and reports.
            </p>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel}
                    className="h-9 border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => saveMutation.mutate(form)}
                    disabled={saveMutation.isPending}
                    className="h-9 bg-sky-600 hover:bg-sky-700 text-white text-sm gap-2">
                    {saveMutation.isPending
                      ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                      : <><Save className="w-3.5 h-3.5" /> Save Changes</>}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setEditing(true)}
                  className="h-9 bg-sky-600 hover:bg-sky-700 text-white text-sm gap-2">
                  <FileText className="w-3.5 h-3.5" /> Edit Profile
                </Button>
              )}
            </div>
          </div>

          {companyQ.isLoading ? (
            <Card className="bg-white border-slate-200">
              <CardContent className="p-6 grid grid-cols-2 gap-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24 bg-slate-100" />
                    <Skeleton className="h-9 w-full bg-slate-100" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Section 1 — Basic Info */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Building className="w-4 h-4 text-sky-500" /> Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <Field label="Company Name" icon={Building}>
                      {editing
                        ? <EditableInput value={form.companyName ?? ""} onChange={set("companyName")} placeholder="My ISP Ltd." />
                        : <ReadonlyField value={form.companyName} />}
                    </Field>
                    <Field label="Tagline / Slogan" icon={StickyNote}>
                      {editing
                        ? <EditableInput value={form.tagline ?? ""} onChange={set("tagline")} placeholder="Connecting the nation..." />
                        : <ReadonlyField value={form.tagline} />}
                    </Field>
                    <Field label="Business Type" icon={Briefcase}>
                      {editing
                        ? <EditableInput value={form.businessType ?? ""} onChange={set("businessType")} placeholder="ISP / Telecom" />
                        : <ReadonlyField value={form.businessType} />}
                    </Field>
                    <Field label="Tax / VAT ID" icon={Hash}>
                      {editing
                        ? <EditableInput value={form.taxId ?? ""} onChange={set("taxId")} placeholder="VAT-0000000" />
                        : <ReadonlyField value={form.taxId} />}
                    </Field>
                    <Field label="License No." icon={FileText}>
                      {editing
                        ? <EditableInput value={form.licenseNo ?? ""} onChange={set("licenseNo")} placeholder="BTRC/ISP/..." />
                        : <ReadonlyField value={form.licenseNo} />}
                    </Field>
                    <Field label="Logo URL" icon={Image}>
                      {editing
                        ? <EditableInput value={form.logoUrl ?? ""} onChange={set("logoUrl")} placeholder="https://..." />
                        : <ReadonlyField value={form.logoUrl} />}
                    </Field>
                  </div>
                </CardContent>
              </Card>

              {/* Section 2 — Contact */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-sky-500" /> Contact Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <Field label="Phone" icon={Phone}>
                      {editing
                        ? <EditableInput value={form.phone ?? ""} onChange={set("phone")} placeholder="+880 1xxx-xxxxxx" />
                        : <ReadonlyField value={form.phone} />}
                    </Field>
                    <Field label="Email" icon={Mail}>
                      {editing
                        ? <EditableInput value={form.email ?? ""} onChange={set("email")} placeholder="info@company.com" type="email" />
                        : <ReadonlyField value={form.email} />}
                    </Field>
                    <Field label="Website" icon={Globe}>
                      {editing
                        ? <EditableInput value={form.website ?? ""} onChange={set("website")} placeholder="https://company.com" />
                        : <ReadonlyField value={form.website} />}
                    </Field>
                  </div>
                </CardContent>
              </Card>

              {/* Section 3 — Address */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-500" /> Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Field label="Street Address" icon={MapPin}>
                        {editing
                          ? <EditableInput value={form.address ?? ""} onChange={set("address")} placeholder="House #, Road #, Area" />
                          : <ReadonlyField value={form.address} />}
                      </Field>
                    </div>
                    <Field label="City" icon={MapPin}>
                      {editing
                        ? <EditableInput value={form.city ?? ""} onChange={set("city")} placeholder="Dhaka" />
                        : <ReadonlyField value={form.city} />}
                    </Field>
                    <Field label="District / State" icon={MapPin}>
                      {editing
                        ? <EditableInput value={form.state ?? ""} onChange={set("state")} placeholder="Dhaka" />
                        : <ReadonlyField value={form.state} />}
                    </Field>
                    <Field label="Post Code" icon={Hash}>
                      {editing
                        ? <EditableInput value={form.postCode ?? ""} onChange={set("postCode")} placeholder="1200" />
                        : <ReadonlyField value={form.postCode} />}
                    </Field>
                    <Field label="Country" icon={Globe}>
                      {editing
                        ? <EditableInput value={form.country ?? ""} onChange={set("country")} placeholder="Bangladesh" />
                        : <ReadonlyField value={form.country} />}
                    </Field>
                  </div>
                </CardContent>
              </Card>

              {/* Section 4 — System Config */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <SettingsIcon className="w-4 h-4 text-sky-500" /> System Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <Field label="Currency" icon={DollarSign}>
                      {editing
                        ? <EditableInput value={form.currency ?? ""} onChange={set("currency")} placeholder="BDT" />
                        : <ReadonlyField value={form.currency} />}
                    </Field>
                    <Field label="Currency Symbol" icon={DollarSign}>
                      {editing
                        ? <EditableInput value={form.currencySymbol ?? ""} onChange={set("currencySymbol")} placeholder="৳" />
                        : <ReadonlyField value={form.currencySymbol} />}
                    </Field>
                    <Field label="Timezone" icon={Clock}>
                      {editing
                        ? <EditableInput value={form.timezone ?? ""} onChange={set("timezone")} placeholder="Asia/Dhaka" />
                        : <ReadonlyField value={form.timezone} />}
                    </Field>
                    <div className="sm:col-span-2 lg:col-span-4">
                      <Field label="Invoice Footer Note" icon={StickyNote}>
                        {editing
                          ? <EditableInput value={form.footerNote ?? ""} onChange={set("footerNote")} placeholder="Thank you for your payment!" />
                          : <ReadonlyField value={form.footerNote} />}
                      </Field>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Last updated */}
              {companyQ.data?.updatedAt && (
                <p className="text-xs text-slate-400 text-right">
                  Last updated: {new Date(companyQ.data.updatedAt).toLocaleString()}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Security Tab ── */}
      {tab === "security" && (
        <div className="max-w-lg space-y-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-500" /> Session & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-100 flex gap-3">
                <Shield className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-sky-900">Active Session</h4>
                  <p className="text-xs text-sky-700 mt-1 leading-relaxed">
                    You are securely logged in. Your session will remain active until you sign out.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <Key className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">Password</p>
                      <p className="text-xs text-slate-500">Last changed: Unknown</p>
                    </div>
                  </div>
                  <Badge className="bg-slate-100 text-slate-500 border-slate-200 pointer-events-none text-xs">
                    Contact Admin
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <Link2 className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">Two-Factor Auth</p>
                      <p className="text-xs text-slate-500">Additional login security</p>
                    </div>
                  </div>
                  <Badge className="bg-slate-100 text-slate-500 border-slate-200 pointer-events-none text-xs">
                    Not enabled
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">Login Method</p>
                      <p className="text-xs text-slate-500">Username + Password</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 pointer-events-none text-xs">
                    Active
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-lg px-3 py-3 border border-slate-100">
                To update your password or enable two-factor authentication, please contact the system administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
