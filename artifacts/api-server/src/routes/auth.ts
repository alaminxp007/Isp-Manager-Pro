import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  LoginBody,
  LoginResponse,
  GetCurrentUserResponse,
} from "@workspace/api-zod";
import {
  generateToken,
  storeToken,
  revokeToken,
  getUserIdFromToken,
  getUserWithRole,
} from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const result = await getUserWithRole(user.id);
  if (!result) {
    res.status(500).json({ error: "Failed to load user data" });
    return;
  }

  const token = generateToken(user.id);
  storeToken(token, user.id);

  const roleData = result.role
    ? {
        id: result.role.id,
        name: result.role.name,
        description: result.role.description ?? null,
        permissions: result.role.permissions,
        createdAt: result.role.createdAt.toISOString(),
      }
    : {
        id: 0,
        name: "Super Admin",
        description: "Full system access",
        permissions: [],
        createdAt: new Date().toISOString(),
      };

  const responseData = {
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: roleData,
      isSuperAdmin: user.isSuperAdmin,
    },
    token,
  };

  res.json(LoginResponse.parse(responseData));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    revokeToken(authHeader.slice(7));
  }
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
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

  const roleData = result.role
    ? {
        id: result.role.id,
        name: result.role.name,
        description: result.role.description ?? null,
        permissions: result.role.permissions,
        createdAt: result.role.createdAt.toISOString(),
      }
    : {
        id: 0,
        name: "Super Admin",
        description: "Full system access",
        permissions: [],
        createdAt: new Date().toISOString(),
      };

  const responseData = {
    id: result.user.id,
    username: result.user.username,
    fullName: result.user.fullName,
    email: result.user.email,
    role: roleData,
    isSuperAdmin: result.user.isSuperAdmin,
  };

  res.json(GetCurrentUserResponse.parse(responseData));
});

export default router;
