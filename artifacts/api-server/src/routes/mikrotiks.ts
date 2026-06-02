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

async function mkFetch(
  mk: { publicIp: string; login: string; password: string; webPort: number | null },
  path: string,
  method = "GET",
  body?: object
): Promise<unknown> {
  const port = mk.webPort ?? 80;
  const url = `http://${mk.publicIp}:${port}/rest${path}`;
  const auth = Buffer.from(`${mk.login}:${mk.password}`).toString("base64");

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`RouterOS ${res.status}: ${text || res.statusText}`);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") return {};
  return res.json().catch(() => ({}));
}

function formatBytes(bytes: number | string): string {
  const n = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(n) || n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
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

router.post("/mikrotiks/:id/test", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [mk] = await db.select().from(mikrotiksTable).where(eq(mikrotiksTable.id, id));
  if (!mk) { res.status(404).json({ error: "MikroTik not found" }); return; }

  try {
    const [resource, board] = await Promise.allSettled([
      mkFetch(mk, "/system/resource"),
      mkFetch(mk, "/system/routerboard"),
    ]);

    const res_data = resource.status === "fulfilled" ? resource.value as Record<string, string> : null;
    const board_data = board.status === "fulfilled" ? board.value as Record<string, string> : null;

    const updateData: Record<string, unknown> = {
      status: "connected",
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    };

    if (res_data?.["board-name"]) updateData.boardName = res_data["board-name"];
    if (board_data?.["model"]) updateData.model = board_data["model"];
    if (board_data?.["serial-number"]) updateData.macAddress = board_data["serial-number"];
    if (res_data?.["platform"]) updateData.note = null;

    const [updated] = await db.update(mikrotiksTable).set(updateData).where(eq(mikrotiksTable.id, id)).returning();

    res.json({
      success: true,
      resource: res_data,
      board: board_data,
      mikrotik: mapMikrotik(updated),
    });
  } catch (err) {
    await db.update(mikrotiksTable).set({ status: "disconnected", updatedAt: new Date() }).where(eq(mikrotiksTable.id, id));
    res.status(503).json({ error: `Connection failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

router.get("/mikrotiks/:id/active", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [mk] = await db.select().from(mikrotiksTable).where(eq(mikrotiksTable.id, id));
  if (!mk) { res.status(404).json({ error: "MikroTik not found" }); return; }

  try {
    const active = await mkFetch(mk, "/ppp/active") as Array<Record<string, string>>;
    const connections = (Array.isArray(active) ? active : []).map((c) => ({
      id: c[".id"] ?? "",
      name: c["name"] ?? "",
      service: c["service"] ?? "pppoe",
      callerIp: c["caller-id"] ?? "",
      address: c["address"] ?? "",
      uptime: c["uptime"] ?? "",
      txByte: formatBytes(c["tx-byte"] ?? "0"),
      rxByte: formatBytes(c["rx-byte"] ?? "0"),
      encoding: c["encoding"] ?? "",
    }));
    res.json({ connections, total: connections.length });
  } catch (err) {
    res.status(503).json({ error: `Failed to fetch active connections: ${err instanceof Error ? err.message : String(err)}` });
  }
});

router.post("/mikrotiks/:id/sync", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [mk] = await db.select().from(mikrotiksTable).where(eq(mikrotiksTable.id, id));
  if (!mk) { res.status(404).json({ error: "MikroTik not found" }); return; }

  try {
    const [secrets, active] = await Promise.all([
      mkFetch(mk, "/ppp/secret") as Promise<Array<Record<string, string>>>,
      mkFetch(mk, "/ppp/active") as Promise<Array<Record<string, string>>>,
    ]);

    const activeNames = new Set((Array.isArray(active) ? active : []).map((a) => a["name"]));
    const activeByName = new Map((Array.isArray(active) ? active : []).map((a) => [a["name"], a]));

    let updated = 0;
    let notFound = 0;

    for (const secret of (Array.isArray(secrets) ? secrets : [])) {
      const username = secret["name"];
      if (!username) continue;

      const isOnline = activeNames.has(username);
      const activeSession = activeByName.get(username);

      const [client] = await db
        .select({ id: clientsTable.id })
        .from(clientsTable)
        .where(eq(clientsTable.username, username))
        .limit(1);

      if (client) {
        await db.update(clientsTable).set({
          isOnline,
          ipAddress: activeSession?.["address"] ?? null,
          updatedAt: new Date(),
        }).where(eq(clientsTable.id, client.id));
        updated++;
      } else {
        notFound++;
      }
    }

    await db.update(mikrotiksTable).set({
      lastSyncAt: new Date(),
      status: "connected",
      updatedAt: new Date(),
    }).where(eq(mikrotiksTable.id, id));

    res.json({
      success: true,
      synced: updated,
      notFound,
      totalSecrets: (Array.isArray(secrets) ? secrets : []).length,
      totalActive: activeNames.size,
    });
  } catch (err) {
    res.status(503).json({ error: `Sync failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

router.post("/mikrotiks/:id/disconnect", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const body = req.body as Record<string, unknown>;
  const sessionId = String(body["sessionId"] ?? "").trim();
  const username = String(body["username"] ?? "").trim();

  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }

  const [mk] = await db.select().from(mikrotiksTable).where(eq(mikrotiksTable.id, id));
  if (!mk) { res.status(404).json({ error: "MikroTik not found" }); return; }

  try {
    await mkFetch(mk, `/ppp/active/${encodeURIComponent(sessionId)}/remove`, "POST");

    if (username) {
      const [client] = await db.select({ id: clientsTable.id }).from(clientsTable).where(eq(clientsTable.username, username)).limit(1);
      if (client) {
        await db.update(clientsTable).set({ isOnline: false, updatedAt: new Date() }).where(eq(clientsTable.id, client.id));
      }
    }

    res.json({ success: true, message: `${username || sessionId} disconnected` });
  } catch (err) {
    res.status(503).json({ error: `Disconnect failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

export default router;
