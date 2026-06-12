import type { Hotel, ServicioSeleccionado, Tour, Traslado } from "@/lib/types";
import { apiAuth } from "@/lib/api-auth";
import { queryClient } from "@/lib/queryClient";

export type PlantillaBlockTipo =
  | "titulo"
  | "nota"
  | "texto"
  | "hotel"
  | "tour"
  | "traslado"
  | "vuelo"
  | "catamaran"
  | "observaciones"
  | "observacionesGenerales"
  | "manual";

export interface PlantillaBlock {
  id: string;
  tipo: PlantillaBlockTipo;
  /** titulo · nota · texto · observaciones · observacionesGenerales */
  texto?: string;
  hotelId?: string;
  hotelNombre?: string;
  hotelNotas?: string;
  tourId?: string;
  tourNombre?: string;
  trasladoId?: string;
  trasladoNombre?: string;
  /** Vuelo fields */
  vueloOrigen?: string;
  vueloDestino?: string;
  vueloIdaVuelta?: boolean;
  vueloPrecio?: number;
  vueloPrecioChd?: number;
  vueloNotas?: string;
  /** Catamaran fields (backed by tours catalog) */
  catamaranId?: string;
  catamaranNombre?: string;
  /** Manual custom-item fields (full ServicioSeleccionado snapshot) */
  manualTipo?: "hotel" | "tour" | "traslado" | "vuelo" | "catamaran";
  manualNombre?: string;
  manualCodigo?: string;
  manualPrecios?: {
    p1?: number; p2_5?: number; p6_10?: number; chd?: number;
    SGL?: number; DBL?: number; TPL?: number; CHD?: number;
  };
  manualUnitOverride?: number;
  manualNotas?: string;
  manualUbicacion?: string;
  manualEstrellas?: string;
  manualTipoHabitacion?: string;
  manualDesayuno?: string;
  manualOrigen?: string;
  manualDestino?: string;
  manualTipoServicio?: "Regular" | "Privado";
}

export interface Plantilla {
  id: string;
  nombre: string;
  descripcion?: string;
  bloques: PlantillaBlock[];
  createdAt: string;
  updatedAt: string;
}

/** Result returned by buildServiciosFromPlantilla. */
export interface PlantillaLoadResult {
  servicios: ServicioSeleccionado[];
  observaciones: string[];
  /** Services that were NOT found in the catalog and loaded as manual placeholders. */
  noEncontrados: { tipo: string; nombre: string }[];
}

const LS_RECIENTES_KEY = "rge_plantillas_recientes_v1";
const LS_FAVORITAS_KEY = "rge_plantillas_favoritas_v1";
const MAX_RECIENTES = 5;

export function loadRecientes(): string[] {
  try {
    const raw = localStorage.getItem(LS_RECIENTES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function pushReciente(id: string): void {
  const prev = loadRecientes().filter((x) => x !== id);
  const next = [id, ...prev].slice(0, MAX_RECIENTES);
  localStorage.setItem(LS_RECIENTES_KEY, JSON.stringify(next));
}

export function loadFavoritas(): string[] {
  try {
    const raw = localStorage.getItem(LS_FAVORITAS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function toggleFavorita(id: string): string[] {
  const prev = loadFavoritas();
  const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
  localStorage.setItem(LS_FAVORITAS_KEY, JSON.stringify(next));
  return next;
}

export function loadPlantillas(): Plantilla[] {
  return queryClient.getQueryData<Plantilla[]>(["plantillas"]) ?? [];
}

export async function loadPlantillasAsync(): Promise<Plantilla[]> {
  const cached = queryClient.getQueryData<Plantilla[]>(["plantillas"]);
  if (cached) return cached;
  try {
    const data = await apiAuth.plantillas.list() as Plantilla[];
    queryClient.setQueryData(["plantillas"], data);
    return data;
  } catch (err) {
    console.error("[plantillas] Error cargando:", err);
    return [];
  }
}

export function savePlantillas(items: Plantilla[]): void {
  queryClient.setQueryData(["plantillas"], items);
  apiAuth.plantillas.bulkSync(items).catch(console.error);
}

let _counter = 0;
function uid(): string {
  return `${Date.now()}_${++_counter}`;
}

export function newBlock(tipo: PlantillaBlockTipo): PlantillaBlock {
  return { id: `blk_${uid()}`, tipo };
}

export function newPlantilla(nombre: string): Plantilla {
  const now = new Date().toISOString();
  return {
    id: `plt_${uid()}`,
    nombre,
    bloques: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicarPlantilla(p: Plantilla): Plantilla {
  const now = new Date().toISOString();
  return {
    ...p,
    id: `plt_${uid()}`,
    nombre: `${p.nombre} (copia)`,
    bloques: p.bloques.map((b) => ({ ...b, id: `blk_${uid()}` })),
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Matching helpers ────────────────────────────────────────────────────────

/** Normalize a string for fuzzy matching: trim, lowercase, remove accents, collapse spaces. */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Find a hotel by id (primary), then exact normalized name, then partial name. */
function findHotel(hoteles: Hotel[], id?: string, nombre?: string): Hotel | null {
  if (id) {
    const h = hoteles.find((x) => x.id === id);
    if (h) return h;
  }
  if (nombre) {
    const n = normalize(nombre);
    return (
      hoteles.find((x) => normalize(x.nombre) === n) ??
      hoteles.find((x) => {
        const xn = normalize(x.nombre);
        return xn.includes(n) || n.includes(xn);
      }) ??
      null
    );
  }
  return null;
}

/** Find a tour by id, then exact/partial name. */
function findTour(tours: Tour[], id?: string, nombre?: string): Tour | null {
  if (id) {
    const t = tours.find((x) => x.id === id);
    if (t) return t;
  }
  if (nombre) {
    const n = normalize(nombre);
    return (
      tours.find((x) => normalize(x.nombre) === n) ??
      tours.find((x) => {
        const xn = normalize(x.nombre);
        return xn.includes(n) || n.includes(xn);
      }) ??
      null
    );
  }
  return null;
}

/** Find a traslado by id, then exact/partial name. */
function findTraslado(traslados: Traslado[], id?: string, nombre?: string): Traslado | null {
  if (id) {
    const t = traslados.find((x) => x.id === id);
    if (t) return t;
  }
  if (nombre) {
    const n = normalize(nombre);
    return (
      traslados.find((x) => normalize(x.nombre) === n) ??
      traslados.find((x) => {
        const xn = normalize(x.nombre);
        return xn.includes(n) || n.includes(xn);
      }) ??
      null
    );
  }
  return null;
}

// ─── Main loader ─────────────────────────────────────────────────────────────

export function buildServiciosFromPlantilla(
  plantilla: Plantilla,
  hoteles: Hotel[],
  tours: Tour[],
  traslados: Traslado[],
): PlantillaLoadResult {
  const servicios: ServicioSeleccionado[] = [];
  const observaciones: string[] = [];
  const noEncontrados: { tipo: string; nombre: string }[] = [];

  for (const blk of plantilla.bloques) {
    // ── Hotel ──────────────────────────────────────────────────────
    if (blk.tipo === "hotel") {
      const h = findHotel(hoteles, blk.hotelId, blk.hotelNombre);
      if (h) {
        servicios.push({
          id: `hotel-${h.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          codigo: h.id,
          tipo: "hotel",
          nombre: h.nombre,
          precios: {
            SGL: h.precios.SGL,
            DBL: h.precios.DBL,
            TPL: h.precios.TPL,
            CHD: h.precios.CHD,
          },
          ubicacion: h.ubicacion,
          estrellas: h.estrellas,
          vigencia: h.vigencia,
          tipoHabitacion: h.tipoHabitacion,
          desayuno: h.desayuno || undefined,
          notas: blk.hotelNotas || undefined,
        });
      } else if (blk.hotelNombre) {
        servicios.push({
          id: `hotel-manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          tipo: "hotel",
          nombre: blk.hotelNombre,
          precios: { SGL: 0, DBL: 0, TPL: 0, CHD: 0 },
          manual: true,
          notas: blk.hotelNotas || undefined,
        });
        noEncontrados.push({ tipo: "Hotel", nombre: blk.hotelNombre });
      }

    // ── Tour ──────────────────────────────────────────────────────
    } else if (blk.tipo === "tour") {
      const t = findTour(tours, blk.tourId, blk.tourNombre);
      if (t) {
        servicios.push({
          id: `tour-${t.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          codigo: t.id,
          tipo: "tour",
          nombre: t.nombre,
          precios: {
            p1: t.precios.p1,
            p2_5: t.precios.p2_5,
            p6_10: t.precios.p6_10,
            chd: t.precios.chd,
          },
          usarFecha: false,
          horario: t.horario || undefined,
        });
      } else if (blk.tourNombre) {
        servicios.push({
          id: `tour-manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          tipo: "tour",
          nombre: blk.tourNombre,
          precios: { p1: 0, p2_5: 0, p6_10: 0, chd: 0 },
          manual: true,
          usarFecha: false,
        });
        noEncontrados.push({ tipo: "Tour", nombre: blk.tourNombre });
      }

    // ── Traslado ──────────────────────────────────────────────────
    } else if (blk.tipo === "traslado") {
      const tr = findTraslado(traslados, blk.trasladoId, blk.trasladoNombre);
      if (tr) {
        servicios.push({
          id: `traslado-${tr.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          codigo: tr.id,
          tipo: "traslado",
          nombre: tr.nombre,
          precios: {
            p1: tr.precios.p1,
            p2_5: tr.precios.p2_5,
            p6_10: tr.precios.p6_10,
            chd: tr.precios.chd,
          },
          usarFecha: false,
          tipoServicio: tr.tipo,
        });
      } else if (blk.trasladoNombre) {
        servicios.push({
          id: `traslado-manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          tipo: "traslado",
          nombre: blk.trasladoNombre,
          precios: { p1: 0, p2_5: 0, p6_10: 0, chd: 0 },
          manual: true,
          usarFecha: false,
        });
        noEncontrados.push({ tipo: "Traslado", nombre: blk.trasladoNombre });
      }

    // ── Vuelo — always create, even if fields are empty ───────────
    } else if (blk.tipo === "vuelo") {
      const origen = blk.vueloOrigen?.trim() || "";
      const destino = blk.vueloDestino?.trim() || "";
      const nombre =
        origen && destino
          ? blk.vueloIdaVuelta
            ? `${origen} → ${destino} → ${origen}`
            : `${origen} → ${destino}`
          : origen || destino || "Vuelo por confirmar";
      const precio = blk.vueloPrecio ?? 0;
      const precioChd = blk.vueloPrecioChd ?? precio;
      servicios.push({
        id: `vuelo-plt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        tipo: "vuelo",
        nombre,
        origen: origen || undefined,
        destino: destino || undefined,
        precios: {
          p1: precio,
          p2_5: precio,
          p6_10: precio,
          chd: precioChd,
        },
        unitOverride: precio > 0 ? precio : undefined,
        manual: true,
        notas: blk.vueloNotas || undefined,
      });

    // ── Catamarán — catalog match first, manual fallback ──────────
    } else if (blk.tipo === "catamaran") {
      const t = findTour(tours, blk.catamaranId, blk.catamaranNombre);
      if (t) {
        servicios.push({
          id: `catamaran-${t.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          codigo: t.id,
          tipo: "catamaran",
          nombre: t.nombre,
          precios: {
            p1: t.precios.p1,
            p2_5: t.precios.p2_5,
            p6_10: t.precios.p6_10,
            chd: t.precios.chd,
          },
          usarFecha: false,
        });
      } else {
        const nombre = blk.catamaranNombre || "Catamarán por confirmar";
        servicios.push({
          id: `catamaran-manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          tipo: "catamaran",
          nombre,
          precios: { p1: 0, p2_5: 0, p6_10: 0, chd: 0 },
          manual: true,
          usarFecha: false,
        });
        if (blk.catamaranNombre) {
          noEncontrados.push({ tipo: "Catamarán", nombre: blk.catamaranNombre });
        }
      }

    // ── Observaciones (both naming conventions) ───────────────────
    } else if (blk.tipo === "observaciones" || blk.tipo === "observacionesGenerales") {
      if (blk.texto) {
        for (const line of blk.texto.split("\n")) {
          const trimmed = line.trim();
          if (trimmed) observaciones.push(trimmed);
        }
      }

    // ── Manual custom item — restore full snapshot ────────────────
    } else if (blk.tipo === "manual") {
      if (blk.manualTipo && blk.manualNombre) {
        const baseId = `MAN-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        servicios.push({
          id: baseId,
          codigo: blk.manualCodigo ?? baseId,
          tipo: blk.manualTipo,
          nombre: blk.manualNombre,
          precios: blk.manualPrecios ?? { p1: 0, p2_5: 0, p6_10: 0, chd: 0 },
          manual: true,
          notas: blk.manualNotas,
          ubicacion: blk.manualUbicacion,
          estrellas: blk.manualEstrellas,
          tipoHabitacion: blk.manualTipoHabitacion,
          desayuno: blk.manualDesayuno,
          origen: blk.manualOrigen,
          destino: blk.manualDestino,
          tipoServicio: blk.manualTipoServicio,
          unitOverride: blk.manualUnitOverride,
          usarFecha: false,
        });
      }

    // ── titulo / nota / texto — informational only (no services) ──
    } else if (
      blk.tipo === "titulo" ||
      blk.tipo === "nota" ||
      blk.tipo === "texto"
    ) {
      // These blocks don't generate services or observations.
      // They are skipped silently during loading.
    }
  }

  return { servicios, observaciones, noEncontrados };
}

/** Extracts observaciones text from a template (supports both type names). */
export function extractObservacionesFromPlantilla(plantilla: Plantilla): string[] {
  const lines: string[] = [];
  for (const blk of plantilla.bloques) {
    if (blk.tipo === "observaciones" || blk.tipo === "observacionesGenerales") {
      if (blk.texto) {
        for (const line of blk.texto.split("\n")) {
          const trimmed = line.trim();
          if (trimmed) lines.push(trimmed);
        }
      }
    }
  }
  return lines;
}

export function serviciosToBlocks(
  servicios: ServicioSeleccionado[],
): PlantillaBlock[] {
  return servicios.map((s) => {
    const id = `blk_${uid()}`;

    // ── Manual custom items: snapshot the full service structure ──────────────
    if (s.manual) {
      return {
        id,
        tipo: "manual" as const,
        manualTipo: s.tipo,
        manualNombre: s.nombre,
        manualCodigo: s.codigo,
        manualPrecios: { ...s.precios },
        manualUnitOverride: s.unitOverride,
        manualNotas: s.notas,
        manualUbicacion: s.ubicacion,
        manualEstrellas: s.estrellas,
        manualTipoHabitacion: s.tipoHabitacion,
        manualDesayuno: s.desayuno,
        manualOrigen: s.origen,
        manualDestino: s.destino,
        manualTipoServicio: s.tipoServicio,
      };
    }

    // ── Catalog-backed services ───────────────────────────────────────────────
    if (s.tipo === "hotel") {
      return {
        id,
        tipo: "hotel" as const,
        hotelId: s.codigo ?? s.id,
        hotelNombre: s.nombre,
        hotelNotas: s.notas,
      };
    }
    if (s.tipo === "tour") {
      return {
        id,
        tipo: "tour" as const,
        tourId: s.codigo ?? s.id,
        tourNombre: s.nombre,
      };
    }
    if (s.tipo === "traslado") {
      return {
        id,
        tipo: "traslado" as const,
        trasladoId: s.codigo ?? s.id,
        trasladoNombre: s.nombre,
      };
    }
    if (s.tipo === "vuelo") {
      return {
        id,
        tipo: "vuelo" as const,
        vueloOrigen: s.origen,
        vueloDestino: s.destino,
        vueloPrecio: s.unitOverride ?? s.precios.p1,
        vueloPrecioChd: s.precios.chd,
        vueloNotas: s.notas,
      };
    }
    if (s.tipo === "catamaran") {
      return {
        id,
        tipo: "catamaran" as const,
        catamaranId: s.codigo ?? s.id,
        catamaranNombre: s.nombre,
      };
    }
    return {
      id,
      tipo: "texto" as const,
      texto: s.nombre,
    };
  });
}
