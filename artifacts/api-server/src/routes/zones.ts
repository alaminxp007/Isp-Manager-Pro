import { Router, type IRouter } from "express";
import { db, zonesTable, packagesTable, clientsTable, districtsTable, thanasTable, subZonesTable, tjBoxesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// ─── Zone Tree (full hierarchy) ─────────────────────────────────────────────

router.get("/zone-tree", requireAuth, async (_req, res): Promise<void> => {
  const [districts, thanas, zones, subZones, tjBoxes] = await Promise.all([
    db.select().from(districtsTable).orderBy(districtsTable.name),
    db.select().from(thanasTable).orderBy(thanasTable.name),
    db.select().from(zonesTable).orderBy(zonesTable.name),
    db.select().from(subZonesTable).orderBy(subZonesTable.name),
    db.select().from(tjBoxesTable).orderBy(tjBoxesTable.name),
  ]);

  const tree = districts.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description ?? null,
    thanas: thanas
      .filter((t) => t.districtId === d.id)
      .map((t) => ({
        id: t.id,
        name: t.name,
        districtId: t.districtId,
        description: t.description ?? null,
        zones: zones
          .filter((z) => z.thanaId === t.id)
          .map((z) => ({
            id: z.id,
            name: z.name,
            thanaId: z.thanaId ?? null,
            description: z.description ?? null,
            subZones: subZones
              .filter((s) => s.zoneId === z.id)
              .map((s) => ({
                id: s.id,
                name: s.name,
                zoneId: s.zoneId,
                description: s.description ?? null,
                tjBoxes: tjBoxes
                  .filter((b) => b.subZoneId === s.id)
                  .map((b) => ({
                    id: b.id,
                    name: b.name,
                    subZoneId: b.subZoneId,
                    description: b.description ?? null,
                  })),
              })),
          })),
      })),
  }));

  res.json(tree);
});

// ─── Districts ───────────────────────────────────────────────────────────────

router.get("/districts", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(districtsTable).orderBy(districtsTable.name);
  res.json(rows.map((r) => ({ ...r, description: r.description ?? null, createdAt: r.createdAt.toISOString() })));
});

router.post("/districts", requireAuth, async (req, res): Promise<void> => {
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db.insert(districtsTable).values({ name, description }).returning();
  res.status(201).json({ ...row, description: row.description ?? null, createdAt: row.createdAt.toISOString() });
});

router.delete("/districts/:id", requireAuth, async (req, res): Promise<void> => {
  await db.delete(districtsTable).where(eq(districtsTable.id, Number(req.params.id)));
  res.status(204).send();
});

// ─── Thanas ──────────────────────────────────────────────────────────────────

router.get("/thanas", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(thanasTable).orderBy(thanasTable.name);
  res.json(rows.map((r) => ({ ...r, description: r.description ?? null, createdAt: r.createdAt.toISOString() })));
});

router.post("/thanas", requireAuth, async (req, res): Promise<void> => {
  const { name, districtId, description } = req.body;
  if (!name || !districtId) { res.status(400).json({ error: "name and districtId are required" }); return; }
  const [row] = await db.insert(thanasTable).values({ name, districtId: Number(districtId), description }).returning();
  res.status(201).json({ ...row, description: row.description ?? null, createdAt: row.createdAt.toISOString() });
});

router.delete("/thanas/:id", requireAuth, async (req, res): Promise<void> => {
  await db.delete(thanasTable).where(eq(thanasTable.id, Number(req.params.id)));
  res.status(204).send();
});

// ─── Zones ───────────────────────────────────────────────────────────────────

router.get("/zones", requireAuth, async (_req, res): Promise<void> => {
  const zones = await db.select().from(zonesTable).orderBy(zonesTable.name);
  res.json(zones.map((z) => ({ ...z, description: z.description ?? null, thanaId: z.thanaId ?? null, createdAt: z.createdAt.toISOString() })));
});

router.post("/zones", requireAuth, async (req, res): Promise<void> => {
  const { name, thanaId, description } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [zone] = await db.insert(zonesTable).values({ name, thanaId: thanaId ? Number(thanaId) : undefined, description }).returning();
  res.status(201).json({ ...zone, description: zone.description ?? null, thanaId: zone.thanaId ?? null, createdAt: zone.createdAt.toISOString() });
});

router.delete("/zones/:id", requireAuth, async (req, res): Promise<void> => {
  await db.delete(zonesTable).where(eq(zonesTable.id, Number(req.params.id)));
  res.status(204).send();
});

// ─── Sub-Zones ────────────────────────────────────────────────────────────────

router.get("/sub-zones", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(subZonesTable).orderBy(subZonesTable.name);
  res.json(rows.map((r) => ({ ...r, description: r.description ?? null, createdAt: r.createdAt.toISOString() })));
});

router.post("/sub-zones", requireAuth, async (req, res): Promise<void> => {
  const { name, zoneId, description } = req.body;
  if (!name || !zoneId) { res.status(400).json({ error: "name and zoneId are required" }); return; }
  const [row] = await db.insert(subZonesTable).values({ name, zoneId: Number(zoneId), description }).returning();
  res.status(201).json({ ...row, description: row.description ?? null, createdAt: row.createdAt.toISOString() });
});

router.delete("/sub-zones/:id", requireAuth, async (req, res): Promise<void> => {
  await db.delete(subZonesTable).where(eq(subZonesTable.id, Number(req.params.id)));
  res.status(204).send();
});

// ─── TJ/Boxes ────────────────────────────────────────────────────────────────

router.get("/tj-boxes", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(tjBoxesTable).orderBy(tjBoxesTable.name);
  res.json(rows.map((r) => ({ ...r, description: r.description ?? null, createdAt: r.createdAt.toISOString() })));
});

router.post("/tj-boxes", requireAuth, async (req, res): Promise<void> => {
  const { name, subZoneId, description } = req.body;
  if (!name || !subZoneId) { res.status(400).json({ error: "name and subZoneId are required" }); return; }
  const [row] = await db.insert(tjBoxesTable).values({ name, subZoneId: Number(subZoneId), description }).returning();
  res.status(201).json({ ...row, description: row.description ?? null, createdAt: row.createdAt.toISOString() });
});

router.delete("/tj-boxes/:id", requireAuth, async (req, res): Promise<void> => {
  await db.delete(tjBoxesTable).where(eq(tjBoxesTable.id, Number(req.params.id)));
  res.status(204).send();
});

// ─── Packages (kept here for colocation) ─────────────────────────────────────

router.get("/packages", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: packagesTable.id,
      name: packagesTable.name,
      price: packagesTable.price,
      speed: packagesTable.speed,
      description: packagesTable.description,
      mikrotikProfile: packagesTable.mikrotikProfile,
      createdAt: packagesTable.createdAt,
      activeClients: sql<number>`count(case when ${clientsTable.status} = 'Active' then 1 end)::int`,
      inactiveClients: sql<number>`count(case when ${clientsTable.status} = 'Inactive' then 1 end)::int`,
      totalClients: sql<number>`count(${clientsTable.id})::int`,
    })
    .from(packagesTable)
    .leftJoin(clientsTable, eq(clientsTable.packageId, packagesTable.id))
    .groupBy(packagesTable.id)
    .orderBy(packagesTable.name);

  res.json(rows.map((p) => ({
    ...p,
    price: p.price ?? "0",
    speed: p.speed ?? null,
    description: p.description ?? null,
    mikrotikProfile: p.mikrotikProfile ?? null,
    createdAt: p.createdAt.toISOString(),
    activeClients: p.activeClients ?? 0,
    inactiveClients: p.inactiveClients ?? 0,
    totalClients: p.totalClients ?? 0,
  })));
});

router.post("/packages", requireAuth, async (req, res): Promise<void> => {
  const { name, price, speed, description, mikrotikProfile } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [pkg] = await db.insert(packagesTable).values({
    name, price, speed, description,
    mikrotikProfile: mikrotikProfile ?? null,
  }).returning();
  res.status(201).json({
    ...pkg,
    price: pkg.price ?? "0",
    speed: pkg.speed ?? null,
    description: pkg.description ?? null,
    mikrotikProfile: pkg.mikrotikProfile ?? null,
    createdAt: pkg.createdAt.toISOString(),
  });
});

export default router;
