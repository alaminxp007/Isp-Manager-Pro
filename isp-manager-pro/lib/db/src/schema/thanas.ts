import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { districtsTable } from "./districts";

export const thanasTable = pgTable("thanas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  districtId: integer("district_id").notNull().references(() => districtsTable.id, { onDelete: "cascade" }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertThanaSchema = createInsertSchema(thanasTable).omit({ id: true, createdAt: true });
export type InsertThana = z.infer<typeof insertThanaSchema>;
export type Thana = typeof thanasTable.$inferSelect;
