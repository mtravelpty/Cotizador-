/**
 * Normalizes a raw meal-plan value from the tarifario (e.g. "Buffet", "All Inclusive")
 * into a clean display string for proposals, PDFs, WhatsApp, and the UI.
 *
 * Returns "" when the value indicates no meal plan (so callers can skip rendering).
 */
export function formatRegimen(raw: string | null | undefined): string {
  if (!raw) return "";

  const s = raw.trim();
  if (!s) return "";

  const lo = s.toLowerCase();

  // ── Negative / suppress ──────────────────────────────────────────
  if (
    lo === "no" ||
    lo === "n/a" ||
    lo === "ninguno" ||
    lo === "ninguna" ||
    lo === "sin régimen" ||
    lo === "sin regimen" ||
    lo === "sin desayuno" ||
    lo === "no incluido" ||
    lo === "no incluye" ||
    lo === "solo alojamiento" ||
    lo === "room only"
  ) {
    return "";
  }

  // Generic "Incluido" / "incluido" → Desayuno incluido
  if (lo === "incluido" || lo === "con desayuno" || lo === "breakfast included") {
    return "Desayuno incluido";
  }

  // ── All-inclusive ────────────────────────────────────────────────
  if (lo.includes("all inclusive") || lo.includes("all-inclusive") || lo === "todo incluido") {
    return "Todo incluido";
  }

  // ── Alimentación completa ────────────────────────────────────────
  if (lo.includes("alimentaci") && lo.includes("completa")) {
    return "Alimentación completa incluida";
  }

  // ── Any breakfast variant → unified label ────────────────────────
  if (
    lo.includes("desayuno") ||
    lo.includes("buffet") ||
    lo.includes("continental") ||
    lo.includes("americano") ||
    lo.includes("latinoamericano") ||
    lo.includes("ejecutivo") ||
    lo.includes("breakfast") ||
    lo.startsWith("incluye ") ||
    lo === "incluido" ||
    lo === "con desayuno"
  ) {
    return "Desayuno incluido";
  }

  // ── Fallback: return as-is (custom free-text) ────────────────────
  return s;
}
