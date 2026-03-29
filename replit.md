# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains **LeaseSteals** — a US car lease deal tracker website that surfaces the best "sign and drive" deals ($0 down, <1% MSRP per month).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, TailwindCSS v4, Framer Motion, shadcn/ui
- **UI**: Dark mode, green accent theme

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── lease-steals/       # LeaseSteals React + Vite frontend (served at /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed-deals.ts   # Seeds 12 sample lease deals
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## LeaseSteals App

### Features
- Homepage hero with "Find Your Next Sign & Drive Lease" headline
- Deal card grid with deal score badges (% of MSRP), Sign & Drive badges, share buttons
- Filter bar: brand, car type (sedan/SUV/truck/EV/etc), max monthly payment, sort by deal score
- Deal detail modal with full lease terms
- Email alert signup (stored in `email_subscribers` table)
- Admin page (`/admin`) to create/edit/delete deals
- 12 seeded sample deals covering sedans, EVs, and SUVs

### Deal Score Logic
`deal_score = (monthly_payment / msrp) * 100`
- < 0.75%: 🔥 Excellent (green badge)
- 0.75–1.0%: Good (yellow badge)  
- > 1.0%: Over budget (orange/red badge)
- `isSignAndDrive = true` when `money_down === 0 AND deal_score < 1.0`

## Database Schema

### `lease_deals`
- id, make, model, year, car_type, msrp, monthly_payment, money_down
- term_months, mileage_limit, region, expires_at
- image_url, source_url, trim_level, description
- created_at, updated_at

### `email_subscribers`
- id, email (unique), created_at

## API Endpoints

All at `/api`:
- `GET /api/healthz` - Health check
- `GET /api/deals` - List deals (filters: brand, carType, maxMonthly; sort: deal_score/monthly_payment/created_at)
- `GET /api/deals/:id` - Single deal
- `POST /api/deals` - Create deal (admin)
- `PUT /api/deals/:id` - Update deal (admin)
- `DELETE /api/deals/:id` - Delete deal (admin)
- `POST /api/subscribers` - Subscribe to alerts

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerates API client + Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/scripts run seed-deals` — seed sample deals

## Development

- API server: `pnpm --filter @workspace/api-server run dev` (runs on PORT env var, mapped to /api)
- Frontend: `pnpm --filter @workspace/lease-steals run dev` (runs on PORT env var, served at /)
