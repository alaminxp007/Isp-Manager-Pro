import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { generateMonthlyBills, currentMonthKey } from "./lib/billGenerator";
import { seedPermissions } from "./lib/seedPermissions";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Seed permissions if not already present
  seedPermissions().catch((err) => logger.error({ err }, "Failed to seed permissions"));

  // Run at 00:05 on the 1st of every month
  cron.schedule("5 0 1 * *", async () => {
    const month = currentMonthKey();
    logger.info({ month }, "Running scheduled monthly bill generation");
    try {
      const result = await generateMonthlyBills(month);
      logger.info(result, "Scheduled bill generation complete");
    } catch (err) {
      logger.error({ err }, "Scheduled bill generation failed");
    }
  });

  logger.info("Monthly bill scheduler registered (runs 1st of each month at 00:05)");
});
