import { pgTable, text, serial, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { zonesTable } from "./zones";
import { packagesTable } from "./packages";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  comId: text("com_id").notNull().unique(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  zoneId: integer("zone_id").references(() => zonesTable.id, { onDelete: "set null" }),
  subZone: text("sub_zone"),
  address: text("address"),
  flatNo: text("flat_no"),
  houseNo: text("house_no"),
  roadNo: text("road_no"),
  thana: text("thana"),
  permanentAddress: text("permanent_address"),
  packageId: integer("package_id").references(() => packagesTable.id, { onDelete: "set null" }),
  ipAddress: text("ip_address"),
  macAddress: text("mac_address"),
  connectionType: text("connection_type").default("Fiber"),
  cableType: text("cable_type").default("UTP"),
  clientType: text("client_type").default("Home"),
  connectivityType: text("connectivity_type").default("Shared"),
  paymentDate: integer("payment_date"),
  billDate: integer("bill_date"),
  status: text("status").notNull().default("Active"),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0"),
  isOnline: boolean("is_online").notNull().default(false),
  email: text("email"),
  alternativePhone: text("alternative_phone"),
  fatherName: text("father_name"),
  nationalId: text("national_id"),
  occupation: text("occupation"),
  signupFee: numeric("signup_fee", { precision: 12, scale: 2 }).default("0"),
  paymentMethod: text("payment_method").default("Cash from Home"),
  joiningDate: text("joining_date"),
  permanentDiscount: numeric("permanent_discount", { precision: 12, scale: 2 }).default("0"),
  permanentExtraBill: numeric("permanent_extra_bill", { precision: 12, scale: 2 }).default("0"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
