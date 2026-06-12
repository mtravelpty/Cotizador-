import type { ServicioSeleccionado } from "./types";
import { apiAuth } from "@/lib/api-auth";
import { queryClient } from "@/lib/queryClient";

export type ObservacionCategoria =
  | "general"
  | "hotel"
  | "tour"
  | "traslado"
  | "vuelo";

export interface ObservacionRapida {
  id: string;
  texto: string;
  categoria: ObservacionCategoria;
  orden: number;
  activo: boolean;
}

export const DEFAULT_OBSERVACIONES: ObservacionRapida[] = [
  { id: "precios_netos_pp", texto: "Precios netos por persona / por noche en hotelería", categoria: "hotel", orden: 1, activo: true },
  { id: "sujeto_disponibilidad", texto: "Precios sujetos a disponibilidad al momento de solicitar la reserva", categoria: "general", orden: 2, activo: true },
  { id: "suplemento_sgl", texto: "Pasajeros viajando solos aplican suplemento de $25 USD por noche", categoria: "general", orden: 3, activo: true },
  { id: "suplemento_vuelo_nocturno", texto: "Pasajeros en vuelos nocturnos aplican suplemento adicional por vía", categoria: "vuelo", orden: 4, activo: true },
  { id: "impuestos_hoteleros", texto: "No incluye impuestos hoteleros locales (City Tax / Resort Fee)", categoria: "hotel", orden: 5, activo: true },
  { id: "checkin_checkout", texto: "Check-in: 15:00 hrs · Check-out: 12:00 hrs", categoria: "hotel", orden: 6, activo: true },
  { id: "traslado_compartido", texto: "Traslados en modalidad compartida", categoria: "traslado", orden: 7, activo: true },
  { id: "minimo_pasajeros", texto: "Tours operan con mínimo de pasajeros confirmados", categoria: "tour", orden: 8, activo: true },
  { id: "sujeto_clima", texto: "Actividades sujetas a condiciones climáticas", categoria: "tour", orden: 9, activo: true },
  { id: "vuelos_no_incluidos", texto: "Vuelos internacionales no incluidos en la cotización", categoria: "general", orden: 10, activo: true },
];

// ─── Sync load (from cache or defaults) ──────────────────────────────────────

export function loadObservaciones(): ObservacionRapida[] {
  const cached = queryClient.getQueryData<ObservacionRapida[]>(["observaciones"]);
  if (cached && cached.length > 0) return cached;
  return DEFAULT_OBSERVACIONES;
}

// ─── Async load (from API) ────────────────────────────────────────────────────

export async function loadObservacionesAsync(): Promise<ObservacionRapida[]> {
  const cached = queryClient.getQueryData<ObservacionRapida[]>(["observaciones"]);
  if (cached && cached.length > 0) return cached;
  try {
    const data = await apiAuth.observaciones.list() as ObservacionRapida[];
    if (data.length > 0) {
      const storedIds = new Set(data.map((o) => o.id));
      const merged = [...data, ...DEFAULT_OBSERVACIONES.filter((d) => !storedIds.has(d.id))].sort((a, b) => a.orden - b.orden);
      queryClient.setQueryData(["observaciones"], merged);
      return merged;
    }
    // Seed defaults on first load
    await saveObservaciones(DEFAULT_OBSERVACIONES);
    return DEFAULT_OBSERVACIONES;
  } catch (err) {
    console.error("[observaciones] Error cargando:", err);
    return DEFAULT_OBSERVACIONES;
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────

export async function saveObservaciones(items: ObservacionRapida[]): Promise<void> {
  queryClient.setQueryData(["observaciones"], items);
  try {
    await apiAuth.observaciones.bulkSync(items);
  } catch (err) {
    console.error("[observaciones] Error guardando:", err);
  }
}

export async function saveObservacion(o: ObservacionRapida): Promise<void> {
  const list = loadObservaciones();
  const next = list.some((x) => x.id === o.id)
    ? list.map((x) => (x.id === o.id ? o : x))
    : [...list, o];
  queryClient.setQueryData(["observaciones"], next);
  try { await apiAuth.observaciones.save(o); } catch (err) { console.error(err); }
}

export async function deleteObservacion(id: string): Promise<void> {
  queryClient.setQueryData(["observaciones"], loadObservaciones().filter((x) => x.id !== id));
  try { await apiAuth.observaciones.remove(id); } catch (err) { console.error(err); }
}

// ─── Logic helpers (unchanged from original) ─────────────────────────────────

export function getSugeridos(servicios: ServicioSeleccionado[]): Set<string> {
  const suggested = new Set<string>();
  const tipos = new Set(servicios.map((s) => s.tipo));
  suggested.add("sujeto_disponibilidad");
  if (tipos.has("hotel")) {
    suggested.add("precios_netos_pp");
    suggested.add("impuestos_hoteleros");
    suggested.add("checkin_checkout");
  }
  if (tipos.has("traslado")) {
    const hasRegular = servicios.some((s) => s.tipo === "traslado" && (s.tipoServicio === "Regular" || !s.tipoServicio));
    if (hasRegular) suggested.add("traslado_compartido");
  }
  if (tipos.has("tour")) {
    suggested.add("minimo_pasajeros");
    suggested.add("sujeto_clima");
  }
  if (tipos.has("vuelo")) suggested.add("suplemento_vuelo_nocturno");
  if (!tipos.has("vuelo") && (tipos.has("hotel") || tipos.has("tour") || tipos.has("traslado"))) {
    suggested.add("vuelos_no_incluidos");
  }
  return suggested;
}

export function resolveObservaciones(
  catalog: ObservacionRapida[],
  seleccionadas: string[],
  manual: string,
): string[] {
  const idSet = new Set(seleccionadas);
  const textos = catalog
    .filter((o) => o.activo && idSet.has(o.id))
    .sort((a, b) => a.orden - b.orden)
    .map((o) => o.texto);
  const seen = new Set(textos.map((t) => t.trim().toLowerCase()));
  for (const line of manual.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      textos.push(trimmed);
      seen.add(trimmed.toLowerCase());
    }
  }
  return textos;
}
