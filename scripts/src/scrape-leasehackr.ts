import axios from "axios";
import * as cheerio from "cheerio";
import { db, leaseDealsTable } from "@workspace/db";
import { isNotNull } from "drizzle-orm";

const FORUM_BASE = "https://forum.leasehackr.com";
const CATEGORY_SLUG = "deals-and-tips";
const CATEGORY_ID = 6;
const PAGES_TO_SCRAPE = 3;

const MAKE_ALIASES: Record<string, string> = {
  bmw: "BMW",
  mercedes: "Mercedes-Benz",
  mb: "Mercedes-Benz",
  "mercedes-benz": "Mercedes-Benz",
  amg: "Mercedes-AMG",
  audi: "Audi",
  honda: "Honda",
  toyota: "Toyota",
  lexus: "Lexus",
  ford: "Ford",
  chevy: "Chevrolet",
  chevrolet: "Chevrolet",
  gm: "Chevrolet",
  kia: "Kia",
  hyundai: "Hyundai",
  genesis: "Genesis",
  nissan: "Nissan",
  infiniti: "Infiniti",
  mazda: "Mazda",
  subaru: "Subaru",
  volkswagen: "Volkswagen",
  vw: "Volkswagen",
  volvo: "Volvo",
  tesla: "Tesla",
  rivian: "Rivian",
  lucid: "Lucid",
  cadillac: "Cadillac",
  buick: "Buick",
  gmc: "GMC",
  jeep: "Jeep",
  ram: "Ram",
  dodge: "Dodge",
  chrysler: "Chrysler",
  acura: "Acura",
  lincoln: "Lincoln",
  porsche: "Porsche",
  jaguar: "Jaguar",
  "land rover": "Land Rover",
  landrover: "Land Rover",
  maserati: "Maserati",
  bentley: "Bentley",
  ferrari: "Ferrari",
  lamborghini: "Lamborghini",
  mclaren: "McLaren",
  rolls: "Rolls-Royce",
  polestar: "Polestar",
  mini: "MINI",
  fiat: "FIAT",
  alfa: "Alfa Romeo",
  scout: "Scout",
};

const EV_MODELS: Set<string> = new Set([
  "model 3", "model y", "model s", "model x",
  "ioniq 5", "ioniq 6", "ioniq 9", "ev6", "ev9", "niro ev",
  "equinox ev", "blazer ev", "silverado ev",
  "mustang mach-e", "f-150 lightning",
  "leaf", "ariya",
  "id.4", "id.7", "id.buzz",
  "lyriq", "celestiq",
  "r1t", "r1s", "r2", "r3",
  "air", "gravity",
  "prologue",
  "e-tron", "q4 e-tron", "q8 e-tron",
  "eqb", "eqc", "eqe", "eqs",
  "polestar 2", "polestar 3", "polestar 4",
  "bolt ev", "bolt euv",
  "i4", "i5", "i7", "ix", "i3",
  "xc40 recharge", "c40 recharge", "ex30", "ex40", "ex90", "ec40",
  "hummer ev",
  "enyaq",
]);

const SUV_MODELS: Set<string> = new Set([
  "rav4", "rav4 prime", "highlander", "4runner", "sequoia", "land cruiser", "venza",
  "cr-v", "hr-v", "pilot", "passport", "odyssey", "ridgeline",
  "tucson", "santa fe", "palisade", "venue", "kona",
  "sportage", "sorento", "telluride", "niro",
  "rogue", "murano", "pathfinder", "armada", "frontier",
  "cx-5", "cx-50", "cx-70", "cx-90", "cx-30", "cx-3",
  "forester", "outback", "ascent",
  "tiguan", "atlas", "taos",
  "equinox", "traverse", "trailblazer", "tahoe", "suburban",
  "escape", "explorer", "edge", "bronco", "expedition",
  "grand cherokee", "cherokee", "wrangler", "gladiator", "compass",
  "navigator", "aviator", "corsair", "nautilus",
  "q3", "q5", "q7", "q8", "sq5", "sq7", "sq8",
  "x1", "x2", "x3", "x4", "x5", "x6", "x7", "xm",
  "gle", "glb", "glc", "gls", "gla",
  "rx", "nx", "ux", "gx", "lx",
  "xc40", "xc60", "xc90",
  "xt4", "xt5", "xt6", "escalade",
  "acadia", "yukon", "terrain",
  "macan", "cayenne",
  "urus",
  "defender", "discovery", "range rover", "velar", "evoque",
  "f-pace", "e-pace",
  "gv70", "gv80", "gv90",
  "r1s",
  "hummer ev",
  "stelvio",
  "levante",
  "ex90", "xc40 recharge",
  "scout terra", "scout traveler",
]);

const TRUCK_MODELS: Set<string> = new Set([
  "f-150", "f-250", "f-350", "ranger", "maverick",
  "silverado", "colorado", "canyon", "sierra",
  "ram 1500", "ram 2500", "ram 3500",
  "tundra", "tacoma",
  "frontier", "titan",
  "ridgeline",
  "gladiator",
  "r1t",
]);

const MINIVAN_MODELS: Set<string> = new Set([
  "odyssey", "sienna", "carnival", "pacifica", "voyager", "grand caravan",
]);

type CarType = "sedan" | "suv" | "truck" | "minivan" | "ev" | "coupe" | "convertible" | "hatchback" | "wagon";

export interface ScrapedDeal {
  make: string;
  model: string;
  year: number;
  carType: string;
  msrp: number | null;
  monthlyPayment: number | null;
  moneyDown: number;
  termMonths: number | null;
  mileageLimit: number | null;
  region: string;
  sourceUrl: string;
  trimLevel: string | null;
  description: string | null;
  imageUrl: string | null;
}

export interface ScrapeResult {
  imported: number;
  skipped: number;
  errors: string[];
}

function guessCarType(make: string, model: string): CarType {
  const modelLower = model.toLowerCase();
  const makeLower = make.toLowerCase();

  if (EV_MODELS.has(modelLower)) return "ev";
  if (TRUCK_MODELS.has(modelLower)) return "truck";
  if (MINIVAN_MODELS.has(modelLower)) return "minivan";
  if (SUV_MODELS.has(modelLower)) return "suv";

  for (const m of SUV_MODELS) {
    if (modelLower.includes(m)) return "suv";
  }
  for (const m of EV_MODELS) {
    if (modelLower.includes(m)) return "ev";
  }

  if (modelLower.includes("suv") || modelLower.includes("crossover")) return "suv";
  if (modelLower.includes("truck") || modelLower.includes("pickup")) return "truck";
  if (modelLower.includes("van") || modelLower.includes("minivan")) return "minivan";
  if (modelLower.includes("coupe")) return "coupe";
  if (modelLower.includes("convertible") || modelLower.includes("cabriolet")) return "convertible";
  if (modelLower.includes("hatchback") || modelLower.includes("hatch")) return "hatchback";
  if (modelLower.includes("wagon") || modelLower.includes("sportwagon") || modelLower.includes("alltrack")) return "wagon";

  return "sedan";
}

function normalizeMake(rawMake: string): string {
  const lower = rawMake.toLowerCase().trim();
  return MAKE_ALIASES[lower] ?? rawMake.trim();
}

function parseTitle(title: string): Partial<ScrapedDeal> | null {
  const clean = title.replace(/^(SIGNED|Signed):\s*/i, "").trim();

  const yearMatch = clean.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1]);

  let afterYear = clean.slice(clean.indexOf(yearMatch[1]) + 4).trim();

  let msrp: number | null = null;
  let monthlyPayment: number | null = null;
  let moneyDown = 0;
  let termMonths: number | null = null;
  let mileageLimit: number | null = null;
  let region = "National";
  let trimLevel: string | null = null;

  const msrpMatch = clean.match(/MSRP\s*\$?([\d,]+)/i);
  if (msrpMatch) {
    msrp = parseInt(msrpMatch[1].replace(/,/g, ""));
  }

  const termMilesMatch = clean.match(/\b(\d{2,3})\s*[/\\|]\s*(\d{2})\b/);
  if (termMilesMatch) {
    const candidate = parseInt(termMilesMatch[1]);
    const miles = parseInt(termMilesMatch[2]);
    if (candidate >= 24 && candidate <= 72) {
      termMonths = candidate;
      mileageLimit = miles * 1000;
    }
  }

  const termMilesMatch2 = clean.match(/(\d{2,3})(?:mo|m)\s*[/\\]\s*(\d{2})k?/i);
  if (!termMonths && termMilesMatch2) {
    const candidate = parseInt(termMilesMatch2[1]);
    const miles = parseInt(termMilesMatch2[2]);
    if (candidate >= 24 && candidate <= 72) {
      termMonths = candidate;
      mileageLimit = miles * 1000;
    }
  }

  const monthlyMatches = [...clean.matchAll(/\$\s*([\d,]+)\s*(?:\/\s*mo|per\s*mo|p\/m|monthly|\/month)/gi)];
  if (monthlyMatches.length > 0) {
    const val = parseInt(monthlyMatches[monthlyMatches.length - 1][1].replace(/,/g, ""));
    if (val > 0 && val < 10000) monthlyPayment = val;
  }

  if (!monthlyPayment) {
    const effectiveMatch = clean.match(/[Ee]ffectively\s+\$\s*([\d,]+)\s*(?:per\s*month|\/mo)?/i);
    if (effectiveMatch) {
      monthlyPayment = parseInt(effectiveMatch[1].replace(/,/g, ""));
    }
  }

  const dasMatch = clean.match(/\$\s*([\d,]+)\s*(?:DAS|das|down)/i);
  if (dasMatch) {
    const val = parseInt(dasMatch[1].replace(/,/g, ""));
    if (val < 50000) moneyDown = val;
  }

  const dollarSignMatches = [...clean.matchAll(/\$\s*([\d,]+)/g)];
  const dollarValues = dollarSignMatches
    .map((m) => parseInt(m[1].replace(/,/g, "")))
    .filter((v) => v > 0 && v < 5000);

  if (!monthlyPayment && dollarValues.length > 0) {
    monthlyPayment = dollarValues[dollarValues.length - 1];
  }

  const regionPatterns: Record<string, string> = {
    socal: "SoCal",
    "so-cal": "SoCal",
    "southern california": "SoCal",
    norcal: "NorCal",
    "nor-cal": "NorCal",
    "northern california": "NorCal",
    ny: "New York",
    nyc: "New York City",
    "new york": "New York",
    nj: "New Jersey",
    tx: "Texas",
    fl: "Florida",
    ca: "California",
    ma: "Massachusetts",
    wa: "Washington",
    il: "Illinois",
    ga: "Georgia",
    nc: "North Carolina",
    va: "Virginia",
    oh: "Ohio",
    pa: "Pennsylvania",
    az: "Arizona",
    co: "Colorado",
    national: "National",
    nationwide: "National",
  };

  for (const [pattern, regionName] of Object.entries(regionPatterns)) {
    const re = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(clean)) {
      region = regionName;
      break;
    }
  }

  const makeModelPart = afterYear.split(/\|/)[0].trim();
  const words = makeModelPart.split(/\s+/);

  if (words.length === 0) return null;

  const rawMake = words[0];
  const make = normalizeMake(rawMake);

  const modelWords: string[] = [];
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if (/^\$/.test(word) || /^\d{2,3}\//.test(word) || /^MSRP/i.test(word)) break;
    modelWords.push(word);
    if (modelWords.length >= 4) break;
  }

  if (modelWords.length === 0) return null;
  const model = modelWords.join(" ");
  const carType = guessCarType(make, model);

  if (words.length > 1 + modelWords.length) {
    const trimWords = words.slice(1 + modelWords.length);
    const trimStr = trimWords.join(" ").replace(/\|.*$/, "").trim();
    if (trimStr && trimStr.length > 0 && trimStr.length < 30) {
      trimLevel = trimStr;
    }
  }

  if (monthlyPayment === null) return null;

  return {
    make,
    model,
    year,
    carType,
    msrp,
    monthlyPayment,
    moneyDown,
    termMonths,
    mileageLimit,
    region,
    trimLevel: trimLevel || null,
    imageUrl: null,
    description: null,
  };
}

interface ForumTopic {
  id: number;
  title: string;
  slug: string;
  created_at: string;
  tags?: { name: string; slug: string }[];
}

async function fetchCategoryPage(page: number): Promise<ForumTopic[]> {
  const url = `${FORUM_BASE}/c/${CATEGORY_SLUG}/${CATEGORY_ID}.json?page=${page}`;
  const resp = await axios.get(url, {
    headers: { "User-Agent": "LeaseStealsBot/1.0 (+https://leasesteals.io)" },
    timeout: 15000,
  });
  const topics: ForumTopic[] = resp.data?.topic_list?.topics ?? [];
  return topics.filter((t) => /^(SIGNED|Signed):/i.test(t.title));
}

async function fetchTopicDescription(topicId: number, slug: string): Promise<string | null> {
  try {
    const url = `${FORUM_BASE}/t/${slug}/${topicId}.json`;
    const resp = await axios.get(url, {
      headers: { "User-Agent": "LeaseStealsBot/1.0 (+https://leasesteals.io)" },
      timeout: 10000,
    });
    const firstPost = resp.data?.post_stream?.posts?.[0];
    if (!firstPost?.cooked) return null;
    const $ = cheerio.load(firstPost.cooked);
    return $("p").first().text().trim() || null;
  } catch {
    return null;
  }
}

export async function scrapeDeals(): Promise<ScrapedDeal[]> {
  const results: ScrapedDeal[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < PAGES_TO_SCRAPE; page++) {
    let topics: ForumTopic[];
    try {
      topics = await fetchCategoryPage(page);
    } catch (err) {
      console.error(`[scraper] Failed to fetch page ${page}:`, err instanceof Error ? err.message : String(err));
      continue;
    }

    for (const topic of topics) {
      const sourceUrl = `${FORUM_BASE}/t/${topic.slug}/${topic.id}`;

      if (seen.has(sourceUrl)) continue;
      seen.add(sourceUrl);

      const parsed = parseTitle(topic.title);
      if (!parsed) {
        console.log(`[scraper] Could not parse title: "${topic.title}"`);
        continue;
      }

      if (!parsed.monthlyPayment || !parsed.make || !parsed.model) continue;

      let description: string | null = null;
      try {
        description = await fetchTopicDescription(topic.id, topic.slug);
      } catch {
      }

      results.push({
        make: parsed.make!,
        model: parsed.model!,
        year: parsed.year!,
        carType: parsed.carType!,
        msrp: parsed.msrp ?? null,
        monthlyPayment: parsed.monthlyPayment,
        moneyDown: parsed.moneyDown ?? 0,
        termMonths: parsed.termMonths ?? 36,
        mileageLimit: parsed.mileageLimit ?? 10000,
        region: parsed.region ?? "National",
        sourceUrl,
        trimLevel: parsed.trimLevel ?? null,
        description,
        imageUrl: null,
      });
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return results;
}

export async function scrapeAndUpsert(): Promise<ScrapeResult> {
  const summary: ScrapeResult = { imported: 0, skipped: 0, errors: [] };

  let deals: ScrapedDeal[];
  try {
    deals = await scrapeDeals();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.errors.push(`Scrape failed: ${msg}`);
    return summary;
  }

  const existing = await db
    .select({ sourceUrl: leaseDealsTable.sourceUrl })
    .from(leaseDealsTable)
    .where(isNotNull(leaseDealsTable.sourceUrl));

  const existingUrls = new Set(
    existing.map((r) => r.sourceUrl).filter(Boolean) as string[]
  );

  for (const deal of deals) {
    if (existingUrls.has(deal.sourceUrl)) {
      summary.skipped++;
      continue;
    }

    if (!deal.monthlyPayment) {
      summary.skipped++;
      continue;
    }

    try {
      const msrp = deal.msrp ?? deal.monthlyPayment * 120;

      await db.insert(leaseDealsTable).values({
        make: deal.make,
        model: deal.model,
        year: deal.year,
        carType: deal.carType,
        msrp: String(msrp),
        monthlyPayment: String(deal.monthlyPayment),
        moneyDown: String(deal.moneyDown),
        termMonths: deal.termMonths ?? 36,
        mileageLimit: deal.mileageLimit ?? 10000,
        region: deal.region,
        sourceUrl: deal.sourceUrl,
        trimLevel: deal.trimLevel ?? null,
        description: deal.description ?? null,
        imageUrl: null,
      });

      existingUrls.add(deal.sourceUrl);
      summary.imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push(`Failed to insert ${deal.make} ${deal.model}: ${msg}`);
    }
  }

  return summary;
}
