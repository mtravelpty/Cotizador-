import type { Acomodacion, Cliente, ServicioSeleccionado } from "@/lib/types";
import { apiAuth } from "@/lib/api-auth";
import { queryClient } from "@/lib/queryClient";

export type ModoCotizacion = "tarifas" | "calculo";
export type PresentationMode = "detailed" | "package";
export type QuotingMode = "individual" | "grupo";

/** Legacy status — kept for backward compat */
export type EstadoCotizacion =
  | "pendiente"
  | "enviado"
  | "confirmado"
  | "cancelado";

/**
 * V2 — 5 simplified states.
 * NUEVA, ESPERANDO_CLIENTE, REQUIERE_ACCION are auto-managed.
 * Only CONFIRMADA and PERDIDA are set manually.
 */
export type EstadoCRM =
  | "nueva"
  | "esperando_cliente"
  | "requiere_accion"
  | "confirmada"
  | "perdida";

export type Prioridad = "alta" | "media" | "baja";

export type TipoProximaAccion =
  | "llamar"
  | "whatsapp"
  | "correo"
  | "esperar"
  | "confirmarPago"
  | "reenviar"
  | "recordatorio";

export type ActividadTipo =
  | "creada"
  | "editada"
  | "pdf_enviado"
  | "whatsapp_enviado"
  | "correo_enviado"
  | "guardado_manual"
  | "duplicada"
  | "confirmada"
  | "nota_agregada"
  | "estado_cambiado";

export interface ActividadEntry {
  fecha: string;
  tipo: ActividadTipo;
  detalle?: string;
  byUser?: string;
}

// ─── Opportunity history types ─────────────────────────────────────────────────

export type OppActividadTipo =
  | "oportunidad_creada"
  | "cotizacion_agregada"
  | "cotizacion_modificada"
  | "pdf_generado"
  | "correo_generado"
  | "prioridad_activada"
  | "prioridad_quitada"
  | "nota_agregada"
  | "recordatorio_creado"
  | "recordatorio_pospuesto"
  | "marcada_atendida"
  | "estado_cambiado"
  | "venta_confirmada"
  | "marcada_perdida"
  | "anulada"
  | "restaurada";

export interface OppHistorialEntry {
  fecha: string;
  tipo?: OppActividadTipo;
  detalle?: string;
  cambios?: string[];
  byUser?: string;
}

export interface CotizacionGuardada {
  id: string;
  fechaCreacion: string;
  numeroCotizacion: string;
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  modoCotizacion: ModoCotizacion;
  /** @deprecated use estadoCRM */
  estado?: EstadoCotizacion;
  observacionesSeleccionadas?: string[];
  observacionManual?: string;
  /** ISO timestamp when the quote was first sent (WhatsApp/email/PDF) */
  sentAt?: string;
  /** V2 commercial state — auto-managed except CONFIRMADA/PERDIDA */
  estadoCRM?: EstadoCRM;
  prioridad?: Prioridad;
  /** ISO timestamp of last follow-up action */
  ultimoSeguimiento?: string;
  proximaAccion?: string;
  fechaRecordatorio?: string;
  notaInterna?: string;
  historial?: ActividadEntry[];
  tipoProximaAccion?: TipoProximaAccion;
  fechaProximaAccion?: string;
  observacionSeguimiento?: string;
  /** Quick reminder ISO date — shows in bell under 🔵 Recordatorios */
  recordatorio?: string;
  /** Cached total value (primary acomodacion) for priority sorting */
  valorCotizacion?: number;
  agenteSeguimiento?: string;
  destinoSeguimiento?: string;
  esFavorito?: boolean;
  /** Soft-delete: hidden from active view, shown in Anuladas tab */
  anulada?: boolean;
  fechaAnulacion?: string;
  motivoAnulacion?: string;
  /** Name of user who created this quotation */
  createdByName?: string;
  /** ID of user who created this quotation */
  createdByUserId?: number;
  /** Email of user who created this quotation */
  createdByEmail?: string;
  /** Name of user who last updated this quotation */
  updatedByName?: string;
  /** ID of user who last updated this quotation */
  updatedByUserId?: number;
  /** Email of user who last updated this quotation */
  updatedByEmail?: string;
  /** ISO timestamp of last update */
  updatedAt?: string;
  /** Link to parent opportunity */
  opportunityId?: string;
  /** Presentation mode: detailed shows all prices, package hides individual prices */
  presentationMode?: PresentationMode;
  /** Hotel options for Paquete mode — each option has its own hotels, shared services remain common */
  opcionesPaquete?: Array<{ id: string; nombre: string }>;
}

// ─── Module-level caches for diff detection ──────────────────────────────────
let _guardadasCache: CotizacionGuardada[] = [];
let _oppCache: Opportunity[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * Compute the automatic state for a quote.
 * CONFIRMADA and PERDIDA are sticky (never overridden).
 * All other states are derived from activity rules.
 */
export function computeAutoEstado(g: CotizacionGuardada): EstadoCRM {
  if (g.estadoCRM === "confirmada") return "confirmada";
  if (g.estadoCRM === "perdida") return "perdida";

  const lastActivity = g.ultimoSeguimiento ?? g.fechaCreacion;
  const sinActividad = daysSince(lastActivity);
  const diasHastaVigencia = daysUntil(g.cliente.vigencia);

  // Sin actividad por más de 3 días → Requiere acción
  if (sinActividad > 3) return "requiere_accion";

  // Vigencia próxima (≤ 5 días) → Requiere acción
  if (diasHastaVigencia !== null && diasHastaVigencia <= 5) return "requiere_accion";

  // Recordatorio pendiente que ya venció → Requiere acción
  if (g.recordatorio) {
    const recDate = new Date(g.recordatorio);
    if (!Number.isNaN(recDate.getTime()) && recDate <= new Date()) {
      return "requiere_accion";
    }
  }

  // Enviada (sent via PDF/WA/email)
  if (g.sentAt) return "esperando_cliente";

  return "nueva";
}

/** Map legacy estado/estadoCRM values to the new 5-state system */
function migrarEstado(
  estadoCRM?: EstadoCRM | string,
  estadoLegacy?: EstadoCotizacion,
): EstadoCRM {
  // Already new 5-state values
  if (estadoCRM === "confirmada") return "confirmada";
  if (estadoCRM === "perdida") return "perdida";
  if (estadoCRM === "nueva") return "nueva";
  if (estadoCRM === "esperando_cliente") return "esperando_cliente";
  if (estadoCRM === "requiere_accion") return "requiere_accion";

  // Old 6-state values → new 5-state
  if (estadoCRM === "enviada" || estadoCRM === "seguimiento" || estadoCRM === "negociacion") {
    return "esperando_cliente";
  }

  // Legacy estado field
  if (estadoLegacy === "enviado") return "esperando_cliente";
  if (estadoLegacy === "confirmado") return "confirmada";
  if (estadoLegacy === "cancelado") return "perdida";

  return "nueva";
}

export function generateNumeroCotizacion(): string {
  const code = Date.now().toString(36).slice(-6).toUpperCase();
  return `RGE-${code}`;
}

function deriveNumeroFromId(id: string): string {
  const n = parseInt(id, 10);
  if (Number.isFinite(n) && n > 0) {
    const code = n.toString(36).slice(-6).toUpperCase().padStart(6, "0");
    return `RGE-${code}`;
  }
  return generateNumeroCotizacion();
}

function normalizeGuardada(g: Partial<CotizacionGuardada> & { id: string; fechaCreacion: string; cliente: Cliente; servicios: ServicioSeleccionado[]; acomodaciones: Acomodacion[] }): CotizacionGuardada {
  const base: CotizacionGuardada = {
    ...g as CotizacionGuardada,
    modoCotizacion: g.modoCotizacion ?? "calculo",
    numeroCotizacion: g.numeroCotizacion || deriveNumeroFromId(g.id),
    estadoCRM: migrarEstado(g.estadoCRM, (g as unknown as { estado?: EstadoCotizacion }).estado),
    historial: g.historial ?? [],
  };
  return { ...base, estadoCRM: computeAutoEstado(base) };
}

export function loadGuardadas(): CotizacionGuardada[] {
  const cached = queryClient.getQueryData<CotizacionGuardada[]>(["guardadas"]);
  if (cached) { _guardadasCache = cached; return cached; }
  return _guardadasCache;
}

export async function loadGuardadasAsync(): Promise<CotizacionGuardada[]> {
  const cached = queryClient.getQueryData<CotizacionGuardada[]>(["guardadas"]);
  if (cached) return cached;
  try {
    const raw = await apiAuth.guardadas.list() as Array<Partial<CotizacionGuardada> & { id: string; fechaCreacion: string; cliente: Cliente; servicios: ServicioSeleccionado[]; acomodaciones: Acomodacion[] }>;
    const data = raw.map(normalizeGuardada);
    _guardadasCache = data;
    queryClient.setQueryData(["guardadas"], data);
    return data;
  } catch (err) {
    console.error("[guardadas] Error cargando:", err);
    return _guardadasCache;
  }
}

export function saveGuardadas(items: CotizacionGuardada[]) {
  const prev = _guardadasCache;
  _guardadasCache = items;
  queryClient.setQueryData(["guardadas"], items);

  // Diff-based background sync
  const prevMap = new Map(prev.map((g) => [g.id, g]));
  const newMap = new Map(items.map((g) => [g.id, g]));

  for (const item of items) {
    const p = prevMap.get(item.id);
    if (!p || JSON.stringify(p) !== JSON.stringify(item)) {
      apiAuth.guardadas.save(item).catch(console.error);
    }
  }
  for (const id of prevMap.keys()) {
    if (!newMap.has(id)) apiAuth.guardadas.remove(id).catch(console.error);
  }
}

export function registrarActividad(
  items: CotizacionGuardada[],
  id: string,
  tipo: ActividadTipo,
  detalle?: string,
): CotizacionGuardada[] {
  const entry: ActividadEntry = {
    fecha: new Date().toISOString(),
    tipo,
    detalle,
  };
  const next = items.map((g) => {
    if (g.id !== id) return g;
    const updated = {
      ...g,
      historial: [entry, ...(g.historial ?? [])].slice(0, 50),
      ultimoSeguimiento: new Date().toISOString(),
    };
    return { ...updated, estadoCRM: computeAutoEstado(updated) };
  });
  saveGuardadas(next);
  return next;
}

export interface GuardarEnSeguimientoInput {
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  modo: ModoCotizacion;
  numeroCotizacion?: string;
  observacionesSeleccionadas?: string[];
  observacionManual?: string;
  valorCotizacion?: number;
}

export interface GuardarEnSeguimientoResult {
  saved: boolean;
  items: CotizacionGuardada[];
  duplicate?: boolean;
}

export function guardarEnSeguimiento(
  input: GuardarEnSeguimientoInput,
): GuardarEnSeguimientoResult {
  const items = loadGuardadas();
  const norm = (s: string) => (s || "").trim().toLowerCase();
  const isDuplicate = items.some(
    (g) =>
      norm(g.cliente.cotizacionNombre || g.cliente.nombre) === norm(input.cliente.cotizacionNombre || input.cliente.nombre) &&
      g.cliente.fechaInicio === input.cliente.fechaInicio &&
      g.cliente.fechaFin === input.cliente.fechaFin,
  );
  if (isDuplicate) {
    return { saved: false, items, duplicate: true };
  }
  const base: CotizacionGuardada = {
    id: `${Date.now()}`,
    fechaCreacion: new Date().toISOString(),
    numeroCotizacion: input.numeroCotizacion || generateNumeroCotizacion(),
    cliente: input.cliente,
    servicios: input.servicios,
    acomodaciones: input.acomodaciones,
    modoCotizacion: input.modo,
    estadoCRM: "nueva",
    prioridad: "media",
    historial: [{ fecha: new Date().toISOString(), tipo: "creada" }],
    ultimoSeguimiento: new Date().toISOString(),
    valorCotizacion: input.valorCotizacion,
    observacionesSeleccionadas: input.observacionesSeleccionadas?.length
      ? [...input.observacionesSeleccionadas]
      : undefined,
    observacionManual: input.observacionManual || undefined,
  };
  const nueva = { ...base, estadoCRM: computeAutoEstado(base) };
  const next = [nueva, ...items].slice(0, 50);
  saveGuardadas(next);
  return { saved: true, items: next };
}

export function duplicarCotizacion(
  orig: CotizacionGuardada,
): CotizacionGuardada {
  const base: CotizacionGuardada = {
    ...orig,
    id: `${Date.now()}`,
    fechaCreacion: new Date().toISOString(),
    numeroCotizacion: generateNumeroCotizacion(),
    estado: "pendiente",
    estadoCRM: "nueva",
    prioridad: orig.prioridad ?? "media",
    ultimoSeguimiento: new Date().toISOString(),
    proximaAccion: undefined,
    fechaRecordatorio: undefined,
    recordatorio: undefined,
    notaInterna: undefined,
    historial: [{ fecha: new Date().toISOString(), tipo: "duplicada", detalle: `Desde ${orig.numeroCotizacion}` }],
    observacionesSeleccionadas: orig.observacionesSeleccionadas ? [...orig.observacionesSeleccionadas] : undefined,
    observacionManual: orig.observacionManual,
    cliente: { ...orig.cliente },
    servicios: orig.servicios.map((s) => ({ ...s })),
    acomodaciones: [...orig.acomodaciones],
    opportunityId: undefined,
  };
  return { ...base, estadoCRM: computeAutoEstado(base) };
}

// ─── Opportunity ──────────────────────────────────────────────────────────────

export type EstadoOportunidad =
  | "nueva"
  | "enviada"
  | "seguimiento"
  | "confirmada"
  | "perdida"
  | "anulada";

export interface OpportunityQuote {
  id: string;
  numeroCotizacion: string;
  fechaCreacion: string;
  total?: number;
}

export interface Opportunity {
  id: string;
  agencyName: string;
  agentName: string;
  counterName: string;
  quoteName: string;
  destination: string;
  status: EstadoOportunidad;
  priorityManual: boolean;
  lastUpdateAt: string;
  createdAt: string;
  quotes: OpportunityQuote[];
  totalLatest?: number;
  latestQuoteCode: string;
  notaInterna?: string;
  recordatorio?: string;
  proximaAccion?: string;
  historial?: OppHistorialEntry[];
  /** Name of user who created this opportunity */
  createdByName?: string;
  /** ID of user who created this opportunity */
  createdByUserId?: number;
  /** Email of user who created this opportunity */
  createdByEmail?: string;
  /** Name of user who last updated this opportunity */
  updatedByName?: string;
  /** ID of user who last updated this opportunity */
  updatedByUserId?: number;
  /** Email of user who last updated this opportunity */
  updatedByEmail?: string;
  /** ISO timestamp of last update by a user */
  updatedAt?: string;
}

// ─── Urgency ──────────────────────────────────────────────────────────────────

export type UrgencyLevel = "red" | "yellow" | "green";

function _daysSince(iso?: string): number {
  if (!iso) return 999;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function getOppUrgency(o: Opportunity): UrgencyLevel {
  if (o.status === "confirmada" || o.status === "perdida" || o.status === "anulada") return "green";
  const days = _daysSince(o.lastUpdateAt);
  const rec = o.recordatorio ? new Date(o.recordatorio + "T23:59:59") : null;
  const recExpired = rec !== null && rec <= new Date();
  if (days >= 7) return "red";
  if (recExpired && days >= 6) return "red";
  if (days >= 4) return "yellow";
  if (recExpired) return "yellow";
  return "green";
}

export function loadOpportunities(): Opportunity[] {
  const cached = queryClient.getQueryData<Opportunity[]>(["oportunidades"]);
  if (cached) { _oppCache = cached; return cached; }
  return _oppCache;
}

export async function loadOpportunitiesAsync(): Promise<Opportunity[]> {
  const cached = queryClient.getQueryData<Opportunity[]>(["oportunidades"]);
  if (cached) return cached;
  try {
    const data = await apiAuth.oportunidades.list() as Opportunity[];
    _oppCache = data;
    queryClient.setQueryData(["oportunidades"], data);
    return data;
  } catch (err) {
    console.error("[oportunidades] Error cargando:", err);
    return _oppCache;
  }
}

export function saveOpportunities(items: Opportunity[]) {
  const prev = _oppCache;
  _oppCache = items;
  queryClient.setQueryData(["oportunidades"], items);

  const prevMap = new Map(prev.map((o) => [o.id, o]));
  const newMap = new Map(items.map((o) => [o.id, o]));

  for (const item of items) {
    const p = prevMap.get(item.id);
    if (!p || JSON.stringify(p) !== JSON.stringify(item)) {
      apiAuth.oportunidades.save(item).catch(console.error);
    }
  }
  for (const id of prevMap.keys()) {
    if (!newMap.has(id)) apiAuth.oportunidades.remove(id).catch(console.error);
  }
}

export interface UpsertOpportunityInput {
  quoteId: string;
  numeroCotizacion: string;
  agencyName: string;
  agentName: string;
  counterName: string;
  quoteName: string;
  destination: string;
  total?: number;
  createdByName?: string;
  createdByUserId?: number;
  createdByEmail?: string;
}

function oppKey(agencyName: string, agentName: string, quoteName: string): string {
  const n = (s: string) => (s || "").trim().toLowerCase();
  return `${n(agencyName)}|${n(agentName)}|${n(quoteName)}`;
}

export function upsertOpportunity(input: UpsertOpportunityInput): Opportunity[] {
  const opps = loadOpportunities();
  const now = new Date().toISOString();
  const key = oppKey(input.agencyName, input.agentName, input.quoteName);

  const quoteRef: OpportunityQuote = {
    id: input.quoteId,
    numeroCotizacion: input.numeroCotizacion,
    fechaCreacion: now,
    total: input.total,
  };

  const idx = opps.findIndex((o) => oppKey(o.agencyName, o.agentName, o.quoteName) === key);
  let next: Opportunity[];

  if (idx !== -1) {
    const existing = opps[idx];
    const isNewQuote = !existing.quotes.some((q) => q.id === input.quoteId);
    const dedupedQuotes = [quoteRef, ...existing.quotes.filter((q) => q.id !== input.quoteId)];
    const updatedStatus: EstadoOportunidad =
      existing.status === "anulada" || existing.status === "confirmada" || existing.status === "perdida"
        ? existing.status
        : input.quoteId === existing.quotes[0]?.id
          ? existing.status
          : "enviada";
    const newEntry: OppHistorialEntry | null = isNewQuote
      ? { fecha: now, tipo: "cotizacion_agregada", detalle: input.numeroCotizacion }
      : null;
    const updated: Opportunity = {
      ...existing,
      quotes: dedupedQuotes,
      totalLatest: input.total ?? existing.totalLatest,
      latestQuoteCode: input.numeroCotizacion,
      lastUpdateAt: now,
      destination: input.destination || existing.destination,
      counterName: input.counterName || existing.counterName,
      status: updatedStatus,
      historial: newEntry
        ? [newEntry, ...(existing.historial ?? [])].slice(0, 100)
        : existing.historial,
    };
    next = opps.map((o, i) => (i === idx ? updated : o));
  } else {
    const opp: Opportunity = {
      id: `opp-${Date.now()}`,
      agencyName: input.agencyName,
      agentName: input.agentName,
      counterName: input.counterName,
      quoteName: input.quoteName || "Sin nombre",
      destination: input.destination,
      status: "nueva",
      priorityManual: false,
      lastUpdateAt: now,
      createdAt: now,
      quotes: [quoteRef],
      totalLatest: input.total,
      latestQuoteCode: input.numeroCotizacion,
      historial: [{ fecha: now, tipo: "oportunidad_creada", byUser: input.createdByName }],
      createdByName: input.createdByName,
      createdByUserId: input.createdByUserId,
      createdByEmail: input.createdByEmail,
    };
    next = [opp, ...opps];
  }

  saveOpportunities(next);
  return next;
}

export function updateOpportunity(id: string, patch: Partial<Opportunity>): Opportunity[] {
  const opps = loadOpportunities();
  const now = new Date().toISOString();
  const next = opps.map((o) => {
    if (o.id !== id) return o;
    return { ...o, ...patch, lastUpdateAt: now };
  });
  saveOpportunities(next);
  return next;
}
