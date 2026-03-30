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
  rolls: "Rolls-Royce",
  polestar: "Polestar",
  mini: "MINI",
  fiat: "FIAT",
  alfa: "Alfa Romeo",
  scout: "Scout",
};

const EV_MODELS = new Set([
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
  "i4", "i5", "i7", "ix",
  "xc40 recharge", "c40 recharge", "ex30", "ex40", "ex90", "ec40",
]);

const SUV_MODELS = new Set([
  "rav4", "rav4 prime", "highlander", "4runner", "sequoia", "land cruiser",
  "cr-v", "hr-v", "pilot", "passport",
  "tucson", "santa fe", "palisade", "venue", "kona",
  "sportage", "sorento", "telluride", "niro",
  "rogue", "murano", "pathfinder", "armada",
  "cx-5", "cx-50", "cx-70", "cx-90", "cx-30", "cx-3",
  "forester", "outback", "ascent",
  "tiguan", "atlas", "taos",
  "equinox", "traverse", "trailblazer", "tahoe", "suburban",
  "escape", "explorer", "edge", "bronco", "expedition",
  "grand cherokee", "cherokee", "wrangler", "compass",
  "navigator", "aviator", "corsair", "nautilus",
  "q3", "q5", "q7", "q8", "sq5", "sq7", "sq8",
  "x1", "x2", "x3", "x4", "x5", "x6", "x7", "xm",
  "gle", "glb", "glc", "gls", "gla",
  "rx", "nx", "ux", "gx", "lx",
  "xc40", "xc60", "xc90",
  "xt4", "xt5", "xt6", "escalade",
  "acadia", "yukon", "terrain",
  "macan", "cayenne", "urus",
  "defender", "discovery", "range rover", "velar", "evoque",
  "f-pace", "e-pace",
  "gv70", "gv80", "gv90",
  "stelvio", "levante",
]);

const TRUCK_MODELS = new Set([
  "f-150", "f-250", "f-350", "ranger", "maverick",
  "silverado", "colorado", "canyon", "sierra",
  "ram 1500", "ram 2500", "ram 3500",
  "tundra", "tacoma", "frontier", "titan", "ridgeline", "gladiator",
]);

const MINIVAN_MODELS = new Set([
  "odyssey", "sienna", "carnival", "pacifica", "voyager",
]);

function guessCarType(make: string, model: string): string {
  const modelLower = model.toLowerCase();

  if (EV_MODELS.has(modelLower)) return "ev";
  if (TRUCK_MODELS.has(modelLower)) return "truck";
  if (MINIVAN_MODELS.has(modelLower)) return "minivan";
  if (SUV_MODELS.has(modelLower)) return "suv";

  for (const m of EV_MODELS) {
    if (modelLower.includes(m)) return "ev";
  }
  for (const m of SUV_MODELS) {
    if (modelLower.includes(m)) return "suv";
  }

  if (modelLower.includes("suv") || modelLower.includes("crossover")) return "suv";
  if (modelLower.includes("truck") || modelLower.includes("pickup")) return "truck";
  if (modelLower.includes("van")) return "minivan";
  if (modelLower.includes("coupe")) return "coupe";
  if (modelLower.includes("wagon")) return "wagon";
  return "sedan";
}

function normalizeMake(rawMake: string): string {
  const lower = rawMake.toLowerCase().trim();
  return MAKE_ALIASES[lower] ?? rawMake.trim();
}

interface ParsedDeal {
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
  trimLevel: string | null;
}

function parseTitle(title: string): ParsedDeal | null {
  const clean = title.replace(/^(SIGNED|Signed):\s*/i, "").trim();

  const yearMatch = clean.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1]);

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

  const termMilesPatterns = [
    /\b(\d{2,3})\s*[/\\|]\s*(\d{2})\b/,
    /(\d{2,3})(?:mo|m|months?)\s*[/\\]\s*(\d{2})k?/i,
    /\b(\d{2,3})mo[, ]\s*(\d{2})k\b/i,
  ];
  for (const pat of termMilesPatterns) {
    const m = clean.match(pat);
    if (m) {
      const term = parseInt(m[1]);
      const miles = parseInt(m[2]);
      if (term >= 24 && term <= 72 && miles >= 7 && miles <= 20) {
        termMonths = term;
        mileageLimit = miles * 1000;
        break;
      }
    }
  }

  const monthlyPatterns = [
    /\$\s*([\d,]+)\s*(?:\/\s*mo(?:nth)?|per\s*mo(?:nth)?|p\/m|monthly)\b/gi,
    /\$\s*([\d,]+)\s*p\/m\b/gi,
  ];
  for (const pat of monthlyPatterns) {
    const matches = [...clean.matchAll(pat)];
    if (matches.length > 0) {
      const val = parseInt(matches[matches.length - 1][1].replace(/,/g, ""));
      if (val > 0 && val < 10000) {
        monthlyPayment = val;
        break;
      }
    }
  }

  if (!monthlyPayment) {
    const effectiveMatch = clean.match(/[Ee]ffectively\s+\$\s*([\d,]+)/i);
    if (effectiveMatch) {
      const val = parseInt(effectiveMatch[1].replace(/,/g, ""));
      if (val > 0 && val < 10000) monthlyPayment = val;
    }
  }

  const dasMatch = clean.match(/\$\s*([\d,]+)\s*(?:DAS|das|down)/i);
  if (dasMatch) {
    const val = parseInt(dasMatch[1].replace(/,/g, ""));
    if (val >= 0 && val < 50000) moneyDown = val;
  }

  if (!monthlyPayment) {
    const allDollar = [...clean.matchAll(/\$\s*([\d,]+)/g)]
      .map((m) => parseInt(m[1].replace(/,/g, "")))
      .filter((v) => v >= 100 && v <= 5000);
    if (allDollar.length > 0) {
      monthlyPayment = allDollar[allDollar.length - 1];
    }
  }

  const regionPatterns: [RegExp, string][] = [
    [/\bsocal\b|\bso-cal\b/i, "Southern California"],
    [/\bnorcal\b|\bnor-cal\b/i, "Northern California"],
    [/\bnyc\b/i, "New York City"],
    [/\bnew york\b|\bny\b/i, "New York"],
    [/\bnew jersey\b|\bnj\b/i, "New Jersey"],
    [/\btexas\b|\btx\b/i, "Texas"],
    [/\bflorida\b|\bfl\b/i, "Florida"],
    [/\bcalifornia\b|\bca\b/i, "California"],
    [/\bmassachusetts\b|\bma\b/i, "Massachusetts"],
    [/\bwashington\b|\bwa\b/i, "Washington"],
    [/\billinois\b|\bil\b/i, "Illinois"],
    [/\bgeorgia\b|\bga\b/i, "Georgia"],
    [/\bnorth carolina\b|\bnc\b/i, "North Carolina"],
    [/\bvirginia\b|\bva\b/i, "Virginia"],
    [/\bohio\b|\boh\b/i, "Ohio"],
    [/\bpennsylvania\b|\bpa\b/i, "Pennsylvania"],
    [/\barizona\b|\baz\b/i, "Arizona"],
    [/\bcolorado\b|\bco\b/i, "Colorado"],
    [/\bnational\b|\bnationwide\b/i, "National"],
  ];

  for (const [re, regionName] of regionPatterns) {
    if (re.test(clean)) {
      region = regionName;
      break;
    }
  }

  const afterYear = clean.slice(clean.indexOf(yearMatch[1]) + 4).trim();
  const beforePipe = afterYear.split(/\s*\|/)[0].trim();
  const words = beforePipe.split(/\s+/);

  if (words.length < 2) return null;

  const rawMake = words[0];
  const make = normalizeMake(rawMake);

  const modelWords: string[] = [];
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if (/^\$/.test(word) || /^MSRP$/i.test(word) || /^\d{2,3}\//.test(word)) break;
    modelWords.push(word);
    if (modelWords.length >= 3) break;
  }

  if (modelWords.length === 0) return null;
  const model = modelWords.join(" ");

  const remainingWords = words.slice(1 + modelWords.length);
  if (remainingWords.length > 0) {
    const t = remainingWords.join(" ").trim();
    if (t && t.length > 0 && t.length <= 30 && !/^\d/.test(t)) {
      trimLevel = t;
    }
  }

  const carType = guessCarType(make, model);

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
    trimLevel,
  };
}

interface ForumTopic {
  id: number;
  title: string;
  slug: string;
  created_at: string;
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
    const $ = cheerio.load(firstPost.cooked as string);
    return $("p").first().text().trim() || null;
  } catch {
    return null;
  }
}

export interface ScrapeResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function scrapeAndUpsert(): Promise<ScrapeResult> {
  const summary: ScrapeResult = { imported: 0, skipped: 0, errors: [] };

  const existing = await db
    .select({ sourceUrl: leaseDealsTable.sourceUrl })
    .from(leaseDealsTable)
    .where(isNotNull(leaseDealsTable.sourceUrl));

  const existingUrls = new Set(
    existing.map((r) => r.sourceUrl).filter(Boolean) as string[]
  );

  for (let page = 0; page < PAGES_TO_SCRAPE; page++) {
    let topics: ForumTopic[];
    try {
      topics = await fetchCategoryPage(page);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push(`Failed to fetch page ${page}: ${msg}`);
      continue;
    }

    for (const topic of topics) {
      const sourceUrl = `${FORUM_BASE}/t/${topic.slug}/${topic.id}`;

      if (existingUrls.has(sourceUrl)) {
        summary.skipped++;
        continue;
      }

      const parsed = parseTitle(topic.title);
      if (!parsed || !parsed.monthlyPayment) {
        summary.skipped++;
        continue;
      }

      let description: string | null = null;
      try {
        description = await fetchTopicDescription(topic.id, topic.slug);
      } catch {
      }

      const msrp = parsed.msrp ?? parsed.monthlyPayment * 120;

      // Sanity-check: reject clearly bad parses before they hit the DB
      if (msrp < 12000 || msrp > 600000) {
        summary.errors.push(`Skipping "${topic.title}": MSRP $${msrp} is out of valid range`);
        summary.skipped++;
        continue;
      }
      const dealScore = (parsed.monthlyPayment / msrp) * 100;
      if (dealScore < 0.15 || dealScore > 4.0) {
        summary.errors.push(`Skipping "${topic.title}": deal score ${dealScore.toFixed(2)}% is implausible`);
        summary.skipped++;
        continue;
      }
      if (parsed.monthlyPayment < 50 || parsed.monthlyPayment > 10000) {
        summary.errors.push(`Skipping "${topic.title}": monthly $${parsed.monthlyPayment} is out of range`);
        summary.skipped++;
        continue;
      }

      try {
        await db.insert(leaseDealsTable).values({
          make: parsed.make,
          model: parsed.model,
          year: parsed.year,
          carType: parsed.carType,
          msrp: String(msrp),
          monthlyPayment: String(parsed.monthlyPayment),
          moneyDown: String(parsed.moneyDown),
          termMonths: parsed.termMonths ?? 36,
          mileageLimit: parsed.mileageLimit ?? 10000,
          region: parsed.region,
          sourceUrl,
          trimLevel: parsed.trimLevel ?? null,
          description: description ?? null,
          imageUrl: null,
        });

        existingUrls.add(sourceUrl);
        summary.imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        summary.errors.push(`Insert failed for "${topic.title}": ${msg}`);
      }
    }

    if (page < PAGES_TO_SCRAPE - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return summary;
}
