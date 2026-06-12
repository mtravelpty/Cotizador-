import type { Hotel, Tour, Traslado } from "@/lib/types";
import { apiAuth } from "@/lib/api-auth";
import { queryClient } from "@/lib/queryClient";

/* ─── Extended local types ─── */

export interface HotelLocal extends Hotel {
  codigo?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TourLocal extends Tour {
  /** RGE code (e.g. "RGE-020") — becomes the `codigo` on ServicioSeleccionado for descriptivos linking.
   *  For API-imported tours, id already IS the RGE code. For new local tours, the user sets it. */
  tipoServicio?: "Regular" | "Privado";
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrasladoLocal extends Traslado {
  codigo?: string;
  rutaOrigen?: string;
  rutaDestino?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ─── ID generator ─── */

let _cnt = 0;
function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${++_cnt}`;
}

/* ─── Load / Save (API-backed, cache-first) ─── */

export function loadHotelesLS(): HotelLocal[] {
  return queryClient.getQueryData<HotelLocal[]>(["tarifas-hoteles"]) ?? [];
}

export async function loadHotelesLSAsync(): Promise<HotelLocal[]> {
  const cached = queryClient.getQueryData<HotelLocal[]>(["tarifas-hoteles"]);
  if (cached) return cached;
  try {
    const data = await apiAuth.tarifas.listHoteles() as HotelLocal[];
    queryClient.setQueryData(["tarifas-hoteles"], data);
    return data;
  } catch (err) { console.error("[tarifas/hoteles] load:", err); return []; }
}

export function saveHotelesLS(items: HotelLocal[]) {
  queryClient.setQueryData(["tarifas-hoteles"], items);
  apiAuth.tarifas.bulkSyncHoteles(items).catch(console.error);
}

export function loadToursLS(): TourLocal[] {
  return queryClient.getQueryData<TourLocal[]>(["tarifas-tours"]) ?? [];
}

export async function loadToursLSAsync(): Promise<TourLocal[]> {
  const cached = queryClient.getQueryData<TourLocal[]>(["tarifas-tours"]);
  if (cached) return cached;
  try {
    const data = await apiAuth.tarifas.listTours() as TourLocal[];
    queryClient.setQueryData(["tarifas-tours"], data);
    return data;
  } catch (err) { console.error("[tarifas/tours] load:", err); return []; }
}

export function saveToursLS(items: TourLocal[]) {
  queryClient.setQueryData(["tarifas-tours"], items);
  apiAuth.tarifas.bulkSyncTours(items).catch(console.error);
}

export function loadTrasladosLS(): TrasladoLocal[] {
  return queryClient.getQueryData<TrasladoLocal[]>(["tarifas-traslados"]) ?? [];
}

export async function loadTrasladosLSAsync(): Promise<TrasladoLocal[]> {
  const cached = queryClient.getQueryData<TrasladoLocal[]>(["tarifas-traslados"]);
  if (cached) return cached;
  try {
    const data = await apiAuth.tarifas.listTraslados() as TrasladoLocal[];
    queryClient.setQueryData(["tarifas-traslados"], data);
    return data;
  } catch (err) { console.error("[tarifas/traslados] load:", err); return []; }
}

export function saveTrasladosLS(items: TrasladoLocal[]) {
  queryClient.setQueryData(["tarifas-traslados"], items);
  apiAuth.tarifas.bulkSyncTraslados(items).catch(console.error);
}

/* ─── Factory functions ─── */

export function newHotelLocal(partial?: Partial<HotelLocal>): HotelLocal {
  const now = new Date().toISOString();
  return {
    id: uid("hotel"),
    nombre: "",
    codigo: "",
    categoria: "★★★★",
    estrellas: "★★★★",
    tipoHabitacion: "Estándar",
    ubicacion: "CIUDAD DE PANAMÁ",
    desayuno: "No incluido",
    vigencia: "",
    precios: { SGL: 0, DBL: 0, TPL: 0, CHD: 0 },
    activo: true,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function newTourLocal(partial?: Partial<TourLocal>): TourLocal {
  const now = new Date().toISOString();
  return {
    id: uid("tour"),
    nombre: "",
    categoria: "",
    seccion: "",
    horario: "",
    precio_por_persona: 0,
    precios: { p1: 0, p2_5: 0, p6_10: 0, chd: 0 },
    descripcion: "",
    tipoServicio: "Regular",
    activo: true,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function newTrasladoLocal(partial?: Partial<TrasladoLocal>): TrasladoLocal {
  const now = new Date().toISOString();
  return {
    id: uid("traslado"),
    nombre: "",
    codigo: "",
    categoria: "",
    tipo: "Regular",
    precio_por_persona: 0,
    precios: { p1: 0, p2_5: 0, p6_10: 0, chd: 0 },
    rutaOrigen: "",
    rutaDestino: "",
    activo: true,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/* ─── Duplicate helpers ─── */

export function duplicarHotel(h: HotelLocal): HotelLocal {
  const now = new Date().toISOString();
  return { ...h, id: uid("hotel"), nombre: `${h.nombre} (copia)`, createdAt: now, updatedAt: now };
}

export function duplicarTour(t: TourLocal): TourLocal {
  const now = new Date().toISOString();
  return { ...t, id: uid("tour"), nombre: `${t.nombre} (copia)`, createdAt: now, updatedAt: now };
}

export function duplicarTraslado(t: TrasladoLocal): TrasladoLocal {
  const now = new Date().toISOString();
  return { ...t, id: uid("traslado"), nombre: `${t.nombre} (copia)`, createdAt: now, updatedAt: now };
}

/* ─── Import from API item ─── */

export function hotelFromApi(h: Hotel): HotelLocal {
  const now = new Date().toISOString();
  const codigo = /^(hotel|tour|traslado)_\d+_\d+$/.test(h.id) ? undefined : h.id;
  return { ...h, codigo, activo: true, createdAt: now, updatedAt: now };
}

export function tourFromApi(t: Tour): TourLocal {
  const now = new Date().toISOString();
  return { ...t, tipoServicio: "Regular", activo: true, createdAt: now, updatedAt: now };
}

export function trasladoFromApi(t: Traslado): TrasladoLocal {
  const now = new Date().toISOString();
  const codigo = /^(hotel|tour|traslado)_\d+_\d+$/.test(t.id) ? undefined : t.id;
  return { ...t, codigo, rutaOrigen: "", rutaDestino: "", activo: true, createdAt: now, updatedAt: now };
}

/* ─── Merge: LS takes priority over API (by id). Inactive excluded. ─── */

export function mergeHoteles(ls: HotelLocal[], api: Hotel[]): Hotel[] {
  const active = ls.filter((h) => h.activo);
  const lsIds = new Set(active.map((h) => h.id));
  const apiOnly = api.filter((h) => !lsIds.has(h.id));
  return [...(active as Hotel[]), ...apiOnly];
}

export function mergeTours(ls: TourLocal[], api: Tour[]): Tour[] {
  const active = ls.filter((t) => t.activo);
  const lsIds = new Set(active.map((t) => t.id));
  const apiOnly = api.filter((t) => !lsIds.has(t.id));
  return [...(active as Tour[]), ...apiOnly];
}

export function mergeTraslados(ls: TrasladoLocal[], api: Traslado[]): Traslado[] {
  const active = ls.filter((t) => t.activo);
  const lsIds = new Set(active.map((t) => t.id));
  const apiOnly = api.filter((t) => !lsIds.has(t.id));
  return [...(active as Traslado[]), ...apiOnly];
}

/* ─── Export backup ─── */

export function exportarRespaldo() {
  const data = {
    exportedAt: new Date().toISOString(),
    hoteles: loadHotelesLS(),
    tours: loadToursLS(),
    traslados: loadTrasladosLS(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tarifas-rge-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
