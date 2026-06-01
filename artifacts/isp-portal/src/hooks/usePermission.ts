import { useAuth } from "@/contexts/AuthContext";

export function usePermission() {
  const { user } = useAuth();

  const can = (permission: string): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return user.role?.permissions?.some((p) => p.name === permission) ?? false;
  };

  const canAny = (...permissions: string[]): boolean =>
    permissions.some((p) => can(p));

  const isSuperAdmin = user?.isSuperAdmin ?? false;

  return { can, canAny, isSuperAdmin };
}
