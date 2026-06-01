import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const districtsTable = pgTable("districts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDistrictSchema = createInsertSchema(districtsTable).omit({ id: true, createdAt: true });
export type InsertDistrict = z.infer<typeof insertDistrictSchema>;
export type District = typeof districtsTable.$inferSelect;
