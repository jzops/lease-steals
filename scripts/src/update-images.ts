import { db, leaseDealsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type WikiResp = {
  query?: {
    pages?: Record<
      string,
      {
        thumbnail?: { source: string };
      }
    >;
  };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchImage(make: string, model: string): Promise<string | null> {
  const queries = [
    `${make} ${model}`,
    `${make}_${model}`.replace(/\s+/g, "_"),
    model,
  ];

  for (const title of queries) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(
      title,
    )}&prop=pageimages&pithumbsize=1200&redirects=1`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "lease-steals-image-updater/1.0 (https://github.com/jzops/lease-steals)",
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        await sleep(1500);
        continue;
      }
      const json = (await res.json()) as WikiResp;
      const pages = json.query?.pages ?? {};
      for (const page of Object.values(pages)) {
        if (page.thumbnail?.source) return page.thumbnail.source;
      }
    } catch {
      /* try next variant */
    }
    await sleep(800);
  }
  return null;
}

async function main() {
  const onlyMissing = process.argv.includes("--missing-only");
  const all = await db.select().from(leaseDealsTable);
  const deals = onlyMissing ? all.filter((d) => !d.imageUrl) : all;
  console.log(
    `Found ${all.length} deals total, processing ${deals.length}${onlyMissing ? " (missing-only)" : ""}.`,
  );

  let updated = 0;
  let skipped = 0;
  let missed = 0;

  for (const d of deals) {
    if (!onlyMissing && d.imageUrl) {
      skipped++;
      continue;
    }
    const img = await fetchImage(d.make, d.model);
    if (!img) {
      console.log(`  ✗ ${d.make} ${d.model} — no image found`);
      missed++;
      await sleep(800);
      continue;
    }
    await db
      .update(leaseDealsTable)
      .set({ imageUrl: img })
      .where(eq(leaseDealsTable.id, d.id));
    console.log(`  ✓ ${d.make} ${d.model} → ${img.split("/").pop()}`);
    updated++;
    await sleep(800);
  }

  console.log(
    `\nUpdated ${updated}, skipped ${skipped} (already had image), missed ${missed}.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
