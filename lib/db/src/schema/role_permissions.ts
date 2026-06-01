import { pgTable, integer, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { rolesTable } from "./roles";
import { permissionsTable } from "./permissions";

export const rolePermissionsTable = pgTable(
  "role_permissions",
  {
    roleId: integer("role_id")
      .notNull()
      .references(() => rolesTable.id, { onDelete: "cascade" }),
    permissionId: integer("permission_id")
      .notNull()
      .references(() => permissionsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })]
);

export type RolePermission = typeof rolePermissionsTable.$inferSelect;
