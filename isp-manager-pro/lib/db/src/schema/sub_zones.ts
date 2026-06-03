import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { zonesTable } from "./zones";

export const subZonesTable = pgTable("sub_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  zoneId: integer("zone_id").notNull().references(() => zonesTable.id, { onDelete: "cascade" }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubZoneSchema = createInsertSchema(subZonesTable).omit({ id: true, createdAt: true });
export type InsertSubZone = z.infer<typeof insertSubZoneSchema>;
export type SubZone = typeof subZonesTable.$inferSelect;
