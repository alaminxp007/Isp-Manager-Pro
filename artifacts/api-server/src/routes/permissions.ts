import { Router, type IRouter } from "express";
import { db, permissionsTable } from "@workspace/db";
import { ListPermissionsResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/permissions", requireAuth, async (req, res): Promise<void> => {
  const permissions = await db
    .select()
    .from(permissionsTable)
    .orderBy(permissionsTable.module, permissionsTable.action);

  res.json(
    ListPermissionsResponse.parse(
      permissions.map((p) => ({ ...p, description: p.description ?? null }))
    )
  );
});

export default router;
