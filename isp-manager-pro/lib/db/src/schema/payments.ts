import { pgTable, serial, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  gateway: text("gateway").notNull().default("bkash"),
  transactionId: text("transaction_id"),
  deviceId: text("device_id"),
  referenceId: text("reference_id"),
  autoClientId: integer("auto_client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  forceClientId: integer("force_client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  charged: numeric("charged", { precision: 12, scale: 2 }).notNull().default("0"),
  countAmount: numeric("count_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("matched"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
