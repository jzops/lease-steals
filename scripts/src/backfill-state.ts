import { db, leaseDealsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const REGION_TO_STATE: Record<string, string | null> = {
  national: null,
  nationwide: null,
  arizona: "AZ",
  az: "AZ",
  california: "CA",
  ca: "CA",
  "southern california": "CA",
  socal: "CA",
  "northern california": "CA",
  norcal: "CA",
  texas: "TX",
  tx: "TX",
  florida: "FL",
  fl: "FL",
  "new york": "NY",
  "new york city": "NY",
  nyc: "NY",
  ny: "NY",
  "new jersey": "NJ",
  nj: "NJ",
  illinois: "IL",
  il: "IL",
  chicago: "IL",
  washington: "WA",
  wa: "WA",
  colorado: "CO",
  co: "CO",
  nevada: "NV",
  nv: "NV",
  georgia: "GA",
  ga: "GA",
  "north carolina": "NC",
  nc: "NC",
  virginia: "VA",
  va: "VA",
  massachusetts: "MA",
  ma: "MA",
  minnesota: "MN",
  mn: "MN",
  oregon: "OR",
  or: "OR",
  utah: "UT",
  ut: "UT",
  ohio: "OH",
  oh: "OH",
  michigan: "MI",
  mi: "MI",
  pennsylvania: "PA",
  pa: "PA",
  maryland: "MD",
  md: "MD",
  tennessee: "TN",
  tn: "TN",
  indiana: "IN",
  in: "IN",
  missouri: "MO",
  mo: "MO",
  wisconsin: "WI",
  wi: "WI",
  oklahoma: "OK",
  ok: "OK",
};

function regionToState(region: string): string | null {
  const norm = region.toLowerCase().trim();
  if (norm in REGION_TO_STATE) return REGION_TO_STATE[norm];
  return null;
}

async function main() {
  const all = await db.select().from(leaseDealsTable);
  console.log(`Found ${all.length} deals to backfill.`);

  let withState = 0;
  let national = 0;

  for (const d of all) {
    const state = regionToState(d.region);
    const sourceType = d.sourceUrl?.includes("leasehackr.com")
      ? "forum"
      : "manual";

    await db
      .update(leaseDealsTable)
      .set({
        state,
        sourceType,
        status: "published",
      })
      .where(eq(leaseDealsTable.id, d.id));

    if (state) {
      withState++;
    } else {
      national++;
    }
  }

  console.log(
    `Backfill done. ${withState} state-scoped, ${national} national/unmatched.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
