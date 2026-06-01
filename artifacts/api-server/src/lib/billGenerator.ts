import { db, billsTable, clientsTable, packagesTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { logger } from "./logger";

export interface GenerateBillsResult {
  month: string;
  generated: number;
  skipped: number;
  errors: number;
}

export async function generateMonthlyBills(month: string): Promise<GenerateBillsResult> {
  const result: GenerateBillsResult = { month, generated: 0, skipped: 0, errors: 0 };

  const activeClients = await db
    .select({
      id: clientsTable.id,
      packageId: clientsTable.packageId,
      packagePrice: packagesTable.price,
      permanentDiscount: clientsTable.permanentDiscount,
      permanentExtraBill: clientsTable.permanentExtraBill,
    })
    .from(clientsTable)
    .leftJoin(packagesTable, eq(clientsTable.packageId, packagesTable.id))
    .where(eq(clientsTable.status, "Active"));

  for (const client of activeClients) {
    try {
      const existing = await db
        .select({ id: billsTable.id })
        .from(billsTable)
        .where(and(eq(billsTable.clientId, client.id), eq(billsTable.month, month)))
        .limit(1);

      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      const packagePrice = parseFloat(client.packagePrice ?? "0");
      const permanentDiscount = parseFloat(client.permanentDiscount ?? "0");
      const permanentExtraBill = parseFloat(client.permanentExtraBill ?? "0");

      const generatedAmount = packagePrice + permanentExtraBill;
      const payableAmount = generatedAmount - permanentDiscount;

      await db.insert(billsTable).values({
        clientId: client.id,
        month,
        generatedAmount: generatedAmount.toFixed(2),
        collectedAmount: "0.00",
        discount: permanentDiscount.toFixed(2),
        extraBill: permanentExtraBill.toFixed(2),
        payableAmount: Math.max(0, payableAmount).toFixed(2),
        status: "due",
      });

      result.generated++;
    } catch (err) {
      logger.error({ err, clientId: client.id, month }, "Failed to generate bill for client");
      result.errors++;
    }
  }

  logger.info(result, "Monthly bill generation complete");
  return result;
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
