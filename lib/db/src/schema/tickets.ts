import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNo: text("ticket_no").notNull().unique(),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  subject: text("subject").notNull(),
  description: text("description"),
  category: text("category").notNull().default("other"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Ticket = typeof ticketsTable.$inferSelect;
