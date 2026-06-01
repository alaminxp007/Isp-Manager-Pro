import { ShieldOff } from "lucide-react";

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-20">
      <ShieldOff className="w-12 h-12 text-slate-300" />
      <h3 className="text-base font-semibold text-slate-600">Access Denied</h3>
      <p className="text-sm text-slate-400 max-w-xs">
        You don't have permission to view this page. Contact your administrator to request access.
      </p>
    </div>
  );
}
