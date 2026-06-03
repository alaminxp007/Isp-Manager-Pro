import { pgTable, serial, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const billsTable = pgTable("bills", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  month: text("month").notNull(),
  generatedAmount: numeric("generated_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  collectedAmount: numeric("collected_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  extraBill: numeric("extra_bill", { precision: 12, scale: 2 }).notNull().default("0"),
  payableAmount: numeric("payable_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("due"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBillSchema = createInsertSchema(billsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof billsTable.$inferSelect;
