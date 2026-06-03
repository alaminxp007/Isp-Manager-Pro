import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const packagesTable = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  speed: text("speed"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPackageSchema = createInsertSchema(packagesTable).omit({ id: true, createdAt: true });
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packagesTable.$inferSelect;
