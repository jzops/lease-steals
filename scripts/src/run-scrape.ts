import { scrapeAndUpsert } from "./scrape-leasehackr.js";

async function main() {
  console.log("[run-scrape] Starting leasehackr scrape...");
  const result = await scrapeAndUpsert();
  console.log(`[run-scrape] Done. Imported: ${result.imported}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`);
  if (result.errors.length > 0) {
    result.errors.forEach((e) => console.error("[run-scrape] Error:", e));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[run-scrape] Fatal:", err);
  process.exit(1);
});
