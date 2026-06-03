import { Router, type IRouter } from "express";
import { db, clientsTable, zonesTable, packagesTable } from "@workspace/db";
import { eq, ilike, and, or, count, sql } from "drizzle-orm";
import {
  CreateClientBody,
  UpdateClientBody,
  UpdateClientParams,
  DeleteClientParams,
  GetClientParams,
  ListClientsResponse,
  GetClientResponse,
  ListClientsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function mapClient(c: {
  id: number; comId: string; username: string; fullName: string;
  phone: string | null; zoneId: number | null; subZone: string | null;
  address: string | null; flatNo: string | null; houseNo: string | null;
  roadNo: string | null; thana: string | null; permanentAddress: string | null;
  packageId: number | null; ipAddress: string | null; macAddress: string | null;
  connectionType: string | null; cableType: string | null; clientType: string | null;
  connectivityType: string | null; paymentDate: number | null; billDate: number | null;
  status: string; balance: string | null; isOnline: boolean; email: string | null;
  alternativePhone: string | null; fatherName: string | null; nationalId: string | null;
  occupation: string | null; signupFee: string | null; paymentMethod: string | null;
  joiningDate: string | null; permanentDiscount: string | null;
  permanentExtraBill: string | null; note: string | null;
  createdAt: Date; zoneName: string | null; packageName: string | null;
  packagePrice: string | null;
}) {
  return {
    id: c.id,
    comId: c.comId,
    username: c.username,
    fullName: c.fullName,
    phone: c.phone ?? null,
    zoneId: c.zoneId ?? null,
    subZone: c.subZone ?? null,
    zoneName: c.zoneName ?? null,
    address: c.address ?? null,
    flatNo: c.flatNo ?? null,
    houseNo: c.houseNo ?? null,
    roadNo: c.roadNo ?? null,
    thana: c.thana ?? null,
    permanentAddress: c.permanentAddress ?? null,
    packageId: c.packageId ?? null,
    packageName: c.packageName ?? null,
    packagePrice: c.packagePrice ?? null,
    ipAddress: c.ipAddress ?? null,
    macAddress: c.macAddress ?? null,
    connectionType: c.connectionType ?? null,
    cableType: c.cableType ?? null,
    clientType: c.clientType ?? null,
    connectivityType: c.connectivityType ?? null,
    paymentDate: c.paymentDate ?? null,
    billDate: c.billDate ?? null,
    status: c.status,
    balance: c.balance ?? null,
    isOnline: c.isOnline,
    email: c.email ?? null,
    alternativePhone: c.alternativePhone ?? null,
    fatherName: c.fatherName ?? null,
    nationalId: c.nationalId ?? null,
    occupation: c.occupation ?? null,
    signupFee: c.signupFee ?? null,
    paymentMethod: c.paymentMethod ?? null,
    joiningDate: c.joiningDate ?? null,
    permanentDiscount: c.permanentDiscount ?? null,
    permanentExtraBill: c.permanentExtraBill ?? null,
    note: c.note ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/clients", requireAuth, async (req, res): Promise<void> => {
  const query = ListClientsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { search, zoneId, status, page = 1, limit = 25 } = query.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(clientsTable.fullName, `%${search}%`),
        ilike(clientsTable.username, `%${search}%`),
        ilike(clientsTable.comId, `%${search}%`),
        ilike(clientsTable.phone, `%${search}%`)
      )
    );
  }
  if (zoneId) conditions.push(eq(clientsTable.zoneId, zoneId));
  if (status) conditions.push(eq(clientsTable.status, status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: clientsTable.id,
        comId: clientsTable.comId,
        username: clientsTable.username,
        fullName: clientsTable.fullName,
        phone: clientsTable.phone,
        zoneId: clientsTable.zoneId,
        subZone: clientsTable.subZone,
        address: clientsTable.address,
        flatNo: clientsTable.flatNo,
        houseNo: clientsTable.houseNo,
        roadNo: clientsTable.roadNo,
        thana: clientsTable.thana,
        permanentAddress: clientsTable.permanentAddress,
        packageId: clientsTable.packageId,
        ipAddress: clientsTable.ipAddress,
        macAddress: clientsTable.macAddress,
        connectionType: clientsTable.connectionType,
        cableType: clientsTable.cableType,
        clientType: clientsTable.clientType,
        connectivityType: clientsTable.connectivityType,
        paymentDate: clientsTable.paymentDate,
        billDate: clientsTable.billDate,
        status: clientsTable.status,
        balance: clientsTable.balance,
        isOnline: clientsTable.isOnline,
        email: clientsTable.email,
        alternativePhone: clientsTable.alternativePhone,
        fatherName: clientsTable.fatherName,
        nationalId: clientsTable.nationalId,
        occupation: clientsTable.occupation,
        signupFee: clientsTable.signupFee,
        paymentMethod: clientsTable.paymentMethod,
        joiningDate: clientsTable.joiningDate,
        permanentDiscount: clientsTable.permanentDiscount,
        permanentExtraBill: clientsTable.permanentExtraBill,
        note: clientsTable.note,
        createdAt: clientsTable.createdAt,
        zoneName: zonesTable.name,
        packageName: packagesTable.name,
        packagePrice: packagesTable.price,
      })
      .from(clientsTable)
      .leftJoin(zonesTable, eq(clientsTable.zoneId, zonesTable.id))
      .leftJoin(packagesTable, eq(clientsTable.packageId, packagesTable.id))
      .where(where)
      .orderBy(clientsTable.createdAt)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(clientsTable)
      .where(where),
  ]);

  res.json(
    ListClientsResponse.parse({
      data: rows.map(mapClient),
      total: Number(total),
      page,
      limit,
    })
  );
});

router.post("/clients", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [client] = await db.insert(clientsTable).values(parsed.data).returning();

  const zone = client.zoneId
    ? (await db.select().from(zonesTable).where(eq(zonesTable.id, client.zoneId)))[0]
    : null;
  const pkg = client.packageId
    ? (await db.select().from(packagesTable).where(eq(packagesTable.id, client.packageId)))[0]
    : null;

  res.status(201).json(
    GetClientResponse.parse(
      mapClient({ ...client, zoneName: zone?.name ?? null, packageName: pkg?.name ?? null, packagePrice: pkg?.price ?? null })
    )
  );
});

router.get("/clients/stats", requireAuth, async (req, res): Promise<void> => {
  const [zoneRows, statusRows, monthlyRows] = await Promise.all([
    db
      .select({ zoneName: zonesTable.name, total: count() })
      .from(clientsTable)
      .leftJoin(zonesTable, eq(clientsTable.zoneId, zonesTable.id))
      .groupBy(zonesTable.name),
    db
      .select({ status: clientsTable.status, online: clientsTable.isOnline, total: count() })
      .from(clientsTable)
      .groupBy(clientsTable.status, clientsTable.isOnline),
    db.execute(sql`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS month,
             DATE_TRUNC('month', created_at) AS month_date,
             COUNT(*) AS total
      FROM clients
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month_date, month
      ORDER BY month_date ASC
    `),
  ]);

  const zoneStats = zoneRows.map((r) => ({
    zone: r.zoneName ?? "Unknown",
    total: Number(r.total),
  }));

  let active = 0, inactive = 0, online = 0, offline = 0;
  for (const r of statusRows) {
    const n = Number(r.total);
    if (r.status === "Active") active += n; else inactive += n;
    if (r.isOnline) online += n; else offline += n;
  }

  const monthlyStats = (monthlyRows.rows as { month: string; total: string }[]).map((r) => ({
    month: r.month,
    total: Number(r.total),
  }));

  res.json({ zoneStats, statusStats: { active, inactive, online, offline }, monthlyStats });
});

router.get("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db
    .select({
      id: clientsTable.id,
      comId: clientsTable.comId,
      username: clientsTable.username,
      fullName: clientsTable.fullName,
      phone: clientsTable.phone,
      zoneId: clientsTable.zoneId,
      subZone: clientsTable.subZone,
      address: clientsTable.address,
      flatNo: clientsTable.flatNo,
      houseNo: clientsTable.houseNo,
      roadNo: clientsTable.roadNo,
      thana: clientsTable.thana,
      permanentAddress: clientsTable.permanentAddress,
      packageId: clientsTable.packageId,
      ipAddress: clientsTable.ipAddress,
      macAddress: clientsTable.macAddress,
      connectionType: clientsTable.connectionType,
      cableType: clientsTable.cableType,
      clientType: clientsTable.clientType,
      connectivityType: clientsTable.connectivityType,
      paymentDate: clientsTable.paymentDate,
      billDate: clientsTable.billDate,
      status: clientsTable.status,
      balance: clientsTable.balance,
      isOnline: clientsTable.isOnline,
      email: clientsTable.email,
      alternativePhone: clientsTable.alternativePhone,
      fatherName: clientsTable.fatherName,
      nationalId: clientsTable.nationalId,
      occupation: clientsTable.occupation,
      signupFee: clientsTable.signupFee,
      paymentMethod: clientsTable.paymentMethod,
      joiningDate: clientsTable.joiningDate,
      permanentDiscount: clientsTable.permanentDiscount,
      permanentExtraBill: clientsTable.permanentExtraBill,
      note: clientsTable.note,
      createdAt: clientsTable.createdAt,
      zoneName: zonesTable.name,
      packageName: packagesTable.name,
      packagePrice: packagesTable.price,
    })
    .from(clientsTable)
    .leftJoin(zonesTable, eq(clientsTable.zoneId, zonesTable.id))
    .leftJoin(packagesTable, eq(clientsTable.packageId, packagesTable.id))
    .where(eq(clientsTable.id, params.data.id));

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json(GetClientResponse.parse(mapClient(client)));
});

router.patch("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [client] = await db
    .update(clientsTable)
    .set(parsed.data)
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const zone = client.zoneId
    ? (await db.select().from(zonesTable).where(eq(zonesTable.id, client.zoneId)))[0]
    : null;
  const pkg = client.packageId
    ? (await db.select().from(packagesTable).where(eq(packagesTable.id, client.packageId)))[0]
    : null;

  res.json(
    GetClientResponse.parse(
      mapClient({ ...client, zoneName: zone?.name ?? null, packageName: pkg?.name ?? null, packagePrice: pkg?.price ?? null })
    )
  );
});

router.delete("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db
    .delete(clientsTable)
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
