import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Server, Eye, EyeOff, AlertCircle, Activity } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => login(data.token),
      onError: (error) => setErrorMsg((error.data as any)?.error || "Invalid username or password"),
    },
  });

  function onSubmit(values: LoginFormValues) {
    setErrorMsg(null);
    loginMutation.mutate({ data: values });
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden">

      {/* Subtle dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.2' fill='%230ea5e9' fill-opacity='0.07'/%3E%3C/svg%3E")`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Top sky accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400" />

      <div className="relative z-10 w-full max-w-md px-4">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-sky-600 rounded-2xl shadow-md mb-4">
            <Server className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ISP Manager Pro</h1>
          <p className="text-sky-500 text-xs font-semibold tracking-widest uppercase mt-1">Management Portal</p>
        </div>

        {/* Form card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">

          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-0.5">Sign in to your staff account</p>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-600 text-xs leading-relaxed">{errorMsg}</p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-600 text-xs font-semibold tracking-widest uppercase">
                      Username
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter username"
                        {...field}
                        className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400
                                   focus-visible:ring-1 focus-visible:ring-sky-500 focus-visible:border-sky-400
                                   h-11 rounded-xl text-sm"
                        data-testid="input-username"
                        autoComplete="username"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-600 text-xs font-semibold tracking-widest uppercase">
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPass ? "text" : "password"}
                          placeholder="Enter password"
                          {...field}
                          className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400
                                     focus-visible:ring-1 focus-visible:ring-sky-500 focus-visible:border-sky-400
                                     h-11 rounded-xl text-sm pr-10"
                          data-testid="input-password"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                data-testid="button-submit-login"
                className="w-full h-11 rounded-xl font-semibold text-sm bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-all duration-200"
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Authenticating...
                  </span>
                ) : "Sign In"}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest">Demo</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Demo credentials */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Super Admin Access</p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[10px] text-slate-400">Username</p>
                  <code className="text-xs text-sky-600 font-mono font-semibold">admin</code>
                </div>
                <div className="w-px h-5 bg-slate-200" />
                <div>
                  <p className="text-[10px] text-slate-400">Password</p>
                  <code className="text-xs text-sky-600 font-mono font-semibold">admin123</code>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  form.setValue("username", "admin");
                  form.setValue("password", "admin123");
                }}
                className="text-[10px] bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 hover:border-sky-300 rounded-lg px-2.5 py-1.5 font-semibold transition-all shrink-0"
              >
                Autofill
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 mt-5">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-500" />
            <span className="text-slate-400 text-[11px]">System Operational</span>
          </div>
          <span className="text-slate-300">·</span>
          <p className="text-slate-400 text-[11px]">© {new Date().getFullYear()} ISP Manager Pro</p>
        </div>
      </div>
    </div>
  );
}
