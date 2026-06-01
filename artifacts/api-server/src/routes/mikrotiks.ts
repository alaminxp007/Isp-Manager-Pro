import { Router, type IRouter } from "express";
import { db, mikrotiksTable, clientsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/mikrotiks", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(mikrotiksTable).orderBy(mikrotiksTable.id);

  const totalClients = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clientsTable);

  const activeClients = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clientsTable)
    .where(eq(clientsTable.status, "Active"));

  const inactiveClients = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clientsTable)
    .where(eq(clientsTable.status, "Inactive"));

  const onlineClients = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clientsTable)
    .where(eq(clientsTable.isOnline, true));

  const stats = {
    totalClients: totalClients[0]?.count ?? 0,
    activeClients: activeClients[0]?.count ?? 0,
    inactiveClients: inactiveClients[0]?.count ?? 0,
    onlineClients: onlineClients[0]?.count ?? 0,
  };

  res.json({
    mikrotiks: rows.map((m) => ({
      ...m,
      webPort: m.webPort ?? null,
      note: m.note ?? null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    stats,
  });
});

router.post("/mikrotiks", requireAuth, async (req, res): Promise<void> => {
  const body = req.body as {
    name?: string;
    publicIp?: string;
    login?: string;
    password?: string;
    autoMkSync?: boolean;
    autoSync?: boolean;
    activeGraph?: boolean;
    webPort?: number | null;
    note?: string;
  };

  if (!body.name?.trim() || !body.publicIp?.trim() || !body.login?.trim() || !body.password?.trim()) {
    res.status(400).json({ error: "name, publicIp, login, and password are required" });
    return;
  }

  const [m] = await db
    .insert(mikrotiksTable)
    .values({
      name: body.name.trim(),
      publicIp: body.publicIp.trim(),
      login: body.login.trim(),
      password: body.password.trim(),
      autoMkSync: body.autoMkSync ?? false,
      autoSync: body.autoSync ?? false,
      activeGraph: body.activeGraph ?? false,
      webPort: body.webPort ?? null,
      note: body.note?.trim() || null,
      status: "disconnected",
    })
    .returning();

  res.status(201).json({
    ...m,
    webPort: m.webPort ?? null,
    note: m.note ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  });
});

router.patch("/mikrotiks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const body = req.body as Record<string, unknown>;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  const fields = ["name", "publicIp", "login", "password", "autoMkSync", "autoSync", "activeGraph", "webPort", "note", "status"];
  for (const f of fields) {
    if (f in body) updateData[f] = body[f] ?? null;
  }

  const [m] = await db.update(mikrotiksTable).set(updateData).where(eq(mikrotiksTable.id, id)).returning();
  if (!m) { res.status(404).json({ error: "MikroTik not found" }); return; }

  res.json({
    ...m,
    webPort: m.webPort ?? null,
    note: m.note ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  });
});

router.delete("/mikrotiks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [m] = await db.delete(mikrotiksTable).where(eq(mikrotiksTable.id, id)).returning();
  if (!m) { res.status(404).json({ error: "MikroTik not found" }); return; }

  res.sendStatus(204);
});

export default router;
