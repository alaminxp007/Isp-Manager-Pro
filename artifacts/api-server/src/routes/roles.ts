import { Router, type IRouter } from "express";
import { db, rolesTable, permissionsTable, rolePermissionsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import {
  CreateRoleBody,
  UpdateRoleBody,
  UpdateRoleParams,
  DeleteRoleParams,
  GetRoleParams,
  ListRolesResponse,
  GetRoleResponse,
  UpdateRoleResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function getRoleWithPermissions(roleId: number) {
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, roleId));
  if (!role) return null;

  const rolePerms = await db
    .select({ permission: permissionsTable })
    .from(rolePermissionsTable)
    .innerJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
    .where(eq(rolePermissionsTable.roleId, roleId));

  return {
    ...role,
    description: role.description ?? null,
    createdAt: role.createdAt.toISOString(),
    permissions: rolePerms.map((r) => ({
      ...r.permission,
      description: r.permission.description ?? null,
    })),
  };
}

router.get("/roles", requireAuth, async (req, res): Promise<void> => {
  const roles = await db.select().from(rolesTable).orderBy(rolesTable.createdAt);

  const rolesWithPerms = await Promise.all(roles.map((r) => getRoleWithPermissions(r.id)));

  res.json(ListRolesResponse.parse(rolesWithPerms.filter(Boolean)));
});

router.post("/roles", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { permissionIds, ...roleData } = parsed.data;

  const [role] = await db.insert(rolesTable).values(roleData).returning();

  if (permissionIds && permissionIds.length > 0) {
    await db.insert(rolePermissionsTable).values(
      permissionIds.map((pid) => ({ roleId: role.id, permissionId: pid }))
    );
  }

  const result = await getRoleWithPermissions(role.id);
  res.status(201).json(GetRoleResponse.parse(result));
});

router.get("/roles/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetRoleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await getRoleWithPermissions(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Role not found" });
    return;
  }

  res.json(GetRoleResponse.parse(result));
});

router.patch("/roles/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateRoleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { permissionIds, ...roleData } = parsed.data;

  const [role] = await db
    .update(rolesTable)
    .set(roleData)
    .where(eq(rolesTable.id, params.data.id))
    .returning();

  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }

  if (permissionIds !== undefined) {
    await db
      .delete(rolePermissionsTable)
      .where(eq(rolePermissionsTable.roleId, role.id));

    if (permissionIds.length > 0) {
      await db.insert(rolePermissionsTable).values(
        permissionIds.map((pid) => ({ roleId: role.id, permissionId: pid }))
      );
    }
  }

  const result = await getRoleWithPermissions(role.id);
  res.json(UpdateRoleResponse.parse(result));
});

router.delete("/roles/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteRoleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [role] = await db
    .delete(rolesTable)
    .where(eq(rolesTable.id, params.data.id))
    .returning();

  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
