import { Router, type IRouter } from "express";
import { db, zonesTable, packagesTable, clientsTable } from "@workspace/db";
import { CreateZoneBody, CreatePackageBody, ListZonesResponse, ListPackagesResponse } from "@workspace/api-zod";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/zones", requireAuth, async (_req, res): Promise<void> => {
  const zones = await db.select().from(zonesTable).orderBy(zonesTable.name);
  res.json(
    ListZonesResponse.parse(
      zones.map((z) => ({ ...z, description: z.description ?? null, createdAt: z.createdAt.toISOString() }))
    )
  );
});

router.post("/zones", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateZoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [zone] = await db.insert(zonesTable).values(parsed.data).returning();
  res.status(201).json({ ...zone, description: zone.description ?? null, createdAt: zone.createdAt.toISOString() });
});

router.get("/packages", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: packagesTable.id,
      name: packagesTable.name,
      price: packagesTable.price,
      speed: packagesTable.speed,
      description: packagesTable.description,
      createdAt: packagesTable.createdAt,
      activeClients: sql<number>`count(case when ${clientsTable.status} = 'Active' then 1 end)::int`,
      inactiveClients: sql<number>`count(case when ${clientsTable.status} = 'Inactive' then 1 end)::int`,
      totalClients: sql<number>`count(${clientsTable.id})::int`,
    })
    .from(packagesTable)
    .leftJoin(clientsTable, eq(clientsTable.packageId, packagesTable.id))
    .groupBy(packagesTable.id)
    .orderBy(packagesTable.name);

  res.json(
    ListPackagesResponse.parse(
      rows.map((p) => ({
        ...p,
        price: p.price ?? "0",
        speed: p.speed ?? null,
        description: p.description ?? null,
        createdAt: p.createdAt.toISOString(),
        activeClients: p.activeClients ?? 0,
        inactiveClients: p.inactiveClients ?? 0,
        totalClients: p.totalClients ?? 0,
      }))
    )
  );
});

router.post("/packages", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePackageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [pkg] = await db.insert(packagesTable).values(parsed.data).returning();
  res.status(201).json({
    ...pkg,
    price: pkg.price ?? "0",
    speed: pkg.speed ?? null,
    description: pkg.description ?? null,
    createdAt: pkg.createdAt.toISOString(),
  });
});

export default router;
