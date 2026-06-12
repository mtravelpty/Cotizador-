---
name: Basic Auth (Usuarios Nivel 1)
description: JWT login/logout system — architecture decisions and constraints for Phase 1
---

## What was built
Single-type user auth with **username + password**, JWT (30d), stored in localStorage.
Login uses `username` (short name like "maria"), NOT email.

## Key decisions

**Why username instead of email:**
Users wanted short, memorable login names (maria, jose, admin) rather than email addresses.
`correo` is kept optional in the DB for future use.

**Seed users (auto-created at startup):**
- `admin` / `rge2025` — Administrador
- `maria` / `maria2025` — María González
- `jose` / `jose2025` — José Pérez
Lives in `artifacts/api-server/src/lib/seed.ts`. Uniqueness key is `username`.
Seed also patches `username` onto existing rows that predate this change.

**JWT secret:**
`process.env.SESSION_SECRET ?? "rge-jwt-secret-dev-2025"` — set `SESSION_SECRET` env var in production.

**Storage keys:**
- `cotizador.authToken` — JWT token
- `cotizador.activeUser` — `{ id, nombre, correo }` JSON

**Auth endpoints (only two):**
- `POST /api/auth/login` — body: `{ username, contrasena }` — returns `{ token, user }`
- `GET /api/auth/me` — verifies token, returns user payload

**How to apply:**
- Adding a user → add to `SEED_USERS` in `seed.ts` and restart the server (it auto-creates on startup)
- Phase 2 will add admin UI for user management and roles

## DB schema
`usuarios` table: `id, nombre, username (unique nullable), correo (nullable), contrasena_hash, activo, created_at`.
Schema is in `lib/db/src/schema/users.ts`.
Migration was applied manually via SQL (drizzle push requires interactive input for unique constraints).

## Quote tracking
- `CotizacionGuardada.createdByName` / `updatedByName` — set from `user?.nombre` (full name)
- `Opportunity.createdByName` / `updatedByName` — propagated through `buildOppInput`
- `OppHistorialEntry.byUser` — set on every history entry using full `nombre`, never username
