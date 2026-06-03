import { Router, type IRouter } from "express";
import { RouterOSAPI } from "node-routeros";
import { db, mikrotiksTable, clientsTable, packagesTable } from "@workspace/db";
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

async function mkQuery(
  mk: { publicIp: string; login: string; password: string; webPort: number | null },
  command: string,
  params: string[] = []
): Promise<Array<Record<string, string>>> {
  const port = mk.webPort ?? 8728;
  const conn = new RouterOSAPI({
    host: mk.publicIp,
    user: mk.login,
    password: mk.password,
    port,
    timeout: 10,
    keepalive: false,
  });

  await conn.connect();
  try {
    const data = await conn.write(command, params) as Array<Record<string, string>>;
    return Array.isArray(data) ? data : [];
  } finally {
    conn.close();
  }
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

router.get("/mikrotiks/profiles", requireAuth, async (req, res): Promise<void> => {
  const mikrotikId = req.query["mikrotikId"] ? parseInt(String(req.query["mikrotikId"]), 10) : null;

  let mksToQuery: typeof mikrotiksTable.$inferSelect[] = [];

  if (mikrotikId && !isNaN(mikrotikId)) {
    const [mk] = await db.select().from(mikrotiksTable).where(eq(mikrotiksTable.id, mikrotikId));
    if (!mk) { res.status(404).json({ error: "MikroTik not found" }); return; }
    mksToQuery = [mk];
  } else {
    mksToQuery = await db.select().from(mikrotiksTable).where(eq(mikrotiksTable.status, "connected"));
  }

  if (mksToQuery.length === 0) {
    res.json({ profiles: [] });
    return;
  }

  const allProfiles: Array<{ name: string; rateLimit: string | null; mikrotikName: string }> = [];

  await Promise.all(mksToQuery.map(async (mk) => {
    try {
      const profiles = await mkQuery(mk, "/ppp/profile/print");
      profiles.forEach((p) => {
        if (p["name"] && p["name"] !== "*0") {
          allProfiles.push({
            name: p["name"],
            rateLimit: p["rate-limit"] ?? null,
            mikrotikName: mk.name,
          });
        }
      });
    } catch {
      // skip unavailable MikroTik
    }
  }));

  const unique = Array.from(
    new Map(allProfiles.map((p) => [p.name, p])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  res.json({ profiles: unique });
});

router.get("/mikrotiks/:id/ppp-secrets", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [mk] = await db.select().from(mikrotiksTable).where(eq(mikrotiksTable.id, id));
  if (!mk) { res.status(404).json({ error: "not found" }); return; }
  if (mk.status !== "connected") { res.status(400).json({ error: "MikroTik is not connected" }); return; }

  const secrets = await mkQuery(mk, "/ppp/secret/print");
  const list = secrets.map((s) => ({
    id: s[".id"] ?? "",
    name: s["name"] ?? "",
    service: s["service"] ?? "pppoe",
    profile: s["profile"] ?? "",
    remoteAddress: s["remote-address"] ?? "",
    comment: s["comment"] ?? "",
    disabled: s["disabled"] === "true",
  }));

  res.json({ secrets: list, total: list.length });
});

router.post("/mikrotiks/:id/test", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [mk] = await db.select().from(mikrotiksTable).where(eq(mikrotiksTable.id, id));
  if (!mk) { res.status(404).json({ error: "MikroTik not found" }); return; }

  try {
    const [resourceRows, boardRows] = await Promise.all([
      mkQuery(mk, "/system/resource/print"),
      mkQuery(mk, "/system/routerboard/print"),
    ]);

    const res_data = resourceRows[0] ?? null;
    const board_data = boardRows[0] ?? null;

    const updateData: Record<string, unknown> = {
      status: "connected",
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    };

    if (res_data?.["board-name"]) updateData.boardName = res_data["board-name"];
    if (board_data?.["model"]) updateData.model = board_data["model"];
    if (board_data?.["serial-number"]) updateData.macAddress = board_data["serial-number"];

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
    const active = await mkQuery(mk, "/ppp/active/print");
    const connections = active.map((c) => ({
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
      mkQuery(mk, "/ppp/secret/print"),
      mkQuery(mk, "/ppp/active/print"),
    ]);

    const activeNames = new Set(active.map((a) => a["name"]));
    const activeByName = new Map(active.map((a) => [a["name"], a]));

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

router.get("/mikrotiks/:id/import-clients", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [mk] = await db.select().from(mikrotiksTable).where(eq(mikrotiksTable.id, id));
  if (!mk) { res.status(404).json({ error: "not found" }); return; }
  if (mk.status !== "connected") { res.status(400).json({ error: "MikroTik is not connected" }); return; }

  const secretList = await mkQuery(mk, "/ppp/secret/print");

  const existingClients = await db.select({ username: clientsTable.username }).from(clientsTable);
  const existingUsernames = new Set(existingClients.map((c) => c.username));

  const packages = await db.select({ id: packagesTable.id, name: packagesTable.name, mikrotikProfile: packagesTable.mikrotikProfile }).from(packagesTable);
  const profileToPackage = new Map(packages.filter((p) => p.mikrotikProfile).map((p) => [p.mikrotikProfile!, p]));

  const importable = secretList
    .filter((s) => s["name"] && !existingUsernames.has(s["name"]))
    .map((s) => {
      const profile = s["profile"] ?? "";
      const pkg = profileToPackage.get(profile) ?? null;
      return {
        username: s["name"],
        profile,
        fullName: s["comment"] || s["name"],
        disabled: s["disabled"] === "true",
        remoteAddress: s["remote-address"] ?? "",
        packageId: pkg?.id ?? null,
        packageName: pkg?.name ?? null,
      };
    });

  res.json({ importable, total: importable.length, existing: existingUsernames.size });
});

router.post("/mikrotiks/:id/import-clients", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [mk] = await db.select().from(mikrotiksTable).where(eq(mikrotiksTable.id, id));
  if (!mk) { res.status(404).json({ error: "not found" }); return; }

  const body = req.body as { usernames?: string[] };
  const usernames = body.usernames ?? [];
  if (!Array.isArray(usernames) || usernames.length === 0) {
    res.status(400).json({ error: "usernames array is required" }); return;
  }

  const secretList = await mkQuery(mk, "/ppp/secret/print");

  const packages = await db.select({ id: packagesTable.id, name: packagesTable.name, mikrotikProfile: packagesTable.mikrotikProfile }).from(packagesTable);
  const profileToPackage = new Map(packages.filter((p) => p.mikrotikProfile).map((p) => [p.mikrotikProfile!, p]));

  const toImport = secretList.filter((s) => usernames.includes(s["name"] ?? ""));

  let imported = 0;
  let skipped = 0;

  for (const s of toImport) {
    const username = s["name"] ?? "";
    if (!username) continue;

    const existing = await db.select({ id: clientsTable.id }).from(clientsTable).where(eq(clientsTable.username, username)).limit(1);
    if (existing.length > 0) { skipped++; continue; }

    const profile = s["profile"] ?? "";
    const pkg = profileToPackage.get(profile) ?? null;
    const status = s["disabled"] === "true" ? "Inactive" : "Active";
    const comId = `MK-${Date.now()}-${imported}`;

    await db.insert(clientsTable).values({
      comId,
      username,
      fullName: s["comment"]?.trim() || username,
      status,
      isOnline: false,
      packageId: pkg?.id ?? null,
      ipAddress: s["remote-address"] || null,
      note: `Imported from MikroTik: ${mk.name}`,
    });
    imported++;
  }

  res.json({ success: true, imported, skipped, total: toImport.length });
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
    await mkQuery(mk, "/ppp/active/remove", [`=.id=${sessionId}`]);

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
