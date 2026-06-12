export type Acomodacion = "SGL" | "DBL" | "TPL" | "QDL" | "CHD";
export type Tier = "p1" | "p2_5" | "p6_10";

export interface Hotel {
  id: string;
  nombre: string;
  categoria: string;
  estrellas: string;
  tipoHabitacion: string;
  ubicacion: string;
  desayuno: string;
  vigencia: string;
  precios: { SGL: number; DBL: number; TPL: number; CHD: number };
  /** Observaciones del hotel — se copian automáticamente al seleccionar el hotel en el cotizador */
  observaciones?: string;
  /** URLs o data-URLs de imágenes del hotel */
  imagenes?: string[];
}

export interface Tour {
  id: string;
  nombre: string;
  categoria: string;
  seccion: string;
  horario: string;
  precio_por_persona: number;
  precios: { p1: number; p2_5: number; p6_10: number; chd: number };
  descripcion: string;
}

export interface Traslado {
  id: string;
  nombre: string;
  categoria: string;
  tipo: "Regular" | "Privado";
  precio_por_persona: number;
  precios: { p1: number; p2_5: number; p6_10: number; chd: number };
}

export interface TourTickets {
  enabled: boolean;
  label: string;
  adultPrice: number;
  childPrice?: number;
}

export interface ServicioSeleccionado {
  id: string;
  codigo?: string;
  tipo: "hotel" | "tour" | "traslado" | "vuelo" | "catamaran";
  nombre: string;
  origen?: string;
  destino?: string;
  tickets?: TourTickets;
  horario?: string;
  precios: {
    p1?: number;
    p2_5?: number;
    p6_10?: number;
    chd?: number;
    SGL?: number;
    DBL?: number;
    TPL?: number;
    CHD?: number;
  };
  tarifaOverride?: Tier;
  unitOverride?: number;
  paxOverride?: number;
  usarFecha?: boolean;
  fecha?: string;
  fechaInicio?: string;
  fechaFin?: string;
  notas?: string;
  notesImportant?: boolean;
  ubicacion?: string;
  estrellas?: string;
  vigencia?: string;
  tipoHabitacion?: string;
  desayuno?: string;
  manual?: boolean;
  tipoServicio?: "Regular" | "Privado";
  ruta?: string;
  duracion?: string;
  entradasDesc?: string;
  customTipo?: string;
  notasList?: Array<{
    id?: string;
    type?: "normal" | "important";
    text: string;
    important?: boolean;
    createdAt?: string;
    updatedAt?: string;
  }>;
  /** In Paquete mode: which hotel option this hotel belongs to (e.g. "op1", "op2") */
  paqueteOpcionId?: string;
  /** Duplicated service marker — only used in the UI panel, never exported */
  isDuplicate?: boolean;
  duplicatedFromId?: string;
  /** Base64 data URLs of images attached to this service */
  images?: string[];
}

export interface Descriptivo {
  codigo: string;
  titulo: string;
  titulo_en?: string;
  titulo_pt?: string;
  info?: string;
  parrafos?: string[];
  parrafos_en?: string[];
  parrafos_pt?: string[];
  incluye?: string;
  incluye_en?: string;
  incluye_pt?: string;
  observaciones?: string;
  observaciones_en?: string;
  observaciones_pt?: string;
  recomendaciones?: string;
  recomendaciones_en?: string;
  recomendaciones_pt?: string;
  notaImportante?: string;
  notaImportante_en?: string;
  notaImportante_pt?: string;
  horarioExtra?: string;
}

export type Agente = string;

export interface Cliente {
  nombre: string;
  cotizacionNombre: string;
  correo: string;
  whatsapp: string;
  agente: string;
  counter: string;
  emailCliente?: string;
  fechaInicio: string;
  fechaFin: string;
  vigencia: string;
  pasajeros: number;
  ninos: number;
  noches: number;
}

export type ClienteValidationField = "agencia" | "agente" | "fechaInicio";

export type ClienteValidationErrors = Partial<
  Record<ClienteValidationField, boolean>
>;

export function validateCliente(c: Cliente): {
  ok: boolean;
  errors: ClienteValidationErrors;
} {
  const errors: ClienteValidationErrors = {};
  if (!c.correo?.trim()) errors.agencia = true;
  if (!c.agente?.trim()) errors.agente = true;
  return { ok: Object.keys(errors).length === 0, errors };
}

export interface ServicioCalculado {
  id: string;
  tipo: "hotel" | "tour" | "traslado" | "vuelo" | "catamaran";
  nombre: string;
  origen?: string;
  destino?: string;
  codigo?: string;
  preciosPorAcomodacion: Record<Acomodacion, number>;
  totalesPorAcomodacion: Record<Acomodacion, number>;
  detalle: string;
  fecha?: string;
  fechaInicio?: string;
  fechaFin?: string;
  notas?: string;
  notesImportant?: boolean;
  ubicacion?: string;
  estrellas?: string;
  vigencia?: string;
  tipoHabitacion?: string;
  desayuno?: string;
  noches?: number;
  paxAplicados?: number;
  tierAplicado?: Tier;
  unitAplicado?: number;
  tickets?: TourTickets;
  horario?: string;
  tipoServicio?: "Regular" | "Privado";
  notasList?: Array<{
    id?: string;
    type?: "normal" | "important";
    text: string;
    important?: boolean;
    createdAt?: string;
    updatedAt?: string;
  }>;
  /** Base64 data URLs of images attached to this service */
  images?: string[];
}

export interface CotizacionResult {
  servicios: ServicioCalculado[];
  totalesPorAcomodacion: Record<Acomodacion, number>;
  subtotalesPorTipo: {
    hotel: Record<Acomodacion, number>;
    tour: Record<Acomodacion, number>;
    traslado: Record<Acomodacion, number>;
    vuelo: Record<Acomodacion, number>;
    catamaran: Record<Acomodacion, number>;
  };
  acomodaciones: Acomodacion[];
  noches: number;
  pasajeros: number;
  ninos: number;
}
