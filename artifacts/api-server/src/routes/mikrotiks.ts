import { Router, type IRouter } from "express";
import { db, mikrotiksTable, clientsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function mapMikrotik(m: typeof mikrotiksTable.$inferSelect) {
  return {
    id: m.id,
    name: m.name,
    publicIp: m.publicIp,
    login: m.login,
    password: m.password,
    autoMkSync: m.autoMkSync,
    autoSync: m.autoSync,
    activeGraph: m.activeGraph,
    webPort: m.webPort ?? null,
    note: m.note ?? null,
    status: m.status,
    model: m.model ?? null,
    macAddress: m.macAddress ?? null,
    boardName: m.boardName ?? null,
    lastSyncAt: m.lastSyncAt ? m.lastSyncAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

router.get("/mikrotiks", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(mikrotiksTable).orderBy(mikrotiksTable.id);

  const [totalRow] = await db.select({ count: sql<number>`count(*)::int` }).from(clientsTable);
  const [activeRow] = await db.select({ count: sql<number>`count(*)::int` }).from(clientsTable).where(eq(clientsTable.status, "Active"));
  const [inactiveRow] = await db.select({ count: sql<number>`count(*)::int` }).from(clientsTable).where(eq(clientsTable.status, "Inactive"));
  const [onlineRow] = await db.select({ count: sql<number>`count(*)::int` }).from(clientsTable).where(eq(clientsTable.isOnline, true));

  const stats = {
    totalClients: totalRow?.count ?? 0,
    activeClients: activeRow?.count ?? 0,
    inactiveClients: inactiveRow?.count ?? 0,
    onlineClients: onlineRow?.count ?? 0,
  };

  res.json({ mikrotiks: rows.map(mapMikrotik), stats });
});

router.post("/mikrotiks", requireAuth, async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  const name = String(body["name"] ?? "").trim();
  const publicIp = String(body["publicIp"] ?? "").trim();
  const login = String(body["login"] ?? "").trim();
  const password = String(body["password"] ?? "").trim();

  if (!name || !publicIp || !login || !password) {
    res.status(400).json({ error: "name, publicIp, login, and password are required" });
    return;
  }

  const [m] = await db
    .insert(mikrotiksTable)
    .values({
      name,
      publicIp,
      login,
      password,
      autoMkSync: Boolean(body["autoMkSync"] ?? false),
      autoSync: Boolean(body["autoSync"] ?? false),
      activeGraph: Boolean(body["activeGraph"] ?? false),
      webPort: body["webPort"] ? Number(body["webPort"]) : null,
      note: body["note"] ? String(body["note"]).trim() : null,
      model: body["model"] ? String(body["model"]).trim() : null,
      macAddress: body["macAddress"] ? String(body["macAddress"]).trim() : null,
      boardName: body["boardName"] ? String(body["boardName"]).trim() : null,
      status: "disconnected",
    })
    .returning();

  res.status(201).json(mapMikrotik(m));
});

router.patch("/mikrotiks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const body = req.body as Record<string, unknown>;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  const fields = [
    "name", "publicIp", "login", "password",
    "autoMkSync", "autoSync", "activeGraph",
    "webPort", "note", "status",
    "model", "macAddress", "boardName", "lastSyncAt",
  ];
  for (const f of fields) {
    if (f in body) updateData[f] = body[f] ?? null;
  }

  const [m] = await db.update(mikrotiksTable).set(updateData).where(eq(mikrotiksTable.id, id)).returning();
  if (!m) { res.status(404).json({ error: "MikroTik not found" }); return; }

  res.json(mapMikrotik(m));
});

router.delete("/mikrotiks/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [m] = await db.delete(mikrotiksTable).where(eq(mikrotiksTable.id, id)).returning();
  if (!m) { res.status(404).json({ error: "MikroTik not found" }); return; }

  res.sendStatus(204);
});

export default router;
