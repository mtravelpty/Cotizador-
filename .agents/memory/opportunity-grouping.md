---
name: Opportunity grouping
description: How the Seguimiento opportunity layer relates to CotizacionGuardada quotes.
---

Opportunities live in `cotizador.oportunidades` (localStorage), quotes in `cotizador.guardadas`.

**Why:** Phase 2 spec required grouping multiple quote versions under one opportunity.

**How to apply:**
- Group key: `normalize(agencyName) | normalize(agentName) | normalize(quoteName)`
- Only Save, CopyEmail, PDF create/update opportunities. WhatsApp does NOT.
- `lastUpdateAt` on Opportunity drives the semaphore (0-3 green, 4-6 yellow, 7+ red).
- `priorityManual` is a boolean toggle (not alta/media/baja) and sorts to the top.
- Status is simple: nueva, enviada, seguimiento, confirmada, perdida, anulada.
- `CotizacionGuardada.opportunityId` is reserved but not strictly required for lookups (key-based matching is used instead).
