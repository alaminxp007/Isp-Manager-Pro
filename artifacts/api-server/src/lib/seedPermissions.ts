import { db, permissionsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

const PERMISSIONS: { name: string; module: string; action: string; description: string }[] = [
  { name: "dashboard.view",   module: "dashboard", action: "view",   description: "View dashboard" },

  { name: "clients.view",     module: "clients",   action: "view",   description: "View clients" },
  { name: "clients.create",   module: "clients",   action: "create", description: "Create clients" },
  { name: "clients.edit",     module: "clients",   action: "edit",   description: "Edit clients" },
  { name: "clients.delete",   module: "clients",   action: "delete", description: "Delete clients" },

  { name: "billing.view",     module: "billing",   action: "view",   description: "View billing" },
  { name: "billing.collect",  module: "billing",   action: "collect",description: "Collect payments" },

  { name: "payments.view",    module: "payments",  action: "view",   description: "View online payments" },

  { name: "reports.view",     module: "reports",   action: "view",   description: "View reports" },

  { name: "zones.view",       module: "zones",     action: "view",   description: "View zones" },
  { name: "zones.create",     module: "zones",     action: "create", description: "Create zones" },
  { name: "zones.edit",       module: "zones",     action: "edit",   description: "Edit zones" },
  { name: "zones.delete",     module: "zones",     action: "delete", description: "Delete zones" },

  { name: "packages.view",    module: "packages",  action: "view",   description: "View packages" },
  { name: "packages.create",  module: "packages",  action: "create", description: "Create packages" },
  { name: "packages.edit",    module: "packages",  action: "edit",   description: "Edit packages" },
  { name: "packages.delete",  module: "packages",  action: "delete", description: "Delete packages" },

  { name: "users.view",       module: "users",     action: "view",   description: "View users" },
  { name: "users.create",     module: "users",     action: "create", description: "Create users" },
  { name: "users.edit",       module: "users",     action: "edit",   description: "Edit users" },
  { name: "users.delete",     module: "users",     action: "delete", description: "Delete users" },

  { name: "roles.view",       module: "roles",     action: "view",   description: "View roles" },
  { name: "roles.create",     module: "roles",     action: "create", description: "Create roles" },
  { name: "roles.edit",       module: "roles",     action: "edit",   description: "Edit roles" },
  { name: "roles.delete",     module: "roles",     action: "delete", description: "Delete roles" },

  { name: "network.view",     module: "network",   action: "view",   description: "View network (MikroTik)" },
  { name: "network.edit",     module: "network",   action: "edit",   description: "Edit network settings" },

  { name: "settings.view",    module: "settings",  action: "view",   description: "View settings" },
  { name: "settings.edit",    module: "settings",  action: "edit",   description: "Edit settings" },
];

export async function seedPermissions(): Promise<void> {
  const existing = await db.select({ id: permissionsTable.id }).from(permissionsTable).limit(1);
  if (existing.length > 0) {
    logger.debug("Permissions already seeded — skipping");
    return;
  }

  await db
    .insert(permissionsTable)
    .values(PERMISSIONS)
    .onConflictDoNothing({ target: permissionsTable.name });

  logger.info({ count: PERMISSIONS.length }, "Permissions seeded successfully");
}
