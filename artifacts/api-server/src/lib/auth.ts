import { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { db, usersTable, rolesTable, permissionsTable, rolePermissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "isp-manager-pro-secret-key-change-in-production";
const TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

function b64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function fromB64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function generateToken(userId: number): string {
  const payload = b64url(JSON.stringify({ userId, iat: Math.floor(Date.now() / 1000) }));
  const sig = createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function storeToken(_token: string, _userId: number): void {
  // no-op: tokens are stateless — no store needed
}

export function revokeToken(_token: string): void {
  // no-op: logout clears token from client side only
}

export function getUserIdFromToken(token: string): number | null {
  try {
    const dot = token.indexOf(".");
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);

    const expected = createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

    const data = JSON.parse(fromB64url(payload)) as { userId: number; iat: number };
    const now = Math.floor(Date.now() / 1000);
    if (now - data.iat > TOKEN_EXPIRY_SECONDS) return null;

    return data.userId;
  } catch {
    return null;
  }
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
