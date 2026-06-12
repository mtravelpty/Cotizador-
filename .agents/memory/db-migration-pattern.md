---
name: DB migration pattern
description: How localStorage was migrated to PostgreSQL — lib patterns, React Query cache, and component update rules.
---

## Rule
Every data lib has three layers: sync `loadXxx()` (reads React Query cache / falls back to []), async `loadXxxAsync()` (hits API + populates cache), and sync `saveXxx()` (updates cache immediately + fires background API call).

**Why:** Components need sync initial values to avoid flicker; the background API call ensures persistence; React Query cache is the bridge between the two.

**How to apply:**
- `useState(() => loadXxx())` — sync init from cache (or [])
- `useEffect(() => { loadXxxAsync().then(setState); }, [])` — hydrate from DB on mount
- `persist(next)` — call `saveXxx(next)` (sync cache update) then let it background-sync to API

## Backend routes (all behind requireAuth middleware)
- `/api/guardadas` — CRUD for CotizacionGuardada
- `/api/oportunidades` — CRUD for Opportunity
- `/api/observaciones` + `/bulk-sync` — observaciones catalog
- `/api/plantillas` — CRUD for plantillas
- `/api/tarifas/:tipo` + `/bulk-sync` — hoteles/tours/traslados custom
- `/api/descriptivos-custom` + `/bulk-sync` — custom descriptivos
- `/api/agencias` — agency catalog
- `/api/backup/export` + `/import` — DB-backed backup

## Key gotcha
`saveDescriptivosLS` is async (void return); call it with `void saveDescriptivosLS(next)` in sync persist functions.

`migrarEstado` type cast in Guardadas.tsx needs `as unknown as { estado?: EstadoCotizacion }` not `string`.

`apiFetch` must use `Omit<RequestInit, "body"> & { body?: unknown }` to avoid TS2322 on body parameter.

## Missing functions that were removed from descriptivos.ts rewrite
`duplicarDescriptivo`, `fromDescriptivo`, `toDescriptivo`, `buildDescriptivoPreviewHtml` — all must exist in descriptivos.ts or Descriptivos.tsx and DescriptivoEditor.tsx will fail to compile.
