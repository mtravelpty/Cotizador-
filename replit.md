# RGE Style Travel — Cotizador de Viajes

Professional travel quotation system for RGE Style Travel. Reads the price list from an Excel file (`TARIFARIO.xlsx`) and allows building quotes with multi-accommodation (SGL/DBL/TPL in parallel), automatic itinerary, and export via WhatsApp, Email, and PDF.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — backend dev (port 8080)
- `pnpm --filter @workspace/cotizador run dev` — frontend dev (port 5000)
- `pnpm --filter @workspace/db run push` — sync DB schema
- `pnpm run typecheck` — full typecheck
- Replace the price list: copy a new file to `artifacts/api-server/TARIFARIO.xlsx` and POST to `/api/reload`
- Required env vars: `DATABASE_URL`, `PORT`, `BASE_PATH`

## Stack

- **Monorepo**: pnpm workspaces, TypeScript 5.9
- **Backend**: Express 5, xlsx (Excel parsing), pino (logging), Drizzle ORM + PostgreSQL
- **Frontend**: React 19, Vite 7, TailwindCSS 4, wouter, Radix UI, TanStack Query, html2pdf.js
- **Build**: esbuild (API server bundler)

## Where things live

- `artifacts/api-server/` — Express API server
- `artifacts/api-server/TARIFARIO.xlsx` — Primary data source (hotels, tours, transfers)
- `artifacts/cotizador/` — React frontend
- `artifacts/cotizador/src/lib/propuesta.ts` — HTML proposal builder for exports
- `lib/db/` — Drizzle ORM schema + DB connection
- `lib/api-zod/` — Zod schemas
- `lib/api-client-react/` — TanStack Query hooks
- `attached_assets/` — DESCRIPTIVOS_*.docx source files for tour descriptions

## Architecture decisions

- Excel file is the single source of truth for pricing; parsed at startup and reloadable via `POST /api/reload`
- Frontend proxies `/api/*` to the backend at port 8080 via Vite dev server proxy
- esbuild bundles the API server into a single ESM file for fast startup
- Tour descriptivos auto-load from `.docx` files in `attached_assets/` at build time
- No login/auth — the app is intended for internal agency use only

## Product

- Build multi-accommodation travel quotes (SGL/DBL/TPL in parallel)
- Search catalog of 148+ hotels, 42 tours, 43 transfers from Excel tarifario
- Ticket pricing, custom items, notes per service
- Toggle itinerary, schedule, and full descriptive sections in the proposal
- Export proposal to WhatsApp (clipboard), Email (mailto), or PDF (print)
- Upload a new tarifario Excel without restarting

## User preferences

_Populate as you build_

## Gotchas

- esbuild postinstall script must be approved; `pnpm-workspace.yaml` `onlyBuiltDependencies` includes it
- API server must be running before the frontend loads (Vite proxy to port 8080)
- `DATABASE_URL` must be set for the server to start (Replit PostgreSQL provisioned)
- Frontend workflow must use port 5000 (webview requirement)

## Pointers

- DB skill: `.local/skills/database/SKILL.md`
- Workflows skill: `.local/skills/workflows/SKILL.md`
