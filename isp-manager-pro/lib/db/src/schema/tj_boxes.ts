import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subZonesTable } from "./sub_zones";

export const tjBoxesTable = pgTable("tj_boxes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subZoneId: integer("sub_zone_id").notNull().references(() => subZonesTable.id, { onDelete: "cascade" }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTjBoxSchema = createInsertSchema(tjBoxesTable).omit({ id: true, createdAt: true });
export type InsertTjBox = z.infer<typeof insertTjBoxSchema>;
export type TjBox = typeof tjBoxesTable.$inferSelect;
