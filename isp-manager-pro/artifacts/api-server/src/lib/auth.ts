import { Request, Response, NextFunction } from "express";
import { db, usersTable, rolesTable, permissionsTable, rolePermissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const TOKEN_PREFIX = "isp_";

export function generateToken(userId: number): string {
  return `${TOKEN_PREFIX}${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

const tokenStore = new Map<string, number>();

export function storeToken(token: string, userId: number): void {
  tokenStore.set(token, userId);
}

export function revokeToken(token: string): void {
  tokenStore.delete(token);
}

export function getUserIdFromToken(token: string): number | null {
  return tokenStore.get(token) ?? null;
}

export async function getUserWithRole(userId: number) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) return null;

  let role = null;
  if (user.roleId) {
    const [roleRow] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.id, user.roleId));

    if (roleRow) {
      const rolePerms = await db
        .select({ permission: permissionsTable })
        .from(rolePermissionsTable)
        .innerJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
        .where(eq(rolePermissionsTable.roleId, roleRow.id));

      role = {
        ...roleRow,
        permissions: rolePerms.map((r) => r.permission),
      };
    }
  }

  return { user, role };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const userId = getUserIdFromToken(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const result = await getUserWithRole(userId);
  if (!result || !result.user.isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }

  (req as Request & { userId: number; currentUser: typeof result }).userId = userId;
  (req as Request & { userId: number; currentUser: typeof result }).currentUser = result;

  next();
}
