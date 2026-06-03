import { Router, type IRouter } from "express";
import { db, billsTable, clientsTable, zonesTable, packagesTable } from "@workspace/db";
import { eq, and, ilike, or, desc, count, sum, gte, lte, sql } from "drizzle-orm";
import {
  ListBillsQueryParams,
  ListBillsResponse,
  GetBillsSummaryQueryParams,
  GetBillsSummaryResponse,
  GetBillsMonthlyTrendResponse,
  CollectBillBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { generateMonthlyBills, currentMonthKey } from "../lib/billGenerator";

const router: IRouter = Router();

router.get("/bills/monthly-trend", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      month: billsTable.month,
      bill: sum(billsTable.generatedAmount),
      collection: sum(billsTable.collectedAmount),
      discount: sum(billsTable.discount),
    })
    .from(billsTable)
    .groupBy(billsTable.month)
    .orderBy(billsTable.month);

  res.json(
    GetBillsMonthlyTrendResponse.parse(
      rows.map((r) => ({
        month: r.month,
        bill: parseFloat(r.bill ?? "0"),
        collection: parseFloat(r.collection ?? "0"),
        discount: parseFloat(r.discount ?? "0"),
      }))
    )
  );
});

router.get("/bills/summary", requireAuth, async (req, res): Promise<void> => {
  const query = GetBillsSummaryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const currentMonth = query.data.month ?? new Date().toISOString().slice(0, 7);

  const zoneRows = await db
    .select({
      zoneId: zonesTable.id,
      zoneName: zonesTable.name,
      activeClients: sql<number>`count(case when ${clientsTable.status} = 'Active' then 1 end)::int`,
      inactiveClients: sql<number>`count(case when ${clientsTable.status} = 'Inactive' then 1 end)::int`,
      generatedBill: sum(billsTable.generatedAmount),
      collection: sum(billsTable.collectedAmount),
      discount: sum(billsTable.discount),
      totalDue: sql<string>`coalesce(sum(${billsTable.generatedAmount}) - sum(${billsTable.collectedAmount}), 0)::text`,
    })
    .from(zonesTable)
    .leftJoin(clientsTable, eq(clientsTable.zoneId, zonesTable.id))
    .leftJoin(
      billsTable,
      and(eq(billsTable.clientId, clientsTable.id), eq(billsTable.month, currentMonth))
    )
    .groupBy(zonesTable.id, zonesTable.name)
    .orderBy(zonesTable.name);

  const totals = zoneRows.reduce(
    (acc, r) => ({
      bill: acc.bill + parseFloat(r.generatedBill ?? "0"),
      collection: acc.collection + parseFloat(r.collection ?? "0"),
      discount: acc.discount + parseFloat(r.discount ?? "0"),
    }),
    { bill: 0, collection: 0, discount: 0 }
  );

  res.json(
    GetBillsSummaryResponse.parse({
      month: currentMonth,
      zones: zoneRows.map((z) => {
        const bill = parseFloat(z.generatedBill ?? "0");
        const col = parseFloat(z.collection ?? "0");
        const ratio = bill > 0 ? ((col / bill) * 100).toFixed(2) : "0.00";
        return {
          zoneId: z.zoneId,
          zoneName: z.zoneName,
          activeClients: z.activeClients ?? 0,
          inactiveClients: z.inactiveClients ?? 0,
          generatedBill: (z.generatedBill ?? "0"),
          collection: (z.collection ?? "0"),
          discount: (z.discount ?? "0"),
          totalDue: z.totalDue ?? "0",
          collectionRatio: ratio,
        };
      }),
      totalGeneratedBill: totals.bill.toFixed(2),
      totalCollection: totals.collection.toFixed(2),
      totalDiscount: totals.discount.toFixed(2),
      totalDue: (totals.bill - totals.collection).toFixed(2),
    })
  );
});

router.get("/bills", requireAuth, async (req, res): Promise<void> => {
  const query = ListBillsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { month, zoneId, clientId, status, search, page = 1, limit = 30 } = query.data;
  const offset = (page - 1) * limit;

  const currentMonth = month ?? new Date().toISOString().slice(0, 7);

  const conditions: ReturnType<typeof eq>[] = clientId ? [] : [eq(billsTable.month, currentMonth)];

  if (clientId) {
    conditions.push(eq(billsTable.clientId, clientId));
  }
  if (status && status !== "all") {
    conditions.push(eq(billsTable.status, status));
  }
  if (zoneId) {
    conditions.push(eq(clientsTable.zoneId, zoneId));
  }
  if (search) {
    conditions.push(
      or(
        ilike(clientsTable.username, `%${search}%`),
        ilike(clientsTable.fullName, `%${search}%`),
        ilike(clientsTable.comId, `%${search}%`),
        ilike(clientsTable.phone, `%${search}%`)
      ) as ReturnType<typeof eq>
    );
  }

  const whereClause = and(...conditions);

  const [rows, statsRows, countRows] = await Promise.all([
    db
      .select({
        id: billsTable.id,
        clientId: billsTable.clientId,
        comId: clientsTable.comId,
        username: clientsTable.username,
        fullName: clientsTable.fullName,
        phone: clientsTable.phone,
        zoneName: zonesTable.name,
        zoneId: clientsTable.zoneId,
        address: clientsTable.address,
        packageName: packagesTable.name,
        packagePrice: packagesTable.price,
        ipAddress: clientsTable.ipAddress,
        isOnline: clientsTable.isOnline,
        clientStatus: clientsTable.status,
        paymentDate: clientsTable.paymentDate,
        billDate: clientsTable.billDate,
        month: billsTable.month,
        generatedAmount: billsTable.generatedAmount,
        collectedAmount: billsTable.collectedAmount,
        discount: billsTable.discount,
        extraBill: billsTable.extraBill,
        payableAmount: billsTable.payableAmount,
        status: billsTable.status,
        note: billsTable.note,
        createdAt: billsTable.createdAt,
      })
      .from(billsTable)
      .innerJoin(clientsTable, eq(billsTable.clientId, clientsTable.id))
      .leftJoin(zonesTable, eq(clientsTable.zoneId, zonesTable.id))
      .leftJoin(packagesTable, eq(clientsTable.packageId, packagesTable.id))
      .where(whereClause)
      .orderBy(desc(billsTable.id))
      .limit(limit)
      .offset(offset),

    db
      .select({
        totalBill: count(),
        totalPaid: sql<number>`count(case when ${billsTable.status} = 'paid' then 1 end)::int`,
        totalDue: sql<number>`count(case when ${billsTable.status} = 'due' then 1 end)::int`,
        totalOnline: sql<number>`count(case when ${clientsTable.isOnline} = true then 1 end)::int`,
        totalOffline: sql<number>`count(case when ${clientsTable.isOnline} = false then 1 end)::int`,
      })
      .from(billsTable)
      .innerJoin(clientsTable, eq(billsTable.clientId, clientsTable.id))
      .where(whereClause),

    db
      .select({ total: count() })
      .from(billsTable)
      .innerJoin(clientsTable, eq(billsTable.clientId, clientsTable.id))
      .where(whereClause),
  ]);

  const stats = statsRows[0] ?? { totalBill: 0, totalPaid: 0, totalDue: 0, totalOnline: 0, totalOffline: 0 };

  res.json(
    ListBillsResponse.parse({
      data: rows.map((r) => ({
        ...r,
        comId: r.comId ?? null,
        username: r.username ?? null,
        fullName: r.fullName ?? null,
        phone: r.phone ?? null,
        zoneName: r.zoneName ?? null,
        zoneId: r.zoneId ?? null,
        address: r.address ?? null,
        packageName: r.packageName ?? null,
        packagePrice: r.packagePrice ?? null,
        ipAddress: r.ipAddress ?? null,
        paymentDate: r.paymentDate ?? null,
        billDate: r.billDate ?? null,
        note: r.note ?? null,
        generatedAmount: r.generatedAmount ?? "0",
        collectedAmount: r.collectedAmount ?? "0",
        discount: r.discount ?? "0",
        extraBill: r.extraBill ?? "0",
        payableAmount: r.payableAmount ?? "0",
        createdAt: r.createdAt.toISOString(),
      })),
      total: countRows[0]?.total ?? 0,
      page,
      limit,
      totalBill: stats.totalBill,
      totalPaid: stats.totalPaid,
      totalDue: stats.totalDue,
      totalOnline: stats.totalOnline,
      totalOffline: stats.totalOffline,
    })
  );
});

router.patch("/bills/:id/collect", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid bill id" });
    return;
  }

  const parsed = CollectBillBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { collectedAmount, discount = "0", extraBill, note } = parsed.data;

  const [existing] = await db.select().from(billsTable).where(eq(billsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const generated = parseFloat(existing.generatedAmount ?? "0");
  const extra = parseFloat(extraBill ?? existing.extraBill ?? "0");
  const disc = parseFloat(discount);
  const collected = parseFloat(collectedAmount);
  const payable = generated + extra - disc - collected;

  const [updated] = await db
    .update(billsTable)
    .set({
      collectedAmount: collectedAmount,
      discount: discount,
      extraBill: extra.toFixed(2),
      payableAmount: payable.toFixed(2),
      status: payable <= 0 ? "paid" : "due",
      note: note ?? existing.note,
    })
    .where(eq(billsTable.id, id))
    .returning();

  res.json({
    id: updated.id,
    clientId: updated.clientId,
    month: updated.month,
    generatedAmount: updated.generatedAmount ?? "0",
    collectedAmount: updated.collectedAmount ?? "0",
    discount: updated.discount ?? "0",
    extraBill: updated.extraBill ?? "0",
    payableAmount: updated.payableAmount ?? "0",
    status: updated.status,
    note: updated.note ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.post("/bills/generate", requireAuth, async (req, res): Promise<void> => {
  const month: string = req.body.month ?? currentMonthKey();
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    res.status(400).json({ error: "month must be in YYYY-MM format" });
    return;
  }

  const result = await generateMonthlyBills(month);
  res.json(result);
});

router.post("/bills", requireAuth, async (req, res): Promise<void> => {
  const { clientId, month, generatedAmount, collectedAmount, discount, extraBill, payableAmount, status, note } = req.body;
  if (!clientId || !month) {
    res.status(400).json({ error: "clientId and month required" });
    return;
  }
  const [bill] = await db.insert(billsTable).values({
    clientId,
    month,
    generatedAmount: generatedAmount ?? "0",
    collectedAmount: collectedAmount ?? "0",
    discount: discount ?? "0",
    extraBill: extraBill ?? "0",
    payableAmount: payableAmount ?? "0",
    status: status ?? "due",
    note: note ?? null,
  }).returning();
  res.status(201).json(bill);
});

export default router;
