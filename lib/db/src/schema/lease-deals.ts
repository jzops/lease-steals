import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaseDealsTable = pgTable("lease_deals", {
  id: serial("id").primaryKey(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  carType: text("car_type").notNull(),
  msrp: numeric("msrp", { precision: 10, scale: 2 }).notNull(),
  monthlyPayment: numeric("monthly_payment", { precision: 8, scale: 2 }).notNull(),
  moneyDown: numeric("money_down", { precision: 8, scale: 2 }).notNull().default("0"),
  termMonths: integer("term_months").notNull(),
  mileageLimit: integer("mileage_limit").notNull(),
  region: text("region").notNull().default("National"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  imageUrl: text("image_url"),
  sourceUrl: text("source_url"),
  trimLevel: text("trim_level"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeaseDealSchema = createInsertSchema(leaseDealsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeaseDeal = z.infer<typeof insertLeaseDealSchema>;
export type LeaseDeal = typeof leaseDealsTable.$inferSelect;
