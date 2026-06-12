import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert a traslado name from the catalog into a clean, arrow-based route.
 *
 * - Strips the leading "Traslado(s)" prefix.
 * - Replaces " – ", " — " and " - " separators with " → ".
 * - Removes "/ One Way" suffixes.
 * - Leaves parenthetical clarifications and trailing notes untouched.
 */
export function formatTrasladoNombre(nombre: string | undefined | null): string {
  if (!nombre) return ""
  let s = String(nombre).trim()
  s = s.replace(/^traslados?\s+/i, "")
  s = s.replace(/\s*\/\s*one\s*way\b\.?/gi, "")
  s = s.replace(/\s*[–—-]\s*/g, " → ")
  s = s.replace(/\s+/g, " ").trim()
  return s
}

// ─── Traslado personalisation ───────────────────────────────────────────────

/** Normalise a string for zone-key matching (strip accents, lowercase). */
const normZone = (s: string): string =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

/**
 * Zone keys for matching hotel ubicacion values from the tarifario.
 * The actual Excel section headers are things like "CIUDAD DE PANAMÁ",
 * "COCLÉ (RIVIERA PACÍFICA)", "BOCAS DEL TORO", "PLAYA BONITA", etc.
 * After normZone they become lowercase with no accents.
 */
const CIUDAD_KEYS = [
  "ciudad de panama", "panama city", "ciudad panama", "casco antiguo",
]
const PLAYA_KEYS = [
  "riviera pacifica", "playa blanca", "farallon", "coronado",
  "buenaventura", "bijao", "santa clara", "decameron", "playa bonita",
]
const BOCAS_KEYS  = ["bocas del toro", "bocas town", "isla colon"]
const TIERRAS_KEYS = ["boquete", "volcan", "cerro punta", "tierras altas", "chiriqui"]

function zoneMatch(ubicacion: string | undefined | null, keys: string[]): boolean {
  if (!ubicacion) return false
  const u = normZone(ubicacion)
  return keys.some((k) => u.includes(k))
}

function firstHotelInZone(
  hoteles: ReadonlyArray<{ nombre?: string | null; ubicacion?: string | null }>,
  keys: string[],
): string | null {
  return hoteles.find((h) => zoneMatch(h.ubicacion, keys))?.nombre ?? null
}

/**
 * Replace generic hotel placeholders in a (already-formatted) traslado name
 * with the actual hotel names present in the current quote.
 *
 * Matches the real patterns found in the tarifario, which use plural forms
 * ("Hoteles") and optional "en" prepositions:
 *
 *   Ciudad  → "Hotel ciudad", "Hoteles Ciudad", "Hoteles en ciudad"
 *             NOT "Hoteles Ciudad de Colón" (different route)
 *
 *   Playa   → "Hotel Playa", "Hoteles Playa", "Hoteles en Playa Bonita"
 *             Bocas del Toro counts as a playa destination for this rule.
 *
 *   Bocas   → "Hotel Bocas", "Hoteles en Bocas", "Hoteles en Bocas del Toro (Isla Colón)"
 *
 * Only substitutes when a hotel can be identified for the zone.
 * Returns the original text unchanged when no match is possible.
 *
 * @param displayName  The formatted traslado name (after formatTrasladoNombre).
 * @param hoteles      Hotel services in the current quote (tipo === "hotel").
 * @param enabled      When false the function is a no-op.
 */
export function personalizarNombreTraslado(
  displayName: string,
  hoteles: ReadonlyArray<{ nombre?: string | null; ubicacion?: string | null }>,
  enabled: boolean,
): string {
  if (!enabled || !displayName || hoteles.length === 0) return displayName

  let s = displayName

  // ── Ciudad de Panamá ──────────────────────────────────────────────────────
  // Matches: "Hotel ciudad", "Hoteles Ciudad", "Hoteles en ciudad"
  // Negative lookahead avoids: "Hoteles Ciudad de Colón", "Hoteles Ciudad de Los Santos"
  if (/hoteles?\s+(?:en\s+)?ciudad(?!\s+de\s+)/i.test(s)) {
    const h = firstHotelInZone(hoteles, CIUDAD_KEYS)
    if (h) s = s.replace(/hoteles?\s+(?:en\s+)?ciudad(?!\s+de\s+)/gi, h)
  }

  // ── Playa (Riviera Pacífica, Playa Blanca, Coronado, Playa Bonita…) ───────
  // Matches: "Hotel Playa", "Hoteles Playa", "Hoteles en Playa Bonita"
  // Per spec: Bocas del Toro also counts as a playa destination here.
  if (/hoteles?\s+(?:en\s+)?playa(?:\s+\w+)*/i.test(s)) {
    const h = firstHotelInZone(hoteles, [...PLAYA_KEYS, ...BOCAS_KEYS])
    if (h) s = s.replace(/hoteles?\s+(?:en\s+)?playa(?:\s+\w+)*/gi, h)
  }

  // ── Bocas del Toro ────────────────────────────────────────────────────────
  // Matches: "Hotel Bocas", "Hoteles en Bocas", "Hoteles en Bocas del Toro (Isla Colón)"
  if (/hoteles?\s+(?:en\s+)?bocas(?:\s+del\s+toro)?(?:\s*\([^)]*\))?/i.test(s)) {
    const h = firstHotelInZone(hoteles, BOCAS_KEYS)
    if (h) s = s.replace(/hoteles?\s+(?:en\s+)?bocas(?:\s+del\s+toro)?(?:\s*\([^)]*\))?/gi, h)
  }

  // ── Tierras Altas / Chiriquí ──────────────────────────────────────────────
  if (/hotel\s+tierras\s+altas/i.test(s)) {
    const h = firstHotelInZone(hoteles, TIERRAS_KEYS)
    if (h) s = s.replace(/hotel\s+tierras\s+altas/gi, h)
  }

  return s
}
