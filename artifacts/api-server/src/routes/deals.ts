import { Router, type IRouter } from "express";
import { db, leaseDealsTable } from "@workspace/db";
import {
  ListDealsQueryParams,
  CreateDealBody,
  GetDealParams,
  UpdateDealParams,
  UpdateDealBody,
  DeleteDealParams,
} from "@workspace/api-zod";
import { eq, and, lte, ilike, desc, asc, count, sql } from "drizzle-orm";
import { requireAdminKey } from "../middlewares/admin-auth";
import { scrapeAndUpsert } from "../lib/scraper";

let lastSyncAt: string | null = null;
let lastSyncResult: { imported: number; skipped: number; errors: number } | null = null;

const router: IRouter = Router();

function computeDealScore(monthlyPayment: string | number, msrp: string | number): number {
  const monthly = Number(monthlyPayment);
  const msrpNum = Number(msrp);
  if (!msrpNum) return 0;
  return Math.round((monthly / msrpNum) * 10000) / 100;
}

function formatDeal(deal: typeof leaseDealsTable.$inferSelect) {
  const dealScore = computeDealScore(deal.monthlyPayment, deal.msrp);
  const moneyDown = Number(deal.moneyDown);
  const isSignAndDrive = moneyDown === 0 && dealScore < 1.0;

  return {
    id: deal.id,
    make: deal.make,
    model: deal.model,
    year: deal.year,
    carType: deal.carType,
    msrp: Number(deal.msrp),
    monthlyPayment: Number(deal.monthlyPayment),
    moneyDown,
    termMonths: deal.termMonths,
    mileageLimit: deal.mileageLimit,
    dealScore,
    isSignAndDrive,
    region: deal.region,
    expiresAt: deal.expiresAt?.toISOString() ?? null,
    imageUrl: deal.imageUrl ?? null,
    sourceUrl: deal.sourceUrl ?? null,
    trimLevel: deal.trimLevel ?? null,
    description: deal.description ?? null,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  };
}

router.get("/deals", async (req, res) => {
  const parsed = ListDealsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { brand, carType, maxMonthly, sortBy, sortOrder, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (brand) {
    conditions.push(ilike(leaseDealsTable.make, `%${brand}%`));
  }
  if (carType) {
    conditions.push(eq(leaseDealsTable.carType, carType));
  }
  if (maxMonthly !== undefined) {
    conditions.push(lte(leaseDealsTable.monthlyPayment, String(maxMonthly)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const dealScoreExpr = sql`(${leaseDealsTable.monthlyPayment} / ${leaseDealsTable.msrp} * 100)`;

  let orderExpr;
  const orderFn = sortOrder === "desc" ? desc : asc;
  switch (sortBy) {
    case "monthly_payment":
      orderExpr = orderFn(leaseDealsTable.monthlyPayment);
      break;
    case "msrp":
      orderExpr = orderFn(leaseDealsTable.msrp);
      break;
    case "created_at":
      orderExpr = orderFn(leaseDealsTable.createdAt);
      break;
    case "deal_score":
    default:
      orderExpr = orderFn(dealScoreExpr);
  }

  const [deals, [{ total }]] = await Promise.all([
    db
      .select()
      .from(leaseDealsTable)
      .where(whereClause)
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(leaseDealsTable).where(whereClause),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    deals: deals.map(formatDeal),
    total,
    page,
    limit,
    totalPages,
  });
});

router.get("/deals/:id", async (req, res) => {
  const parsed = GetDealParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const [deal] = await db
    .select()
    .from(leaseDealsTable)
    .where(eq(leaseDealsTable.id, parsed.data.id))
    .limit(1);

  if (!deal) {
    res.status(404).json({ error: "not_found", message: "Deal not found" });
    return;
  }

  res.json(formatDeal(deal));
});

router.post("/deals", requireAdminKey, async (req, res) => {
  const parsed = CreateDealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const data = parsed.data;

  const [deal] = await db
    .insert(leaseDealsTable)
    .values({
      make: data.make,
      model: data.model,
      year: data.year,
      carType: data.carType,
      msrp: String(data.msrp),
      monthlyPayment: String(data.monthlyPayment),
      moneyDown: String(data.moneyDown ?? 0),
      termMonths: data.termMonths,
      mileageLimit: data.mileageLimit,
      region: data.region,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      imageUrl: data.imageUrl ?? null,
      sourceUrl: data.sourceUrl ?? null,
      trimLevel: data.trimLevel ?? null,
      description: data.description ?? null,
    })
    .returning();

  res.status(201).json(formatDeal(deal));
});

router.put("/deals/:id", requireAdminKey, async (req, res) => {
  const paramsParsed = UpdateDealParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "validation_error", message: paramsParsed.error.message });
    return;
  }

  const bodyParsed = UpdateDealBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "validation_error", message: bodyParsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(leaseDealsTable)
    .where(eq(leaseDealsTable.id, paramsParsed.data.id))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "not_found", message: "Deal not found" });
    return;
  }

  const data = bodyParsed.data;
  const updateData: Partial<typeof leaseDealsTable.$inferInsert> = {};

  if (data.make !== undefined) updateData.make = data.make;
  if (data.model !== undefined) updateData.model = data.model;
  if (data.year !== undefined) updateData.year = data.year;
  if (data.carType !== undefined) updateData.carType = data.carType;
  if (data.msrp !== undefined) updateData.msrp = String(data.msrp);
  if (data.monthlyPayment !== undefined) updateData.monthlyPayment = String(data.monthlyPayment);
  if (data.moneyDown !== undefined) updateData.moneyDown = String(data.moneyDown);
  if (data.termMonths !== undefined) updateData.termMonths = data.termMonths;
  if (data.mileageLimit !== undefined) updateData.mileageLimit = data.mileageLimit;
  if (data.region !== undefined) updateData.region = data.region;
  if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl ?? null;
  if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl ?? null;
  if (data.trimLevel !== undefined) updateData.trimLevel = data.trimLevel ?? null;
  if (data.description !== undefined) updateData.description = data.description ?? null;

  const [updated] = await db
    .update(leaseDealsTable)
    .set(updateData)
    .where(eq(leaseDealsTable.id, paramsParsed.data.id))
    .returning();

  res.json(formatDeal(updated));
});

router.delete("/deals/:id", requireAdminKey, async (req, res) => {
  const parsed = DeleteDealParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(leaseDealsTable)
    .where(eq(leaseDealsTable.id, parsed.data.id))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "not_found", message: "Deal not found" });
    return;
  }

  await db.delete(leaseDealsTable).where(eq(leaseDealsTable.id, parsed.data.id));
  res.status(204).send();
});

router.get("/admin/validate", requireAdminKey, (_req, res) => {
  res.json({ ok: true });
});

router.get("/admin/sync-status", requireAdminKey, (_req, res) => {
  res.json({ lastSyncAt, lastSyncResult });
});

router.post("/admin/scrape", requireAdminKey, async (_req, res) => {
  try {
    const result = await scrapeAndUpsert();
    lastSyncAt = new Date().toISOString();
    lastSyncResult = {
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors.length,
    };
    res.json({
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      syncedAt: lastSyncAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "scrape_failed", message: msg });
  }
});

export default router;
