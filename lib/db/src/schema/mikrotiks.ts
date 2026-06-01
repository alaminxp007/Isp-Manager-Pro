import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const mikrotiksTable = pgTable("mikrotiks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  publicIp: text("public_ip").notNull(),
  login: text("login").notNull(),
  password: text("password").notNull(),
  autoMkSync: boolean("auto_mk_sync").notNull().default(false),
  autoSync: boolean("auto_sync").notNull().default(false),
  activeGraph: boolean("active_graph").notNull().default(false),
  webPort: integer("web_port"),
  note: text("note"),
  status: text("status").notNull().default("disconnected"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Mikrotik = typeof mikrotiksTable.$inferSelect;
export type InsertMikrotik = typeof mikrotiksTable.$inferInsert;
