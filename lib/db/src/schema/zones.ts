import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { thanasTable } from "./thanas";

export const zonesTable = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  thanaId: integer("thana_id").references(() => thanasTable.id, { onDelete: "set null" }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertZoneSchema = createInsertSchema(zonesTable).omit({ id: true, createdAt: true });
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type Zone = typeof zonesTable.$inferSelect;
