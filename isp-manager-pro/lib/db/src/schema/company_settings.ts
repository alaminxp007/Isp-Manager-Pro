import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const companySettingsTable = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("ISP Manager Pro"),
  tagline: text("tagline"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("Bangladesh"),
  postCode: text("post_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  businessType: text("business_type").default("ISP"),
  taxId: text("tax_id"),
  licenseNo: text("license_no"),
  currency: text("currency").default("BDT"),
  currencySymbol: text("currency_symbol").default("৳"),
  timezone: text("timezone").default("Asia/Dhaka"),
  logoUrl: text("logo_url"),
  footerNote: text("footer_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CompanySettings = typeof companySettingsTable.$inferSelect;
