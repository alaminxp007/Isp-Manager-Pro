import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, rolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateUserBody,
  UpdateUserBody,
  UpdateUserParams,
  DeleteUserParams,
  GetUserParams,
  ListUsersResponse,
  GetUserResponse,
  UpdateUserResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      fullName: usersTable.fullName,
      email: usersTable.email,
      phone: usersTable.phone,
      isActive: usersTable.isActive,
      isSuperAdmin: usersTable.isSuperAdmin,
      roleId: usersTable.roleId,
      createdAt: usersTable.createdAt,
      roleName: rolesTable.name,
    })
    .from(usersTable)
    .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .orderBy(usersTable.createdAt);

  const mapped = users.map((u) => ({
    ...u,
    phone: u.phone ?? null,
    roleId: u.roleId ?? null,
    roleName: u.roleName ?? null,
    createdAt: u.createdAt.toISOString(),
  }));

  res.json(ListUsersResponse.parse(mapped));
});

router.post("/users", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password, ...rest } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({ ...rest, passwordHash })
    .returning();

  let roleName: string | null = null;
  if (user.roleId) {
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, user.roleId));
    roleName = role?.name ?? null;
  }

  res.status(201).json(
    GetUserResponse.parse({
      ...user,
      phone: user.phone ?? null,
      roleId: user.roleId ?? null,
      roleName,
      createdAt: user.createdAt.toISOString(),
    })
  );
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      fullName: usersTable.fullName,
      email: usersTable.email,
      phone: usersTable.phone,
      isActive: usersTable.isActive,
      isSuperAdmin: usersTable.isSuperAdmin,
      roleId: usersTable.roleId,
      createdAt: usersTable.createdAt,
      roleName: rolesTable.name,
    })
    .from(usersTable)
    .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .where(eq(usersTable.id, params.data.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(
    GetUserResponse.parse({
      ...user,
      phone: user.phone ?? null,
      roleId: user.roleId ?? null,
      roleName: user.roleName ?? null,
      createdAt: user.createdAt.toISOString(),
    })
  );
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };

  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  const [user] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let roleName: string | null = null;
  if (user.roleId) {
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, user.roleId));
    roleName = role?.name ?? null;
  }

  res.json(
    UpdateUserResponse.parse({
      ...user,
      phone: user.phone ?? null,
      roleId: user.roleId ?? null,
      roleName,
      createdAt: user.createdAt.toISOString(),
    })
  );
});

router.delete("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
