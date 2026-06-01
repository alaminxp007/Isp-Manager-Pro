import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, departmentsTable, employeesTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// ─── Departments ─────────────────────────────────────────────

router.get("/departments", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: departmentsTable.id,
      name: departmentsTable.name,
      description: departmentsTable.description,
      createdAt: departmentsTable.createdAt,
      employeeCount: sql<number>`count(${employeesTable.id})::int`,
    })
    .from(departmentsTable)
    .leftJoin(employeesTable, eq(employeesTable.departmentId, departmentsTable.id))
    .groupBy(departmentsTable.id)
    .orderBy(departmentsTable.id);

  res.json(
    rows.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description ?? null,
      employeeCount: d.employeeCount ?? 0,
      createdAt: d.createdAt.toISOString(),
    }))
  );
});

router.post("/departments", requireAuth, async (req, res): Promise<void> => {
  const { name, description } = req.body as { name?: string; description?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [dept] = await db
    .insert(departmentsTable)
    .values({ name: name.trim(), description: description?.trim() || null })
    .returning();
  res.status(201).json({ ...dept, description: dept.description ?? null, createdAt: dept.createdAt.toISOString() });
});

router.patch("/departments/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const { name, description } = req.body as { name?: string; description?: string };
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }

  const [dept] = await db
    .update(departmentsTable)
    .set({ name: name.trim(), description: description?.trim() || null })
    .where(eq(departmentsTable.id, id))
    .returning();

  if (!dept) { res.status(404).json({ error: "Department not found" }); return; }
  res.json({ ...dept, description: dept.description ?? null, createdAt: dept.createdAt.toISOString() });
});

router.delete("/departments/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [dept] = await db.delete(departmentsTable).where(eq(departmentsTable.id, id)).returning();
  if (!dept) { res.status(404).json({ error: "Department not found" }); return; }
  res.sendStatus(204);
});

// ─── Helpers ──────────────────────────────────────────────────

function formatEmp(e: typeof employeesTable.$inferSelect & { departmentName?: string | null; portalUsername?: string | null }) {
  return {
    ...e,
    userId: e.userId ?? null,
    designation: e.designation ?? null,
    departmentId: e.departmentId ?? null,
    departmentName: e.departmentName ?? null,
    gender: e.gender ?? null,
    maritalStatus: e.maritalStatus ?? null,
    bloodGroup: e.bloodGroup ?? null,
    nationalId: e.nationalId ?? null,
    fatherName: e.fatherName ?? null,
    motherName: e.motherName ?? null,
    dateOfBirth: e.dateOfBirth ?? null,
    joiningDate: e.joiningDate ?? null,
    basicSalary: e.basicSalary ?? "0",
    mobileBill: e.mobileBill ?? "0",
    houseRent: e.houseRent ?? "0",
    medical: e.medical ?? "0",
    food: e.food ?? "0",
    otherAllowances: e.otherAllowances ?? "0",
    providentFund: e.providentFund ?? "0",
    professionalTax: e.professionalTax ?? "0",
    incomeTax: e.incomeTax ?? "0",
    presentAddress: e.presentAddress ?? null,
    permanentAddress: e.permanentAddress ?? null,
    personalContact: e.personalContact ?? null,
    officeContact: e.officeContact ?? null,
    familyContact: e.familyContact ?? null,
    firstReference: e.firstReference ?? null,
    secondReference: e.secondReference ?? null,
    email: e.email ?? null,
    skype: e.skype ?? null,
    hasPortalAccess: e.userId != null,
    portalUsername: e.portalUsername ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

// ─── Employees ───────────────────────────────────────────────

router.get("/employees", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: employeesTable.id,
      employeeId: employeesTable.employeeId,
      userId: employeesTable.userId,
      fullName: employeesTable.fullName,
      designation: employeesTable.designation,
      departmentId: employeesTable.departmentId,
      departmentName: departmentsTable.name,
      gender: employeesTable.gender,
      joiningDate: employeesTable.joiningDate,
      email: employeesTable.email,
      personalContact: employeesTable.personalContact,
      basicSalary: employeesTable.basicSalary,
      createdAt: employeesTable.createdAt,
      updatedAt: employeesTable.updatedAt,
      portalUsername: usersTable.username,
    })
    .from(employeesTable)
    .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
    .leftJoin(usersTable, eq(employeesTable.userId, usersTable.id))
    .orderBy(employeesTable.id);

  res.json(
    rows.map((e) => ({
      id: e.id,
      employeeId: e.employeeId,
      userId: e.userId ?? null,
      hasPortalAccess: e.userId != null,
      portalUsername: e.portalUsername ?? null,
      fullName: e.fullName,
      designation: e.designation ?? null,
      departmentId: e.departmentId ?? null,
      departmentName: e.departmentName ?? null,
      gender: e.gender ?? null,
      joiningDate: e.joiningDate ?? null,
      email: e.email ?? null,
      personalContact: e.personalContact ?? null,
      basicSalary: e.basicSalary ?? "0",
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }))
  );
});

router.get("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [row] = await db
    .select({
      employees: employeesTable,
      departments: departmentsTable,
      portalUsername: usersTable.username,
      portalRoleId: usersTable.roleId,
    })
    .from(employeesTable)
    .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
    .leftJoin(usersTable, eq(employeesTable.userId, usersTable.id))
    .where(eq(employeesTable.id, id));

  if (!row) { res.status(404).json({ error: "Employee not found" }); return; }

  res.json(formatEmp({
    ...row.employees,
    departmentName: row.departments?.name ?? null,
    portalUsername: row.portalUsername ?? null,
    portalRoleId: row.portalRoleId ?? null,
  } as Parameters<typeof formatEmp>[0]));
});

router.post("/employees", requireAuth, async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const { fullName, employeeId } = body as { fullName?: string; employeeId?: string };
  if (!fullName?.toString().trim()) { res.status(400).json({ error: "fullName is required" }); return; }

  const genId = employeeId?.toString().trim() || `EMP${Date.now()}`;

  const portalUsername = body["portalUsername"]?.toString().trim() || null;
  const portalPassword = body["portalPassword"]?.toString().trim() || null;
  const portalRoleId = body["portalRoleId"] ? Number(body["portalRoleId"]) : null;

  let newUserId: number | null = null;
  if (portalUsername && portalPassword) {
    const passwordHash = await bcrypt.hash(portalPassword, 10);
    const empEmail = body["email"]?.toString().trim() || `${portalUsername}@portal.koro`;
    const [newUser] = await db
      .insert(usersTable)
      .values({
        username: portalUsername,
        passwordHash,
        fullName: fullName.toString().trim(),
        email: empEmail,
        isActive: true,
        isSuperAdmin: false,
        roleId: portalRoleId,
      })
      .onConflictDoNothing()
      .returning();
    newUserId = newUser?.id ?? null;
  }

  const [emp] = await db
    .insert(employeesTable)
    .values({
      employeeId: genId,
      userId: newUserId,
      fullName: fullName.toString().trim(),
      designation: body["designation"]?.toString() || null,
      departmentId: body["departmentId"] ? Number(body["departmentId"]) : null,
      fatherName: body["fatherName"]?.toString() || null,
      motherName: body["motherName"]?.toString() || null,
      dateOfBirth: body["dateOfBirth"]?.toString() || null,
      joiningDate: body["joiningDate"]?.toString() || null,
      gender: body["gender"]?.toString() || null,
      maritalStatus: body["maritalStatus"]?.toString() || null,
      bloodGroup: body["bloodGroup"]?.toString() || null,
      nationalId: body["nationalId"]?.toString() || null,
      basicSalary: body["basicSalary"]?.toString() || "0",
      mobileBill: body["mobileBill"]?.toString() || "0",
      houseRent: body["houseRent"]?.toString() || "0",
      medical: body["medical"]?.toString() || "0",
      food: body["food"]?.toString() || "0",
      otherAllowances: body["otherAllowances"]?.toString() || "0",
      providentFund: body["providentFund"]?.toString() || "0",
      professionalTax: body["professionalTax"]?.toString() || "0",
      incomeTax: body["incomeTax"]?.toString() || "0",
      presentAddress: body["presentAddress"]?.toString() || null,
      permanentAddress: body["permanentAddress"]?.toString() || null,
      personalContact: body["personalContact"]?.toString() || null,
      officeContact: body["officeContact"]?.toString() || null,
      familyContact: body["familyContact"]?.toString() || null,
      firstReference: body["firstReference"]?.toString() || null,
      secondReference: body["secondReference"]?.toString() || null,
      email: body["email"]?.toString() || null,
      skype: body["skype"]?.toString() || null,
    })
    .returning();

  res.status(201).json(formatEmp({ ...emp, portalUsername }));
});

router.patch("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const body = req.body as Record<string, unknown>;

  const [existing] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Employee not found" }); return; }

  const portalUsername = body["portalUsername"]?.toString().trim() || null;
  const portalPassword = body["portalPassword"]?.toString().trim() || null;
  const portalRoleId = body["portalRoleId"] ? Number(body["portalRoleId"]) : null;
  const removePortalAccess = body["removePortalAccess"] === true;

  let finalUserId = existing.userId;
  let resolvedPortalUsername: string | null = null;

  if (removePortalAccess && existing.userId) {
    await db.delete(usersTable).where(eq(usersTable.id, existing.userId));
    finalUserId = null;
  } else if (portalUsername && portalPassword) {
    if (existing.userId) {
      const updateData: Record<string, unknown> = {
        username: portalUsername,
        roleId: portalRoleId,
        fullName: body["fullName"]?.toString().trim() || existing.fullName,
      };
      if (portalPassword) updateData["passwordHash"] = await bcrypt.hash(portalPassword, 10);
      await db.update(usersTable).set(updateData).where(eq(usersTable.id, existing.userId));
      finalUserId = existing.userId;
      resolvedPortalUsername = portalUsername;
    } else {
      const passwordHash = await bcrypt.hash(portalPassword, 10);
      const empEmail = body["email"]?.toString().trim() || existing.email || `${portalUsername}@portal.koro`;
      const [newUser] = await db
        .insert(usersTable)
        .values({
          username: portalUsername,
          passwordHash,
          fullName: (body["fullName"]?.toString().trim() || existing.fullName),
          email: empEmail,
          isActive: true,
          isSuperAdmin: false,
          roleId: portalRoleId,
        })
        .onConflictDoNothing()
        .returning();
      finalUserId = newUser?.id ?? null;
      resolvedPortalUsername = newUser ? portalUsername : null;
    }
  } else if (portalUsername && existing.userId) {
    const updateData: Record<string, unknown> = {
      username: portalUsername,
      roleId: portalRoleId,
      fullName: body["fullName"]?.toString().trim() || existing.fullName,
    };
    if (portalPassword) updateData["passwordHash"] = await bcrypt.hash(portalPassword, 10);
    await db.update(usersTable).set(updateData).where(eq(usersTable.id, existing.userId));
    resolvedPortalUsername = portalUsername;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date(), userId: finalUserId };
  const fields = [
    "fullName", "designation", "departmentId", "fatherName", "motherName",
    "dateOfBirth", "joiningDate", "gender", "maritalStatus", "bloodGroup", "nationalId",
    "basicSalary", "mobileBill", "houseRent", "medical", "food", "otherAllowances",
    "providentFund", "professionalTax", "incomeTax",
    "presentAddress", "permanentAddress", "personalContact", "officeContact",
    "familyContact", "firstReference", "secondReference", "email", "skype",
  ];
  for (const field of fields) {
    if (field in body) updateData[field] = body[field] ?? null;
  }

  const [emp] = await db.update(employeesTable).set(updateData).where(eq(employeesTable.id, id)).returning();
  if (!emp) { res.status(404).json({ error: "Employee not found" }); return; }

  const finalUsername = resolvedPortalUsername ?? (finalUserId && existing.userId === finalUserId
    ? (await db.select({ username: usersTable.username }).from(usersTable).where(eq(usersTable.id, finalUserId)))[0]?.username ?? null
    : null);

  res.json(formatEmp({ ...emp, portalUsername: finalUsername }));
});

router.delete("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!emp) { res.status(404).json({ error: "Employee not found" }); return; }

  await db.delete(employeesTable).where(eq(employeesTable.id, id));

  if (emp.userId) {
    await db.delete(usersTable).where(eq(usersTable.id, emp.userId));
  }

  res.sendStatus(204);
});

export default router;
