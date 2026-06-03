import { Router, type IRouter } from "express";
import { db, paymentsTable, clientsTable } from "@workspace/db";
import { eq, and, gte, lte, desc, count, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ListPaymentsQueryParams, CreatePaymentBody, ListPaymentsResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const autoClient = alias(clientsTable, "auto_client");
const forceClient = alias(clientsTable, "force_client");

router.get("/payments", requireAuth, async (req, res): Promise<void> => {
  const query = ListPaymentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { dateFrom, dateTo, gateway, referenceStatus, search, page = 1, limit = 30 } = query.data;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];

  if (gateway && gateway !== "all") {
    conditions.push(eq(paymentsTable.gateway, gateway));
  }
  if (referenceStatus === "matched") {
    conditions.push(eq(paymentsTable.status, "matched"));
  } else if (referenceStatus === "unmatched") {
    conditions.push(eq(paymentsTable.status, "unmatched"));
  } else if (referenceStatus === "without_ref") {
    conditions.push(eq(paymentsTable.status, "without_ref"));
  }
  if (dateFrom) {
    conditions.push(gte(paymentsTable.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(paymentsTable.createdAt, end));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalsRows, countRows] = await Promise.all([
    db
      .select({
        id: paymentsTable.id,
        gateway: paymentsTable.gateway,
        transactionId: paymentsTable.transactionId,
        deviceId: paymentsTable.deviceId,
        referenceId: paymentsTable.referenceId,
        autoClientId: paymentsTable.autoClientId,
        autoClientName: autoClient.fullName,
        autoClientPhone: autoClient.phone,
        autoClientUsername: autoClient.username,
        forceClientId: paymentsTable.forceClientId,
        forceClientName: forceClient.fullName,
        forceClientPhone: forceClient.phone,
        forceClientUsername: forceClient.username,
        amount: paymentsTable.amount,
        charged: paymentsTable.charged,
        countAmount: paymentsTable.countAmount,
        status: paymentsTable.status,
        note: paymentsTable.note,
        createdAt: paymentsTable.createdAt,
      })
      .from(paymentsTable)
      .leftJoin(autoClient, eq(paymentsTable.autoClientId, autoClient.id))
      .leftJoin(forceClient, eq(paymentsTable.forceClientId, forceClient.id))
      .where(whereClause)
      .orderBy(desc(paymentsTable.id))
      .limit(limit)
      .offset(offset),

    db
      .select({
        totalCollection: sum(paymentsTable.amount),
        totalCharged: sum(paymentsTable.charged),
        totalCount: sum(paymentsTable.countAmount),
      })
      .from(paymentsTable)
      .where(whereClause),

    db
      .select({ total: count() })
      .from(paymentsTable)
      .where(whereClause),
  ]);

  const totals = totalsRows[0] ?? { totalCollection: "0", totalCharged: "0", totalCount: "0" };

  res.json(
    ListPaymentsResponse.parse({
      data: rows.map((r) => ({
        ...r,
        transactionId: r.transactionId ?? null,
        deviceId: r.deviceId ?? null,
        referenceId: r.referenceId ?? null,
        autoClientId: r.autoClientId ?? null,
        autoClientName: r.autoClientName ?? null,
        autoClientPhone: r.autoClientPhone ?? null,
        autoClientUsername: r.autoClientUsername ?? null,
        forceClientId: r.forceClientId ?? null,
        forceClientName: r.forceClientName ?? null,
        forceClientPhone: r.forceClientPhone ?? null,
        forceClientUsername: r.forceClientUsername ?? null,
        note: r.note ?? null,
        amount: r.amount ?? "0",
        charged: r.charged ?? "0",
        countAmount: r.countAmount ?? "0",
        createdAt: r.createdAt.toISOString(),
      })),
      total: countRows[0]?.total ?? 0,
      page,
      limit,
      totalCollection: totals.totalCollection ?? "0",
      totalCharged: totals.totalCharged ?? "0",
      totalCount: totals.totalCount ?? "0",
    })
  );
});

router.post("/payments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [payment] = await db
    .insert(paymentsTable)
    .values({
      gateway: data.gateway,
      transactionId: data.transactionId ?? null,
      deviceId: data.deviceId ?? null,
      referenceId: data.referenceId ?? null,
      autoClientId: data.autoClientId ?? null,
      forceClientId: data.forceClientId ?? null,
      amount: data.amount ?? "0",
      charged: data.charged ?? "0",
      countAmount: data.countAmount ?? data.amount ?? "0",
      status: data.status ?? "matched",
      note: data.note ?? null,
    })
    .returning();

  res.status(201).json({
    id: payment.id,
    gateway: payment.gateway,
    transactionId: payment.transactionId ?? null,
    deviceId: payment.deviceId ?? null,
    referenceId: payment.referenceId ?? null,
    autoClientId: payment.autoClientId ?? null,
    autoClientName: null,
    autoClientPhone: null,
    autoClientUsername: null,
    forceClientId: payment.forceClientId ?? null,
    forceClientName: null,
    forceClientPhone: null,
    forceClientUsername: null,
    amount: payment.amount ?? "0",
    charged: payment.charged ?? "0",
    countAmount: payment.countAmount ?? "0",
    status: payment.status,
    note: payment.note ?? null,
    createdAt: payment.createdAt.toISOString(),
  });
});

export default router;
