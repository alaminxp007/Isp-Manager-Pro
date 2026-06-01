import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateClient, useListZones, useListPackages,
  getListClientsQueryKey,
} from "@workspace/api-client-react";
import {
  ChevronRight, ChevronDown, UserPlus, RotateCcw, Save,
  User, MapPin, Network, Settings2, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  comId: z.string().optional(),
  fullName: z.string().min(1, "Client name is required"),
  username: z.string().min(3, "PPPoE ID must be at least 3 characters"),
  password: z.string().optional(),
  phone: z.string().min(1, "Cell number is required"),
  zoneId: z.coerce.number().min(1, "Zone is required"),
  subZone: z.string().optional(),
  packageId: z.coerce.number().optional(),
  ipAddress: z.string().optional(),
  flatNo: z.string().optional(),
  houseNo: z.string().optional(),
  roadNo: z.string().optional(),
  address: z.string().optional(),
  thana: z.string().optional(),
  permanentAddress: z.string().optional(),
  macAddress: z.string().optional(),
  cableType: z.string().default("UTP"),
  clientType: z.string().default("Home"),
  connectivityType: z.string().default("Shared"),
  connectionType: z.string().default("Fiber"),
  paymentDate: z.coerce.number().optional(),
  billDate: z.coerce.number().optional(),
  permanentDiscount: z.string().default("0.00"),
  permanentExtraBill: z.string().default("0.00"),
  nationalId: z.string().optional(),
  note: z.string().optional(),
  email: z.string().optional(),
  alternativePhone: z.string().optional(),
  fatherName: z.string().optional(),
  occupation: z.string().optional(),
  signupFee: z.string().default("0"),
  paymentMethod: z.string().default("Cash from Home"),
  joiningDate: z.string().default(() => new Date().toISOString().slice(0, 10)),
  status: z.string().default("active"),
  thisMonthBill: z.enum(["auto", "manual", "nobill"]).default("auto"),
  sendLoginSms: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

function generateComId() {
  return `KRN-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

function SectionHeader({ title, icon: Icon }: { title: string; icon?: React.ComponentType<any> }) {
  return (
    <div className="flex items-center gap-2 bg-slate-100 border-l-4 border-sky-500 px-3 py-2 mb-4 rounded-r">
      {Icon && <Icon className="w-3.5 h-3.5 text-sky-500" />}
      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</span>
    </div>
  );
}

function FieldRow({
  label, required, children, className,
}: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-[140px_1fr] items-center gap-2 ${className ?? ""}`}>
      <label className="text-right text-[11px] text-slate-500 leading-tight pr-1 shrink-0">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}

function FieldRowTop({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-2">
      <label className="text-right text-[11px] text-slate-500 leading-tight pr-1 shrink-0 pt-2">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}

function CollapsibleSection({
  title, icon: Icon, defaultOpen = false, children,
}: { title: string; icon?: React.ComponentType<any>; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 bg-slate-100 border-l-4 border-sky-500 px-3 py-2 mb-0 rounded-r hover:bg-slate-200 transition-colors"
      >
        {Icon && <Icon className="w-3.5 h-3.5 text-sky-500" />}
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex-1 text-left">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {open && (
        <div className="mt-4 space-y-3">{children}</div>
      )}
    </div>
  );
}

export default function AddClient() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: zonesData } = useListZones();
  const { data: packagesData } = useListPackages();
  const createClient = useCreateClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      comId: generateComId(),
      fullName: "",
      username: "",
      password: "",
      phone: "",
      zoneId: 0,
      subZone: "",
      packageId: undefined,
      ipAddress: "",
      flatNo: "",
      houseNo: "",
      roadNo: "",
      address: "",
      thana: "",
      permanentAddress: "",
      macAddress: "",
      cableType: "UTP",
      clientType: "Home",
      connectivityType: "Shared",
      connectionType: "Fiber",
      permanentDiscount: "0.00",
      permanentExtraBill: "0.00",
      nationalId: "",
      note: "",
      email: "",
      alternativePhone: "",
      fatherName: "",
      occupation: "",
      signupFee: "0",
      paymentMethod: "Cash from Home",
      joiningDate: new Date().toISOString().slice(0, 10),
      status: "active",
      thisMonthBill: "auto",
      sendLoginSms: false,
    },
  });

  const onSubmit = (values: FormValues) => {
    const flatParts = [values.flatNo, values.houseNo, values.roadNo].filter(Boolean).join(", ");
    const fullAddress = [flatParts, values.address].filter(Boolean).join(" — ");

    createClient.mutate(
      {
        data: {
          comId: values.comId || generateComId(),
          username: values.username,
          fullName: values.fullName,
          phone: values.phone || undefined,
          zoneId: values.zoneId || undefined,
          subZone: values.subZone || undefined,
          address: fullAddress || undefined,
          flatNo: values.flatNo || undefined,
          houseNo: values.houseNo || undefined,
          roadNo: values.roadNo || undefined,
          thana: values.thana || undefined,
          permanentAddress: values.permanentAddress || undefined,
          packageId: values.packageId || undefined,
          ipAddress: values.ipAddress || undefined,
          macAddress: values.macAddress || undefined,
          connectionType: values.connectionType,
          cableType: values.cableType,
          clientType: values.clientType,
          connectivityType: values.connectivityType,
          paymentDate: values.paymentDate || undefined,
          billDate: values.billDate || undefined,
          status: values.status,
          email: values.email || undefined,
          alternativePhone: values.alternativePhone || undefined,
          fatherName: values.fatherName || undefined,
          nationalId: values.nationalId || undefined,
          occupation: values.occupation || undefined,
          signupFee: values.signupFee,
          paymentMethod: values.paymentMethod,
          joiningDate: values.joiningDate,
          permanentDiscount: values.permanentDiscount,
          permanentExtraBill: values.permanentExtraBill,
          note: values.note || undefined,
        },
      },
      {
        onSuccess: (client) => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          toast({ title: "Client created", description: `${values.fullName} added successfully.` });
          setLocation(`/clients/${client.id}`);
        },
        onError: (error: any) => {
          toast({
            title: "Error creating client",
            description: error?.response?.data?.error || error.message || "An error occurred",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleReset = () => {
    form.reset();
    form.setValue("comId", generateComId());
    form.setValue("joiningDate", new Date().toISOString().slice(0, 10));
  };

  const selectedPackage = packagesData?.find(p => p.id === form.watch("packageId"));
  const packagePrice = selectedPackage?.price ?? "0";

  const inputCls = "h-8 bg-white border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:border-sky-500";

  return (
    <div className="bg-white text-slate-800 min-h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
        <span className="cursor-pointer hover:text-sky-500" onClick={() => setLocation("/dashboard")}>Home</span>
        <ChevronRight className="w-3 h-3" />
        <span className="cursor-pointer hover:text-sky-500" onClick={() => setLocation("/clients")}>Clients</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700">Add Client</span>
      </div>

      {/* Page Title */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-sky-500" />
          <h2 className="text-lg font-bold text-slate-900">Add Client</h2>
          <span className="bg-sky-50 text-sky-600 border border-sky-200 text-[10px] font-semibold px-2 py-0.5 rounded-full ml-1">PPPoE</span>
        </div>
        <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-slate-200 text-slate-700 hover:bg-slate-100" onClick={() => setLocation("/clients")}>
          ← Back
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">

            {/* ── BASIC INFORMATION ── */}
            <SectionHeader title="Basic Information" icon={User} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-10 gap-y-3">
              {/* LEFT */}
              <div className="space-y-3">
                <FormField control={form.control} name="zoneId" render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FieldRow label="Zone" required>
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                        <FormControl>
                          <SelectTrigger className={`${inputCls} w-full`}>
                            <SelectValue placeholder="— Choose a Zone —" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white border-slate-200">
                          {zonesData?.map((z) => (
                            <SelectItem key={z.id} value={z.id.toString()} className="text-xs">{z.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] mt-0.5 text-red-400" />
                    </FieldRow>
                  </FormItem>
                )} />

                <FormField control={form.control} name="subZone" render={({ field }) => (
                  <FieldRow label="Sub-Zone">
                    <Input placeholder="— Choose a Box —" className={inputCls} {...field} />
                  </FieldRow>
                )} />

                <FieldRow label="Network">
                  <Input placeholder="— Choose a Network —" className={inputCls} />
                </FieldRow>

                <FormField control={form.control} name="thisMonthBill" render={({ field }) => (
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <label className="text-right text-[11px] text-slate-500 pr-1">This Month Bill</label>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="auto" id="bill-auto" className="w-3.5 h-3.5 border-slate-300 text-sky-500" />
                        <label htmlFor="bill-auto" className="text-xs text-slate-700 cursor-pointer">
                          Auto ({packagePrice})
                        </label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="manual" id="bill-manual" className="w-3.5 h-3.5 border-slate-300 text-sky-500" />
                        <label htmlFor="bill-manual" className="text-xs text-slate-700 cursor-pointer">Manual</label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="nobill" id="bill-no" className="w-3.5 h-3.5 border-slate-300 text-sky-500" />
                        <label htmlFor="bill-no" className="text-xs text-slate-700 cursor-pointer">No Bill</label>
                      </div>
                    </RadioGroup>
                  </div>
                )} />

                <FormField control={form.control} name="ipAddress" render={({ field }) => (
                  <FieldRow label="IP Address">
                    <Input placeholder="Ex. 192.168.XX.XX" className={inputCls} {...field} />
                  </FieldRow>
                )} />

                <FormField control={form.control} name="permanentDiscount" render={({ field }) => (
                  <FieldRow label="Permanent Discount">
                    <Input type="number" step="0.01" min="0" className={inputCls} {...field} />
                  </FieldRow>
                )} />

                <FormField control={form.control} name="permanentExtraBill" render={({ field }) => (
                  <FieldRow label="Permanent Extra Bill">
                    <Input type="number" step="0.01" min="0" className={inputCls} {...field} />
                  </FieldRow>
                )} />

                <FormField control={form.control} name="nationalId" render={({ field }) => (
                  <FieldRow label="National ID No">
                    <Input placeholder="Ex. NID Number" className={inputCls} {...field} />
                  </FieldRow>
                )} />

                <FormField control={form.control} name="note" render={({ field }) => (
                  <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                    <label className="text-right text-[11px] text-slate-500 pr-1 pt-2">Note</label>
                    <Textarea placeholder="Optional" className="min-h-[72px] bg-white border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 resize-none focus:border-sky-500" {...field} />
                  </div>
                )} />
              </div>

              {/* RIGHT */}
              <div className="space-y-3">
                <FormField control={form.control} name="comId" render={({ field }) => (
                  <FieldRow label="Company ID">
                    <div className="flex gap-1.5">
                      <Input readOnly className={`${inputCls} bg-slate-50 text-amber-600 font-mono font-bold tracking-wider flex-1`} {...field} />
                    </div>
                  </FieldRow>
                )} />

                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FieldRow label="Client Name" required>
                      <Input placeholder="Client Full Name" className={inputCls} {...field} />
                      <FormMessage className="text-[10px] mt-0.5 text-red-400" />
                    </FieldRow>
                  </FormItem>
                )} />

                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FieldRow label="PPPoE ID" required>
                      <Input placeholder="At least 3 characters long" className={inputCls} {...field} />
                      <FormMessage className="text-[10px] mt-0.5 text-red-400" />
                    </FieldRow>
                  </FormItem>
                )} />

                <FormField control={form.control} name="password" render={({ field }) => (
                  <FieldRow label="Password">
                    <Input type="password" placeholder="PPPoE Password" className={inputCls} {...field} />
                  </FieldRow>
                )} />

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FieldRow label="Cell No" required>
                      <Input placeholder="01" className={inputCls} {...field} />
                      <FormMessage className="text-[10px] mt-0.5 text-red-400" />
                    </FieldRow>
                  </FormItem>
                )} />

                <FormField control={form.control} name="sendLoginSms" render={({ field }) => (
                  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                    <label className="text-right text-[11px] text-slate-500 pr-1">Send Login SMS</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={field.value === true} onChange={() => field.onChange(true)} className="w-3 h-3 accent-sky-500" />
                        <span className="text-xs text-slate-700">Yes</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={field.value === false} onChange={() => field.onChange(false)} className="w-3 h-3 accent-sky-500" />
                        <span className="text-xs text-slate-700">No</span>
                      </label>
                    </div>
                  </div>
                )} />

                {/* Payment + Billing Deadline side by side */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <label className="text-right text-[11px] text-slate-500 pr-1">Payment / Bill Deadline</label>
                  <div className="flex gap-2">
                    <FormField control={form.control} name="paymentDate" render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                        <SelectTrigger className={`${inputCls} flex-1`}>
                          <SelectValue placeholder="PD" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 max-h-48">
                          <SelectItem value="0" className="text-xs">NO</SelectItem>
                          {Array.from({ length: 31 }).map((_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()} className="text-xs">{i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} />
                    <FormField control={form.control} name="billDate" render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                        <SelectTrigger className={`${inputCls} flex-1`}>
                          <SelectValue placeholder="BD" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 max-h-48">
                          <SelectItem value="0" className="text-xs">NO</SelectItem>
                          {Array.from({ length: 31 }).map((_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()} className="text-xs">{i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                </div>

                {/* Package */}
                <FormField control={form.control} name="packageId" render={({ field }) => (
                  <FieldRow label="Package">
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                      <SelectTrigger className={`${inputCls} w-full`}>
                        <SelectValue placeholder="— Select Package —" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {packagesData?.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()} className="text-xs">
                            {p.name} — {p.price} Tk
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>
                )} />

                {/* Flat/House/Road */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <label className="text-right text-[11px] text-slate-500 pr-1">Flat / House / Road</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <FormField control={form.control} name="flatNo" render={({ field }) => (
                      <Input placeholder="Flat No" className={inputCls} {...field} />
                    )} />
                    <FormField control={form.control} name="houseNo" render={({ field }) => (
                      <Input placeholder="House No" className={inputCls} {...field} />
                    )} />
                    <FormField control={form.control} name="roadNo" render={({ field }) => (
                      <Input placeholder="Road No" className={inputCls} {...field} />
                    )} />
                  </div>
                </div>

                <FormField control={form.control} name="address" render={({ field }) => (
                  <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                    <label className="text-right text-[11px] text-slate-500 pr-1 pt-2">Present Address</label>
                    <Textarea className="min-h-[60px] bg-white border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 resize-none focus:border-sky-500" placeholder="Full address..." {...field} />
                  </div>
                )} />
              </div>
            </div>
          </div>

          {/* ── DIAGRAM & CONNECTIVITY ── */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
            <CollapsibleSection title="Diagram & Connectivity" icon={Network} defaultOpen>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-10 gap-y-3">
                <div className="space-y-3">
                  <FormField control={form.control} name="cableType" render={({ field }) => (
                    <FieldRow label="Cable Type">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={`${inputCls} w-full`}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          <SelectItem value="UTP" className="text-xs">UTP</SelectItem>
                          <SelectItem value="Fiber" className="text-xs">Fiber</SelectItem>
                          <SelectItem value="Coax" className="text-xs">Coax</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldRow>
                  )} />

                  <FieldRow label="Require Cable">
                    <Input placeholder="Ex. 300ft" className={inputCls} />
                  </FieldRow>

                  <FieldRow label="Connection Mode">
                    <Input value="Active" readOnly className={`${inputCls} bg-slate-50 text-emerald-600`} />
                  </FieldRow>
                </div>

                <div className="space-y-3">
                  <FormField control={form.control} name="macAddress" render={({ field }) => (
                    <FieldRow label="MAC Address">
                      <Input placeholder="XX:XX:XX:XX:XX:XX" className={inputCls} {...field} />
                    </FieldRow>
                  )} />

                  <FormField control={form.control} name="clientType" render={({ field }) => (
                    <FieldRow label="Type of Client">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={`${inputCls} w-full`}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          <SelectItem value="Home" className="text-xs">Home</SelectItem>
                          <SelectItem value="Office" className="text-xs">Office</SelectItem>
                          <SelectItem value="Corporate" className="text-xs">Corporate</SelectItem>
                          <SelectItem value="ISP" className="text-xs">ISP</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldRow>
                  )} />

                  <FormField control={form.control} name="connectivityType" render={({ field }) => (
                    <FieldRow label="Type of Connectivity">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={`${inputCls} w-full`}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          <SelectItem value="Shared" className="text-xs">Shared</SelectItem>
                          <SelectItem value="Dedicated" className="text-xs">Dedicated</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldRow>
                  )} />

                  <FieldRow label="Termination Date">
                    <Input type="date" className={inputCls} />
                  </FieldRow>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* ── ADVANCE ── */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6">
            <CollapsibleSection title="Advance" icon={Settings2}>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-10 gap-y-3">
                <div className="space-y-3">
                  <FormField control={form.control} name="thana" render={({ field }) => (
                    <FieldRow label="Thana">
                      <Input className={inputCls} {...field} />
                    </FieldRow>
                  )} />

                  <FormField control={form.control} name="fatherName" render={({ field }) => (
                    <FieldRow label="Father's Name">
                      <Input className={inputCls} {...field} />
                    </FieldRow>
                  )} />

                  <FormField control={form.control} name="alternativePhone" render={({ field }) => (
                    <FieldRow label="Alternative Cell No">
                      <Input placeholder="Alternative Cell No" className={inputCls} {...field} />
                    </FieldRow>
                  )} />

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FieldRow label="Email">
                      <Input type="email" placeholder="Ex. abc@domain.com" className={inputCls} {...field} />
                    </FieldRow>
                  )} />

                  <FormField control={form.control} name="occupation" render={({ field }) => (
                    <FieldRow label="Occupation">
                      <Input placeholder="Occupation" className={inputCls} {...field} />
                    </FieldRow>
                  )} />

                  <FormField control={form.control} name="permanentAddress" render={({ field }) => (
                    <div className="grid grid-cols-[140px_1fr] items-start gap-2">
                      <label className="text-right text-[11px] text-slate-500 pr-1 pt-2">Permanent Address</label>
                      <Textarea className="min-h-[60px] bg-white border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 resize-none focus:border-sky-500" {...field} />
                    </div>
                  )} />
                </div>

                <div className="space-y-3">
                  <FieldRow label="Agent">
                    <Select>
                      <SelectTrigger className={`${inputCls} w-full`}>
                        <SelectValue placeholder="— None —" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="none" className="text-xs">— None —</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  <FormField control={form.control} name="signupFee" render={({ field }) => (
                    <FieldRow label="Signup Fee">
                      <Input type="number" step="0.01" min="0" placeholder="Ex. 1200" className={inputCls} {...field} />
                    </FieldRow>
                  )} />

                  <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                    <FieldRow label="Payment Method">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={`${inputCls} w-full`}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          <SelectItem value="Cash from Home" className="text-xs">Cash from Home</SelectItem>
                          <SelectItem value="bKash" className="text-xs">bKash</SelectItem>
                          <SelectItem value="Nagad" className="text-xs">Nagad</SelectItem>
                          <SelectItem value="Bank Transfer" className="text-xs">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldRow>
                  )} />

                  <FieldRow label="Bill Man">
                    <Select>
                      <SelectTrigger className={`${inputCls} w-full`}>
                        <SelectValue placeholder="— Choose a Bill Man —" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="none" className="text-xs">— None —</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  <FieldRow label="Technician">
                    <Select>
                      <SelectTrigger className={`${inputCls} w-full`}>
                        <SelectValue placeholder="— Choose a Technician —" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="none" className="text-xs">— None —</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>

                  <FormField control={form.control} name="joiningDate" render={({ field }) => (
                    <FieldRow label="Joining Date" required>
                      <Input type="date" className={inputCls} {...field} />
                    </FieldRow>
                  )} />
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div className="flex justify-end gap-3 pb-4">
            <Button
              type="button"
              variant="outline"
              className="px-6 h-9 text-sm border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              onClick={handleReset}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-2" />
              RESET
            </Button>
            <Button
              type="submit"
              disabled={createClient.isPending}
              className="px-6 h-9 text-sm bg-sky-600 hover:bg-sky-700 text-white font-semibold"
            >
              <Save className="w-3.5 h-3.5 mr-2" />
              {createClient.isPending ? "SAVING..." : "SUBMIT"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
