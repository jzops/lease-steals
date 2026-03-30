import app from "./app";
import { logger } from "./lib/logger";
import { scrapeAndUpsert } from "./lib/scraper";
import { updateSyncStatus } from "./routes/deals";
import { db, leaseDealsTable } from "@workspace/db";
import { count } from "drizzle-orm";
import cron from "node-cron";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // On startup: if the DB has fewer than 10 deals, run the scraper immediately
  try {
    const [{ total }] = await db.select({ total: count() }).from(leaseDealsTable);
    if (total < 10) {
      logger.info({ total }, "[scraper] Sparse DB detected — running startup scrape");
      const result = await scrapeAndUpsert();
      updateSyncStatus({ imported: result.imported, skipped: result.skipped, errors: result.errors.length });
      logger.info(
        { imported: result.imported, skipped: result.skipped, errors: result.errors.length },
        "[scraper] Startup scrape complete"
      );
      if (result.errors.length > 0) {
        result.errors.forEach((e) => logger.warn(`[scraper] ${e}`));
      }
    } else {
      logger.info({ total }, "[scraper] DB has deals, skipping startup scrape");
    }
  } catch (err) {
    logger.error({ err }, "[scraper] Startup scrape check failed");
  }
});

async function runScrape(label: string) {
  logger.info(`[scraper] Starting ${label} sync...`);
  try {
    const result = await scrapeAndUpsert();
    updateSyncStatus({ imported: result.imported, skipped: result.skipped, errors: result.errors.length });
    logger.info(
      { imported: result.imported, skipped: result.skipped, errors: result.errors.length },
      `[scraper] ${label} sync complete`
    );
    if (result.errors.length > 0) {
      result.errors.forEach((e) => logger.warn(`[scraper] ${e}`));
    }
  } catch (err) {
    logger.error({ err }, `[scraper] ${label} sync failed`);
  }
}

// Run every 4 hours: midnight, 4am, 8am, noon, 4pm, 8pm ET
cron.schedule("0 0,4,8,12,16,20 * * *", () => runScrape("scheduled"), { timezone: "America/New_York" });
