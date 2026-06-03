import { Router, type IRouter } from "express";
import { db, companySettingsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function getOrCreate() {
  const rows = await db.select().from(companySettingsTable).limit(1);
  if (rows.length) return rows[0];
  const [created] = await db.insert(companySettingsTable).values({}).returning();
  return created;
}

router.get("/company-settings", requireAuth, async (_req, res): Promise<void> => {
  const row = await getOrCreate();
  res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
});

router.put("/company-settings", requireAuth, async (req, res): Promise<void> => {
  const {
    companyName, tagline, address, city, state, country, postCode,
    phone, email, website, businessType, taxId, licenseNo,
    currency, currencySymbol, timezone, logoUrl, footerNote,
  } = req.body as Partial<typeof companySettingsTable.$inferInsert>;

  const existing = await getOrCreate();

  const updates: Partial<typeof companySettingsTable.$inferInsert> = {};
  if (companyName   !== undefined) updates.companyName   = companyName;
  if (tagline       !== undefined) updates.tagline       = tagline;
  if (address       !== undefined) updates.address       = address;
  if (city          !== undefined) updates.city          = city;
  if (state         !== undefined) updates.state         = state;
  if (country       !== undefined) updates.country       = country;
  if (postCode      !== undefined) updates.postCode      = postCode;
  if (phone         !== undefined) updates.phone         = phone;
  if (email         !== undefined) updates.email         = email;
  if (website       !== undefined) updates.website       = website;
  if (businessType  !== undefined) updates.businessType  = businessType;
  if (taxId         !== undefined) updates.taxId         = taxId;
  if (licenseNo     !== undefined) updates.licenseNo     = licenseNo;
  if (currency      !== undefined) updates.currency      = currency;
  if (currencySymbol!== undefined) updates.currencySymbol= currencySymbol;
  if (timezone      !== undefined) updates.timezone      = timezone;
  if (logoUrl       !== undefined) updates.logoUrl       = logoUrl;
  if (footerNote    !== undefined) updates.footerNote    = footerNote;

  const { eq } = await import("drizzle-orm");
  const [updated] = await db
    .update(companySettingsTable)
    .set(updates)
    .where(eq(companySettingsTable.id, existing.id))
    .returning();

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

export default router;
