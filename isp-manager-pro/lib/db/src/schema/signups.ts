import { pgTable, text, serial, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { packagesTable } from "./packages";

export const signupsTable = pgTable("signups", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  packageId: integer("package_id").references(() => packagesTable.id),
  connectivityType: text("connectivity_type").notNull().default("Shared"),
  paymentMethod: text("payment_method").notNull().default("Cash from Home"),
  signupFee: numeric("signup_fee", { precision: 10, scale: 2 }).default("0"),
  phone: text("phone").notNull(),
  alternativePhone: text("alternative_phone"),
  address: text("address"),
  occupation: text("occupation"),
  email: text("email"),
  nationalId: text("national_id"),
  previousIsp: text("previous_isp"),
  feedback: text("feedback"),
  agreeConditions: boolean("agree_conditions").default(false),
  status: text("status").notNull().default("pending"),
  signupDate: timestamp("signup_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSignupSchema = createInsertSchema(signupsTable).omit({
  id: true,
  createdAt: true,
  signupDate: true,
});
export type InsertSignup = z.infer<typeof insertSignupSchema>;
export type Signup = typeof signupsTable.$inferSelect;
