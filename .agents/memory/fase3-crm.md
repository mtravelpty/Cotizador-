---
name: FASE 3 CRM architecture
description: Architectural decisions from the Seguimiento Comercial feature (typed historial, 4-tab panel, bell urgency).
---

## Detail panel state
`openOppId: string | null` lives in `Seguimiento.tsx`. Derived via `opportunities.find(o => o.id === openOppId)`. Because `opportunities` is a controlled prop from Cotizador, any `onUpdateOpportunity` call automatically re-derives the open panel's data — no manual sync needed.

**Why:** Avoids lifting state to Cotizador just for the panel; the bell uses `onGoToSeguimiento()` instead of directly opening the panel.

## Bell defensive defaults
`NotificationBell` uses `items = []` and `opportunities = []` default parameters.

**Why:** HMR in Vite can hot-reload a child before the parent re-renders with the new props, causing a transient "not iterable" crash. Defaults prevent this.

## Urgency exported from Guardadas
`getOppUrgency(o: Opportunity): UrgencyLevel` and `UrgencyLevel` are exported from `Guardadas.tsx`, not duplicated in each consumer.

**Why:** Urgency logic needs to be identical in Seguimiento, NotificationBell, and any future consumers. Single source of truth.

## Typed historial pattern
Quick actions (Marcar atendida, Posponer, Confirmar venta, etc.) build `OppHistorialEntry` locally and pass it as part of the `patch` to `onUpdateOpportunity`. No separate "register" function call needed.

**Why:** Keeps the update atomic — status + historial change together in one localStorage write.

## Bell alert priority tiers (descending)
1. `recordatorio_hoy` (2000) — recordatorio date = today
2. `recordatorio_vencido` (1700) — recordatorio date is past
3. `vence_manana` (1500+) — quote vigencia tomorrow
4. `opp_roja` (1000+days*10) — opportunity urgency = red
5. `vence_pronto` (800+) — quote vigencia in 2–5 days
Green opportunities are never shown.

## proximaAccion field
Added to `Opportunity` interface as `proximaAccion?: string` (free text). Separate from `recordatorio` (date). Both managed from the Seguimiento tab of OportunidadDetailPanel.
