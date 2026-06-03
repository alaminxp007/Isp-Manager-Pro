import { Router, type IRouter } from "express";
import { db, ticketsTable, clientsTable, zonesTable, packagesTable } from "@workspace/db";
import { eq, desc, ilike, or, count, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function genTicketNo(id: number) {
  return `TKT-${String(id).padStart(5, "0")}`;
}

router.get("/tickets", requireAuth, async (req, res): Promise<void> => {
  const { status, priority, category, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: ReturnType<typeof eq>[] = [];
  if (status && status !== "all") conditions.push(eq(ticketsTable.status, status));
  if (priority && priority !== "all") conditions.push(eq(ticketsTable.priority, priority));
  if (category && category !== "all") conditions.push(eq(ticketsTable.category, category));
  if (search) {
    conditions.push(
      or(
        ilike(ticketsTable.subject, `%${search}%`),
        ilike(ticketsTable.ticketNo, `%${search}%`),
        ilike(clientsTable.fullName, `%${search}%`),
        ilike(clientsTable.phone, `%${search}%`)
      ) as ReturnType<typeof eq>
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: ticketsTable.id,
        ticketNo: ticketsTable.ticketNo,
        subject: ticketsTable.subject,
        description: ticketsTable.description,
        category: ticketsTable.category,
        priority: ticketsTable.priority,
        status: ticketsTable.status,
        note: ticketsTable.note,
        createdAt: ticketsTable.createdAt,
        updatedAt: ticketsTable.updatedAt,
        clientId: ticketsTable.clientId,
        clientFullName: clientsTable.fullName,
        clientUsername: clientsTable.username,
        clientPhone: clientsTable.phone,
        clientStatus: clientsTable.status,
        clientIsOnline: clientsTable.isOnline,
        zoneName: zonesTable.name,
        packageName: packagesTable.name,
      })
      .from(ticketsTable)
      .leftJoin(clientsTable, eq(ticketsTable.clientId, clientsTable.id))
      .leftJoin(zonesTable, eq(clientsTable.zoneId, zonesTable.id))
      .leftJoin(packagesTable, eq(clientsTable.packageId, packagesTable.id))
      .where(where)
      .orderBy(desc(ticketsTable.id))
      .limit(limitNum)
      .offset(offset),

    db
      .select({ total: count() })
      .from(ticketsTable)
      .leftJoin(clientsTable, eq(ticketsTable.clientId, clientsTable.id))
      .where(where),
  ]);

  res.json({
    data: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total: countRows[0]?.total ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

router.get("/tickets/stats", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      status: ticketsTable.status,
      cnt: sql<number>`count(*)::int`,
    })
    .from(ticketsTable)
    .groupBy(ticketsTable.status);

  const map: Record<string, number> = {};
  rows.forEach((r) => { map[r.status] = r.cnt; });

  res.json({
    open: map["open"] ?? 0,
    in_progress: map["in_progress"] ?? 0,
    resolved: map["resolved"] ?? 0,
    closed: map["closed"] ?? 0,
    total: Object.values(map).reduce((a, b) => a + b, 0),
  });
});

router.post("/tickets", requireAuth, async (req, res): Promise<void> => {
  const { clientId, subject, description, category = "other", priority = "medium", note } = req.body as {
    clientId?: number;
    subject: string;
    description?: string;
    category?: string;
    priority?: string;
    note?: string;
  };

  if (!subject?.trim()) {
    res.status(400).json({ error: "subject is required" });
    return;
  }

  const [inserted] = await db
    .insert(ticketsTable)
    .values({
      ticketNo: "TKT-TEMP",
      clientId: clientId ?? null,
      subject: subject.trim(),
      description: description?.trim() ?? null,
      category,
      priority,
      status: "open",
      note: note?.trim() ?? null,
    })
    .returning();

  await db
    .update(ticketsTable)
    .set({ ticketNo: genTicketNo(inserted.id) })
    .where(eq(ticketsTable.id, inserted.id));

  res.status(201).json({ ...inserted, ticketNo: genTicketNo(inserted.id) });
});

router.get("/tickets/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [row] = await db
    .select({
      id: ticketsTable.id,
      ticketNo: ticketsTable.ticketNo,
      subject: ticketsTable.subject,
      description: ticketsTable.description,
      category: ticketsTable.category,
      priority: ticketsTable.priority,
      status: ticketsTable.status,
      note: ticketsTable.note,
      createdAt: ticketsTable.createdAt,
      updatedAt: ticketsTable.updatedAt,
      clientId: ticketsTable.clientId,
      clientFullName: clientsTable.fullName,
      clientUsername: clientsTable.username,
      clientPhone: clientsTable.phone,
      clientStatus: clientsTable.status,
      clientIsOnline: clientsTable.isOnline,
      zoneName: zonesTable.name,
    })
    .from(ticketsTable)
    .leftJoin(clientsTable, eq(ticketsTable.clientId, clientsTable.id))
    .leftJoin(zonesTable, eq(clientsTable.zoneId, zonesTable.id))
    .where(eq(ticketsTable.id, id))
    .limit(1);

  if (!row) { res.status(404).json({ error: "not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
});

router.patch("/tickets/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const { status, priority, note, subject, description, category } = req.body as {
    status?: string;
    priority?: string;
    note?: string;
    subject?: string;
    description?: string;
    category?: string;
  };

  const updates: Partial<typeof ticketsTable.$inferInsert> = {};
  if (status) updates.status = status;
  if (priority) updates.priority = priority;
  if (note !== undefined) updates.note = note;
  if (subject) updates.subject = subject;
  if (description !== undefined) updates.description = description;
  if (category) updates.category = category;

  if (!Object.keys(updates).length) { res.status(400).json({ error: "nothing to update" }); return; }

  const [updated] = await db.update(ticketsTable).set(updates).where(eq(ticketsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

export default router;
