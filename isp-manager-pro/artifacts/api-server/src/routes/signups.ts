import { Router, type IRouter } from "express";
import { db, signupsTable, packagesTable } from "@workspace/db";
import { eq, ilike, and, or, desc } from "drizzle-orm";
import {
  ListSignupsQueryParams,
  CreateSignupBody,
  UpdateSignupBody,
  UpdateSignupParams,
  DeleteSignupParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/signups", requireAuth, async (req, res) => {
  const query = ListSignupsQueryParams.parse(req.query);

  const conditions = [];
  if (query.status) {
    conditions.push(eq(signupsTable.status, query.status));
  }
  if (query.search) {
    const s = `%${query.search}%`;
    conditions.push(
      or(
        ilike(signupsTable.fullName, s),
        ilike(signupsTable.phone, s),
        ilike(signupsTable.email, s)
      )
    );
  }

  const rows = await db
    .select({
      id: signupsTable.id,
      fullName: signupsTable.fullName,
      packageId: signupsTable.packageId,
      connectivityType: signupsTable.connectivityType,
      paymentMethod: signupsTable.paymentMethod,
      signupFee: signupsTable.signupFee,
      phone: signupsTable.phone,
      alternativePhone: signupsTable.alternativePhone,
      address: signupsTable.address,
      occupation: signupsTable.occupation,
      email: signupsTable.email,
      nationalId: signupsTable.nationalId,
      previousIsp: signupsTable.previousIsp,
      feedback: signupsTable.feedback,
      agreeConditions: signupsTable.agreeConditions,
      status: signupsTable.status,
      signupDate: signupsTable.signupDate,
      createdAt: signupsTable.createdAt,
      packageName: packagesTable.name,
    })
    .from(signupsTable)
    .leftJoin(packagesTable, eq(signupsTable.packageId, packagesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(signupsTable.createdAt));

  const signups = rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    packageId: r.packageId ?? null,
    packageName: r.packageName ?? null,
    connectivityType: r.connectivityType,
    paymentMethod: r.paymentMethod,
    signupFee: r.signupFee ?? null,
    phone: r.phone,
    alternativePhone: r.alternativePhone ?? null,
    address: r.address ?? null,
    occupation: r.occupation ?? null,
    email: r.email ?? null,
    nationalId: r.nationalId ?? null,
    previousIsp: r.previousIsp ?? null,
    feedback: r.feedback ?? null,
    agreeConditions: r.agreeConditions ?? false,
    status: r.status,
    signupDate: r.signupDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));

  res.json({ signups, total: signups.length });
});

router.post("/signups", requireAuth, async (req, res) => {
  const body = CreateSignupBody.parse(req.body);

  const [row] = await db
    .insert(signupsTable)
    .values({
      fullName: body.fullName,
      packageId: body.packageId ?? null,
      connectivityType: body.connectivityType ?? "Shared",
      paymentMethod: body.paymentMethod ?? "Cash from Home",
      signupFee: body.signupFee ?? "0",
      phone: body.phone,
      alternativePhone: body.alternativePhone ?? null,
      address: body.address ?? null,
      occupation: body.occupation ?? null,
      email: body.email ?? null,
      nationalId: body.nationalId ?? null,
      previousIsp: body.previousIsp ?? null,
      feedback: body.feedback ?? null,
      agreeConditions: body.agreeConditions ?? false,
      status: "pending",
    })
    .returning();

  res.status(201).json({
    id: row.id,
    fullName: row.fullName,
    packageId: row.packageId ?? null,
    packageName: null,
    connectivityType: row.connectivityType,
    paymentMethod: row.paymentMethod,
    signupFee: row.signupFee ?? null,
    phone: row.phone,
    alternativePhone: row.alternativePhone ?? null,
    address: row.address ?? null,
    occupation: row.occupation ?? null,
    email: row.email ?? null,
    nationalId: row.nationalId ?? null,
    previousIsp: row.previousIsp ?? null,
    feedback: row.feedback ?? null,
    agreeConditions: row.agreeConditions ?? false,
    status: row.status,
    signupDate: row.signupDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
  });
});

router.patch("/signups/:id", requireAuth, async (req, res) => {
  const { id } = UpdateSignupParams.parse(req.params);
  const body = UpdateSignupBody.parse(req.body);

  const [row] = await db
    .update(signupsTable)
    .set({ status: body.status })
    .where(eq(signupsTable.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Signup not found" });
    return;
  }

  res.json({
    id: row.id,
    fullName: row.fullName,
    packageId: row.packageId ?? null,
    packageName: null,
    connectivityType: row.connectivityType,
    paymentMethod: row.paymentMethod,
    signupFee: row.signupFee ?? null,
    phone: row.phone,
    alternativePhone: row.alternativePhone ?? null,
    address: row.address ?? null,
    occupation: row.occupation ?? null,
    email: row.email ?? null,
    nationalId: row.nationalId ?? null,
    previousIsp: row.previousIsp ?? null,
    feedback: row.feedback ?? null,
    agreeConditions: row.agreeConditions ?? false,
    status: row.status,
    signupDate: row.signupDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
  });
});

router.delete("/signups/:id", requireAuth, async (req, res) => {
  const { id } = DeleteSignupParams.parse(req.params);

  await db.delete(signupsTable).where(eq(signupsTable.id, id));

  res.json({ success: true, message: "Signup deleted" });
});

export default router;
