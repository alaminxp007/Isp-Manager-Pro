import { Router, type IRouter } from "express";
import { db, usersTable, rolesTable, permissionsTable, clientsTable, billsTable, paymentsTable } from "@workspace/db";
import { eq, count, sum, sql, and, gte, lt } from "drizzle-orm";
import { GetDashboardStatsResponse, GetDashboardClientTrendResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);

  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = prevDate.toISOString().slice(0, 7);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsersResult,
    activeUsersResult,
    totalRolesResult,
    totalPermissionsResult,
    clientStats,
    newClientsResult,
    currentBills,
    prevBills,
    todayPayments,
    totalDuesResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(usersTable),
    db.select({ count: count() }).from(usersTable).where(eq(usersTable.isActive, true)),
    db.select({ count: count() }).from(rolesTable),
    db.select({ count: count() }).from(permissionsTable),
    db.select({
      total: count(),
      active: sql<number>`count(case when ${clientsTable.status} = 'Active' then 1 end)::int`,
      inactive: sql<number>`count(case when ${clientsTable.status} = 'Inactive' then 1 end)::int`,
      online: sql<number>`count(case when ${clientsTable.isOnline} = true then 1 end)::int`,
    }).from(clientsTable),
    db.select({ count: count() }).from(clientsTable).where(gte(clientsTable.createdAt, monthStart)),
    db.select({
      bill: sum(billsTable.generatedAmount),
      collection: sum(billsTable.collectedAmount),
      discount: sum(billsTable.discount),
    }).from(billsTable).where(eq(billsTable.month, currentMonth)),
    db.select({
      bill: sum(billsTable.generatedAmount),
      collection: sum(billsTable.collectedAmount),
    }).from(billsTable).where(eq(billsTable.month, prevMonth)),
    db.select({ total: sum(paymentsTable.amount) }).from(paymentsTable).where(gte(paymentsTable.createdAt, todayStart)),
    db.select({ total: sql<string>`coalesce(sum(${billsTable.generatedAmount}) - sum(${billsTable.collectedAmount}), 0)::text` })
      .from(billsTable)
      .where(eq(billsTable.status, "due")),
  ]);

  const cs = clientStats[0] ?? { total: 0, active: 0, inactive: 0, online: 0 };
  const cb = currentBills[0] ?? { bill: "0", collection: "0", discount: "0" };
  const pb = prevBills[0] ?? { bill: "0", collection: "0" };

  const curBill = parseFloat(cb.bill ?? "0");
  const curCol = parseFloat(cb.collection ?? "0");
  const prevBill = parseFloat(pb.bill ?? "0");
  const prevCol = parseFloat(pb.collection ?? "0");

  res.json(
    GetDashboardStatsResponse.parse({
      totalUsers: totalUsersResult[0]?.count ?? 0,
      activeUsers: activeUsersResult[0]?.count ?? 0,
      totalRoles: totalRolesResult[0]?.count ?? 0,
      totalPermissions: totalPermissionsResult[0]?.count ?? 0,
      totalClients: cs.total,
      activeClients: cs.active,
      inactiveClients: cs.inactive,
      onlineClients: cs.online,
      newClientsThisMonth: newClientsResult[0]?.count ?? 0,
      currentMonthBill: curBill.toFixed(2),
      currentMonthCollection: curCol.toFixed(2),
      currentMonthDiscount: parseFloat(cb.discount ?? "0").toFixed(2),
      currentMonthDue: (curBill - curCol).toFixed(2),
      prevMonthBill: prevBill.toFixed(2),
      prevMonthCollection: prevCol.toFixed(2),
      prevMonthDue: (prevBill - prevCol).toFixed(2),
      totalDues: parseFloat(totalDuesResult[0]?.total ?? "0").toFixed(2),
      todayCollection: parseFloat(todayPayments[0]?.total ?? "0").toFixed(2),
    })
  );
});

router.get("/dashboard/client-trend", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      date: sql<string>`date(${clientsTable.createdAt})::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(clientsTable)
    .where(gte(clientsTable.createdAt, sql`now() - interval '30 days'`))
    .groupBy(sql`date(${clientsTable.createdAt})`)
    .orderBy(sql`date(${clientsTable.createdAt})`);

  res.json(
    GetDashboardClientTrendResponse.parse(
      rows.map((r) => ({ date: r.date, count: r.count }))
    )
  );
});

export default router;
