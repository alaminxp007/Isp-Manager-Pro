import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { departmentsTable } from "./departments";
import { usersTable } from "./users";

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull().unique(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  designation: text("designation"),
  departmentId: integer("department_id").references(() => departmentsTable.id, { onDelete: "set null" }),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  dateOfBirth: text("date_of_birth"),
  joiningDate: text("joining_date"),
  gender: text("gender"),
  maritalStatus: text("marital_status"),
  bloodGroup: text("blood_group"),
  nationalId: text("national_id"),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).default("0"),
  mobileBill: numeric("mobile_bill", { precision: 12, scale: 2 }).default("0"),
  houseRent: numeric("house_rent", { precision: 12, scale: 2 }).default("0"),
  medical: numeric("medical", { precision: 12, scale: 2 }).default("0"),
  food: numeric("food", { precision: 12, scale: 2 }).default("0"),
  otherAllowances: numeric("other_allowances", { precision: 12, scale: 2 }).default("0"),
  providentFund: numeric("provident_fund", { precision: 12, scale: 2 }).default("0"),
  professionalTax: numeric("professional_tax", { precision: 12, scale: 2 }).default("0"),
  incomeTax: numeric("income_tax", { precision: 12, scale: 2 }).default("0"),
  presentAddress: text("present_address"),
  permanentAddress: text("permanent_address"),
  personalContact: text("personal_contact"),
  officeContact: text("office_contact"),
  familyContact: text("family_contact"),
  firstReference: text("first_reference"),
  secondReference: text("second_reference"),
  email: text("email"),
  skype: text("skype"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Employee = typeof employeesTable.$inferSelect;
export type InsertEmployee = typeof employeesTable.$inferInsert;
