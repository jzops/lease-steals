import app from "./app";
import { logger } from "./lib/logger";
import { scrapeAndUpsert } from "./lib/scraper";
import { updateSyncStatus } from "./routes/deals";
import cron from "node-cron";

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
});

cron.schedule(
  "0 0 * * *",
  async () => {
    logger.info("[scraper] Starting nightly leasehackr sync...");
    try {
      const result = await scrapeAndUpsert();
      updateSyncStatus({ imported: result.imported, skipped: result.skipped, errors: result.errors.length });
      logger.info(
        { imported: result.imported, skipped: result.skipped, errors: result.errors.length },
        "[scraper] Nightly sync complete"
      );
      if (result.errors.length > 0) {
        result.errors.forEach((e) => logger.warn(`[scraper] ${e}`));
      }
    } catch (err) {
      logger.error({ err }, "[scraper] Nightly sync failed");
    }
  },
  { timezone: "America/New_York" }
);
