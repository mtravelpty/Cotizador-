import type {
  Acomodacion,
  Cliente,
  CotizacionResult,
  Descriptivo,
  ServicioCalculado,
  ServicioSeleccionado,
} from "./types";
import { formatRegimen } from "./regimen";
import { fmt, calcGrupoTotalFromResult, calcularLocal } from "./calc";
import { formatTrasladoNombre, personalizarNombreTraslado } from "./utils";
import { buildItinerario, type ItinerarioDia } from "@/components/Itinerario";
import type { ModoCotizacion, PresentationMode } from "@/components/Guardadas";
import { tr as getT, type Idioma, type Traducciones } from "./i18n";

export interface PropuestaInput {
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  result: CotizacionResult;
  modo: ModoCotizacion;
  incluirItinerario: boolean;
  incluirDescriptivos: boolean;
  incluirDescriptivoCompleto?: boolean;
  descriptivos?: Descriptivo[];
  numeroCotizacion?: string;
  /** Manual overrides for itinerary activity text, keyed by día number. */
  actividadesOverride?: Record<number, string>;
  /** When true, itinerary activity cells are rendered as contenteditable. */
  editable?: boolean;
  /** Optional intro text rendered at the very top of the body (used for emails). */
  intro?: string;
  /** Resolved observation strings to show at the bottom of the proposal */
  observaciones?: string[];
  /** Output language for all section labels and table headers */
  idioma?: Idioma;
  /** When true (default), generic hotel placeholders in traslado names are replaced with the actual hotel name. */
  personalizarTraslados?: boolean;
  /** Presentation mode: detailed shows individual prices, package hides them and shows a final price block */
  presentationMode?: PresentationMode;
  /** Hotel options for Paquete mode — each option has its own hotels; shared services apply to all */
  opcionesPaquete?: Array<{ id: string; nombre: string }>;
  /** Quoting mode: group adds room-distribution and total-group blocks */
  quotingMode?: "individual" | "grupo";
  /** Room counts per accommodation type (used in grupo mode) */
  habitacionesPorAcomodacion?: Partial<Record<Acomodacion, number>>;
}

export interface PropuestaData {
  fechaEmision: string;
  destino: string;
  fechaViaje: string;
  pasajerosLabel: string;
  numeroCotizacion: string;
  validaHasta: string;
  tipoServicio: string;
  noches: string;
  agencia: string;
  agente: string;
  hoteles: ServicioCalculado[];
  traslados: ServicioCalculado[];
  tours: ServicioCalculado[];
  vuelos: ServicioCalculado[];
  catamarans: ServicioCalculado[];
  acoms: Acomodacion[];
  primary: Acomodacion;
  isCalc: boolean;
  isPackage: boolean;
  isGrupo: boolean;
  grupoHabitacionesPorAcom: Partial<Record<Acomodacion, number>>;
  grupoNinos: number;
  grupoTotalPax: number;
  grupoTotal: number;
  itinerario: ItinerarioDia[];
  result: CotizacionResult;
  cliente: Cliente;
  incluirDescriptivos: boolean;
  incluirDescriptivoCompleto: boolean;
  descriptivosTours: Descriptivo[];
  editable: boolean;
  intro: string;
  observaciones: string[];
  idioma: Idioma;
  T: Traducciones;
  personalizarTraslados: boolean;
  /** Per-option computed data when in Paquete mode with named hotel options */
  opcionesHoteleras?: Array<{
    id: string;
    nombre: string;
    hoteles: ServicioCalculado[];
    totalesPorAcomodacion: Partial<Record<Acomodacion, number>>;
  }>;
}

const MESES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
void MESES_ES;

function fmtFecha(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function fmtFechaCompacta(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${String(y).slice(2)}`;
}

function fmtFechaBar(iso: string, idioma: Idioma = "es"): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const MESES: Record<Idioma, string[]> = {
    es: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
    en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    pt: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],
  };
  return `${String(d).padStart(2,"0")} ${(MESES[idioma] ?? MESES.es)[m - 1]} ${y}`;
}

function formatNotasLineas(text: string, style: string): string {
  if (!text.trim()) return "";
  const lines: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const part of trimmed.split(/(?<=\.)\s+|(?<=;)\s+/)) {
      const p = part.trim();
      if (p) lines.push(p);
    }
  }
  return lines.map((l) => `<div style="${style}">${escape(l)}</div>`).join("");
}

/** Renders a hotel's check-in/check-out line in the same style as catamaran dates. */
function hotelFechasLine(
  h: { fechaInicio?: string; fechaFin?: string; noches?: number },
  style = STYLES.cellNote,
): string {
  if (!h.fechaInicio && !h.fechaFin) return "";
  const desde = h.fechaInicio ? fmtFecha(h.fechaInicio) : "?";
  const hasta  = h.fechaFin   ? fmtFecha(h.fechaFin)   : "?";
  const nStr   = h.noches ? ` · ${h.noches} noche${h.noches !== 1 ? "s" : ""}` : "";
  return `<div style="${style};white-space:nowrap;">Fechas: ${escape(desde)} al ${escape(hasta)}${nStr}</div>`;
}

/** Renders up to 3 service images as an inline table row (email-safe). */
function renderImagesHTML(images?: string[]): string {
  if (!images || images.length === 0) return "";
  const visible = images.slice(0, 3);
  const cells = visible
    .map(
      (src) =>
        `<td style="padding:0 4px 0 0;vertical-align:top;">` +
        `<img src="${src}" alt="" width="160" style="width:160px;height:auto;max-height:120px;object-fit:cover;border-radius:6px;display:block;" />` +
        `</td>`,
    )
    .join("");
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;"><tr>${cells}</tr></table>`;
}

function renderNotasHTML(
  notas?: string,
  notesImportant?: boolean,
  notasList?: Array<{ id?: string; type?: string; text: string; important?: boolean }>,
  styleNormal: string = "font-size:11px;color:#64748B;font-style:italic;margin-top:3px;",
): string {
  if (notasList && notasList.length > 0) {
    const sorted = [...notasList].sort((a, b) => {
      const aImp = (a.type === "important" || a.important === true) ? 0 : 1;
      const bImp = (b.type === "important" || b.important === true) ? 0 : 1;
      return aImp - bImp;
    });
    return sorted
      .map((n) => {
        const imp = n.type === "important" || n.important === true;
        return imp
          ? `<div style="border-left:3px solid #EF7B15;padding-left:6px;font-size:12px;color:#ef7b15;font-weight:600;margin-top:4px;">${escape(n.text)}</div>`
          : `<div style="${styleNormal}margin-top:3px;">• ${escape(n.text)}</div>`;
      })
      .join("");
  }
  if (notas) {
    const style = notesImportant
      ? `font-size:12px;color:#ef7b15;font-weight:600;font-style:italic;margin-top:4px;`
      : styleNormal;
    return `<div style="${style}">${escape(notas)}</div>`;
  }
  return "";
}

function todayIso(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function deriveTipoServicio(r: CotizacionResult): string {
  const relevantes = r.servicios.filter(
    (s) => s.tipo === "traslado" || s.tipo === "tour",
  );
  if (relevantes.length === 0) return "—";
  const tipos = new Set<"regular" | "privado">();
  for (const s of relevantes) {
    const isPrivado = s.tipoServicio
      ? s.tipoServicio === "Privado"
      : (s.detalle || "").toLowerCase().includes("privado");
    tipos.add(isPrivado ? "privado" : "regular");
  }
  if (tipos.size === 2) return "Mixto (Regular/Privado)";
  return tipos.has("privado") ? "Privado" : "Regular";
}

function deriveDestino(hoteles: ServicioCalculado[]): string {
  const ubic = Array.from(
    new Set(
      hoteles
        .map((h) => (h.ubicacion || "").trim())
        .filter(Boolean),
    ),
  );
  if (ubic.length === 0) return "—";
  return ubic.join(" · ");
}

/** Pick the right language variant for a descriptivo field. Falls back to ES. */
function pickDesc(
  es: string | undefined,
  en: string | undefined,
  pt: string | undefined,
  idioma: Idioma,
): string | undefined {
  if (idioma === "en") return en || es;
  if (idioma === "pt") return pt || es;
  return es;
}

/** Pick the right array variant for a descriptivo field. Falls back to ES array. */
function pickDescArr(
  es: string[] | undefined,
  en: string[] | undefined,
  pt: string[] | undefined,
  idioma: Idioma,
): string[] | undefined {
  if (idioma === "en") return (en && en.length > 0 ? en : es);
  if (idioma === "pt") return (pt && pt.length > 0 ? pt : es);
  return es;
}

export function buildPropuestaData(input: PropuestaInput): PropuestaData {
  const { cliente, servicios, result, modo, incluirItinerario } = input;
  const idioma: Idioma = input.idioma ?? "es";
  const T = getT(idioma);

  const hoteles = result.servicios.filter((s) => s.tipo === "hotel");
  const traslados = result.servicios.filter((s) => s.tipo === "traslado");
  const tours = result.servicios.filter((s) => s.tipo === "tour");
  const vuelos = result.servicios.filter((s) => s.tipo === "vuelo");
  const catamarans = result.servicios.filter((s) => s.tipo === "catamaran");
  const acoms = result.acomodaciones;
  const primary = acoms[0];
  const isCalc = modo === "calculo";

  const incluirDescriptivoCompleto = input.incluirDescriptivoCompleto === true;
  const descriptivosTours: Descriptivo[] = [];
  if (incluirDescriptivoCompleto && input.descriptivos?.length) {
    const norm = (s: string) => s.trim().toUpperCase();
    const byCode = new Map<string, Descriptivo>();
    for (const d of input.descriptivos) {
      if (d?.codigo) byCode.set(norm(d.codigo), d);
    }
    const seen = new Set<string>();
    for (const t of tours) {
      const raw = t.codigo || t.id;
      if (!raw) continue;
      const code = norm(raw);
      if (seen.has(code)) continue;
      const d = byCode.get(code);
      if (d) {
        seen.add(code);
        descriptivosTours.push(d);
      }
    }
  }

  const overrides = input.actividadesOverride ?? {};
  const itinerario = incluirItinerario
    ? buildItinerario(cliente, servicios).map((it) =>
        overrides[it.dia] !== undefined
          ? { ...it, actividad: overrides[it.dia] }
          : it,
      )
    : [];

  // Passenger label uses the output language
  const pax = cliente.pasajeros;
  const ninos = cliente.ninos ?? 0;
  const pasajerosLabel = `${pax} ${pax === 1 ? T.adulto : T.adultos}${
    ninos ? ` + ${ninos} ${ninos === 1 ? T.nino : T.ninoPlural}` : ""
  }`;

  const fechaViaje =
    cliente.fechaInicio && cliente.fechaFin
      ? `${fmtFecha(cliente.fechaInicio)} al ${fmtFecha(cliente.fechaFin)}`
      : cliente.fechaInicio
        ? fmtFecha(cliente.fechaInicio)
        : "—";

  const numero =
    input.numeroCotizacion ??
    `RGE-${Date.now().toString(36).slice(-6).toUpperCase()}`;

  const isGrupo = input.quotingMode === "grupo";
  const grupoHabitacionesPorAcom: Partial<Record<Acomodacion, number>> =
    input.habitacionesPorAcomodacion ?? {};
  const ROOM_PAX: Partial<Record<Acomodacion, number>> = { SGL: 1, DBL: 2, TPL: 3 };
  const ROOM_ACOMS: Acomodacion[] = (["SGL", "DBL", "TPL"] as Acomodacion[]).filter((a) => acoms.includes(a));
  const rp = (a: Acomodacion) => ROOM_PAX[a] ?? 1;
  const grupoNinos = cliente.ninos ?? 0;
  const grupoAdultoPax = ROOM_ACOMS.reduce(
    (s, a) => s + (grupoHabitacionesPorAcom[a] ?? 0) * rp(a),
    0,
  );
  const grupoTotalPax = grupoAdultoPax + grupoNinos;
  const grupoSubs = calcGrupoTotalFromResult(result, grupoHabitacionesPorAcom, grupoNinos);
  const grupoTotal = grupoSubs.total;

  // ── Per-option hotel data for Paquete mode ──────────────────────────────
  let opcionesHoteleras: PropuestaData["opcionesHoteleras"];
  const isPackageMode = input.presentationMode === "package";
  if (isPackageMode && input.opcionesPaquete && input.opcionesPaquete.length > 0) {
    const firstOpId = input.opcionesPaquete[0].id;
    const sharedServices = servicios.filter((s) => s.tipo !== "hotel");
    opcionesHoteleras = input.opcionesPaquete.map((op) => {
      const opRawHotels = servicios.filter(
        (s) =>
          s.tipo === "hotel" &&
          (s.paqueteOpcionId === op.id ||
            (op.id === firstOpId && !s.paqueteOpcionId)),
      );
      if (opRawHotels.length === 0) return null;
      const opResult = calcularLocal(
        [...opRawHotels, ...sharedServices],
        result.acomodaciones,
        cliente,
      );
      return {
        id: op.id,
        nombre: op.nombre,
        hoteles: opResult.servicios.filter((s) => s.tipo === "hotel"),
        totalesPorAcomodacion: opResult.totalesPorAcomodacion as Partial<
          Record<Acomodacion, number>
        >,
      };
    }).filter((op): op is NonNullable<typeof op> => op !== null);
    if (opcionesHoteleras.length === 0) opcionesHoteleras = undefined;
  }

  return {
    fechaEmision: fmtFecha(todayIso()),
    destino: deriveDestino(hoteles),
    fechaViaje,
    pasajerosLabel,
    numeroCotizacion: numero,
    validaHasta: cliente.vigencia ? fmtFecha(cliente.vigencia) : "—",
    tipoServicio: deriveTipoServicio(result),
    noches: cliente.noches ? `${cliente.noches}` : "—",
    agencia: (cliente.correo || "").trim() || "—",
    agente: (cliente.agente || "").trim() || "—",
    hoteles,
    traslados,
    tours,
    vuelos,
    catamarans,
    acoms,
    primary,
    isCalc,
    isPackage: input.presentationMode === "package",
    isGrupo,
    grupoHabitacionesPorAcom,
    grupoNinos,
    grupoTotalPax,
    grupoTotal,
    itinerario,
    result,
    cliente,
    incluirDescriptivos: input.incluirDescriptivos,
    incluirDescriptivoCompleto,
    descriptivosTours,
    editable: input.editable === true,
    intro: input.intro?.trim() ? input.intro.trim() : "",
    observaciones: input.observaciones ?? [],
    idioma,
    T,
    personalizarTraslados: input.personalizarTraslados !== false,
    opcionesHoteleras,
  };
}

const COLOR_AZUL = "#1E3A8A";
const COLOR_NARANJA = "#f97316";
const COLOR_VERDE = "#16a34a";
const COLOR_TEXTO = "#1f2937";
const COLOR_BORDE = "#e5e7eb";
const COLOR_LABEL = "#6b7280";

const C_TOT_ALOJAMIENTO = "#802d62";
const C_TOT_TRASLADOS = "#802d62";
const C_TOT_TOURS = "#802d62";
const C_TOT_VUELOS = "#802d62";
const C_TOT_OBSERVACIONES = "#802d62";
const C_TOT_OBSERVACIONES_TEXT = "#ffffff";
const C_TOT_ITINERARIO = "#802d62";
const C_TOT_DESCRIPTIVOS = "#802d62";

const STYLES = {
  pillBlue: `display:inline-block;background:${COLOR_AZUL};color:#ffffff;padding:6px 14px;border-radius:20px;font-weight:600;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;`,
  pillOrange: `display:inline-block;background:${COLOR_NARANJA};color:#ffffff;padding:6px 14px;border-radius:20px;font-weight:600;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;`,
  pillAmber: `display:inline-block;background:#fbbf23;color:#ffffff;padding:6px 14px;border-radius:20px;font-weight:600;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;`,
  divider: `height:2px;background:${COLOR_NARANJA};border:0;margin:16px 0 20px;`,
  th: `text-align:left;color:#64748b;font-weight:700;font-size:10px;letter-spacing:0.6px;padding:10px 12px;border-bottom:1px solid ${COLOR_BORDE};text-transform:uppercase;background:#f8fafc;`,
  thNum: `text-align:right;color:#64748b;font-weight:700;font-size:10px;letter-spacing:0.6px;padding:10px 12px;border-bottom:1px solid ${COLOR_BORDE};text-transform:uppercase;background:#f8fafc;`,
  thCenter: `text-align:center;color:#64748b;font-weight:700;font-size:10px;letter-spacing:0.6px;padding:10px 12px;border-bottom:1px solid ${COLOR_BORDE};text-transform:uppercase;background:#f8fafc;`,
  thEmpty: `padding:10px 12px;border-bottom:1px solid ${COLOR_BORDE};background:#f8fafc;`,
  td: `padding:12px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:${COLOR_TEXTO};font-size:13px;`,
  tdNum: `padding:12px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:${COLOR_TEXTO};font-size:13px;text-align:right;font-weight:600;`,
  tdCenter: `padding:12px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:${COLOR_TEXTO};font-size:13px;text-align:center;`,
  tdEmpty: `padding:12px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;`,
  cellTitle: `font-weight:600;color:${COLOR_TEXTO};font-size:14px;`,
  cellSub: `font-size:12px;color:${COLOR_LABEL};margin-top:3px;`,
  cellNote: `font-size:12px;color:${COLOR_LABEL};font-style:italic;margin-top:4px;`,
  cellGreen: `font-size:12px;color:${COLOR_VERDE};font-weight:600;margin-top:4px;`,
  infoLabel: `padding:4px 10px 4px 0;color:${COLOR_LABEL};font-weight:600;font-size:12px;white-space:nowrap;vertical-align:top;`,
  infoValue: `padding:4px 0;color:${COLOR_TEXTO};font-weight:500;font-size:12px;vertical-align:top;`,
  block: `margin-bottom:28px;`,
};

const escape = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Like escape() but also converts newlines to <br /> for multi-line fields */
const escapeML = (s: unknown) => escape(s).replace(/\n/g, "<br />");

/** Full-width colored section header bar. Pass textColor="#1f2937" for light-colored bars. */
function sectionBar(title: string, color: string = COLOR_AZUL, textColor = "#ffffff"): string {
  return `<div style="background:${color};color:${textColor};padding:8px 14px 8px 24px;font-weight:700;font-size:11px;letter-spacing:0.8px;text-transform:uppercase;border-radius:4px 4px 0 0;">${escape(title)}</div>`;
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="${STYLES.infoLabel}">${escape(label)}:</td>
    <td style="${STYLES.infoValue}">${escape(value)}</td>
  </tr>`;
}

function groupByLocation<T extends { ubicacion?: string }>(
  items: T[],
): { label: string; items: T[] }[] {
  const groups: { key: string; label: string; items: T[] }[] = [];
  const indexMap = new Map<string, number>();
  for (const h of items) {
    const key = (h.ubicacion ?? "").trim().toUpperCase();
    const label = (h.ubicacion ?? "Sin ubicación").trim().toUpperCase();
    if (indexMap.has(key)) {
      groups[indexMap.get(key)!].items.push(h);
    } else {
      indexMap.set(key, groups.length);
      groups.push({ key, label, items: [h] });
    }
  }
  return groups;
}

function alojamientoTable(d: PropuestaData): string {
  if (d.isCalc) return "";
  if (d.hoteles.length === 0) return "";
  const { T } = d;

  // Fixed widths for narrow columns; hotel column is auto (takes remaining space).
  const COL_CAT  = "90px";
  const COL_HAB  = "110px";
  const COL_ACOM = "92px";

  // Include CHD column when there are children and CHD is not already in acoms.
  const ninosCount = d.cliente.ninos ?? 0;
  const hasChdAcom = d.acoms.some((a) => String(a).toUpperCase() === "CHD");
  const displayAcoms: Acomodacion[] =
    ninosCount > 0 && !hasChdAcom
      ? [...d.acoms, "CHD" as Acomodacion]
      : d.acoms;

  const nochesSuffix = `<div style="font-weight:400;color:#94a3b8;font-size:9px;margin-top:2px;line-height:1.2;white-space:nowrap;">Pax/Noche</div>`;
  const acomCols = displayAcoms
    .map(
      (a) =>
        `<th style="${STYLES.thNum};width:${COL_ACOM};text-align:center;white-space:nowrap;">${escape(String(a))}${nochesSuffix}</th>`,
    )
    .join("");

  const totalCols = 3 + displayAcoms.length;
  const groups = groupByLocation(d.hoteles);

  const rows = groups
    .map(({ label, items }) => {
      const locationHeader = `<tr style="page-break-inside:avoid;">
        <td colspan="${totalCols}" style="padding:8px 12px;background:#EEF1F8;border-top:1px solid #D8DFF0;border-bottom:1px solid #D8DFF0;">
          <div style="font-size:11px;font-weight:700;color:#363765;letter-spacing:1px;text-transform:uppercase;">${escape(label)}</div>
        </td>
      </tr>`;

      const hotelRows = items
        .map((h) => {
          // Only render a cell per acomodacion that is in d.acoms; use exact key mapping.
          const acomVals = displayAcoms
            .map(
              (a) =>
                `<td style="${STYLES.tdNum};padding:8px 12px;width:${COL_ACOM};text-align:center;">${escape(fmt(h.preciosPorAcomodacion[a] ?? 0))}</td>`,
            )
            .join("");

          const regimenFmt = formatRegimen(h.desayuno);
          const regimenLine = regimenFmt
            ? `<div style="font-size:11px;color:#4B4C7A;font-weight:600;margin-top:8px;">${escape(regimenFmt)}</div>`
            : "";
          const fechasHotelLine = hotelFechasLine(h);
          const notasHotelLine = renderNotasHTML(h.notas, h.notesImportant, h.notasList, STYLES.cellNote);
          const imagesHotelLine = renderImagesHTML(h.images);

          return `<tr style="page-break-inside:avoid;">
            <td style="${STYLES.td};padding:8px 12px;min-width:200px;">
              <div style="${STYLES.cellTitle}">${escape(h.nombre)}</div>
              ${regimenLine}
              ${fechasHotelLine}
              ${notasHotelLine}
              ${imagesHotelLine}
            </td>
            <td style="${STYLES.tdCenter};padding:8px 12px;width:${COL_CAT};white-space:nowrap;">${escape(h.estrellas || "—")}</td>
            <td style="${STYLES.td};padding:8px 12px;width:${COL_HAB};white-space:nowrap;">${escape(h.tipoHabitacion || "—")}</td>
            ${acomVals}
          </tr>`;
        })
        .join("");

      return locationHeader + hotelRows;
    })
    .join("");

  return `
  <div style="${STYLES.block}">
    ${sectionBar(T.alojamiento, C_TOT_ALOJAMIENTO)}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;table-layout:auto;">
      <thead>
        <tr>
          <th style="${STYLES.th};min-width:200px;">${escape(T.hotel)}</th>
          <th style="${STYLES.thCenter};width:${COL_CAT};white-space:nowrap;">${escape(T.categoria)}</th>
          <th style="${STYLES.th};width:${COL_HAB};white-space:nowrap;">${escape(T.tipoHab)}</th>
          ${acomCols}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function adicionalesTable(
  title: string,
  items: ServicioCalculado[],
  d: PropuestaData,
  barColor = COLOR_AZUL,
): string {
  if (d.isCalc) return "";
  if (items.length === 0) return "";
  const { T } = d;
  const ninosCount = d.cliente.ninos ?? 0;
  const showChdCol = ninosCount > 0;
  const hasCHD = d.acoms.some((a) => String(a) === "CHD");
  const onlyCHD = hasCHD && d.acoms.length === 1;
  const rows = items
    .map((s) => {
      const chdUnit = (s.preciosPorAcomodacion as Record<string, number>)["CHD"] ?? 0;
      const mainUnit = onlyCHD
        ? (chdUnit > 0 ? chdUnit : (s.unitAplicado ?? 0))
        : (s.unitAplicado ?? 0);
      const tipo =
        s.tipo === "vuelo"
          ? T.tipoVuelo
          : s.tipoServicio
            ? s.tipoServicio
            : s.tipo === "traslado"
              ? s.detalle?.includes("Privado")
                ? T.privado
                : T.regular
              : T.regular;

      const displayName =
        s.tipo === "traslado"
          ? personalizarNombreTraslado(
              formatTrasladoNombre(s.nombre),
              d.hoteles,
              d.personalizarTraslados,
            )
          : s.nombre;

      const ticketsLine = (() => {
        if (s.tipo !== "tour" || !s.tickets?.enabled || s.tickets.adultPrice <= 0) return "";
        const tk = s.tickets;
        const labelPart = tk.label ? `${escape(tk.label)} · ` : "";
        const adultPart = `${T.adultosCap} ${escape(fmt(tk.adultPrice))} PAX`;
        const childPart =
          tk.childPrice !== undefined && tk.childPrice > 0
            ? ` · ${T.ninosCap} ${escape(fmt(tk.childPrice))} PAX`
            : "";
        return `<div style="font-size:12px;color:#d97706;font-weight:500;margin-top:4px;">${escape(T.costoAdicionalEntradas)}: ${labelPart}${adultPart}${childPart}</div>`;
      })();

      const horarioLine =
        (s.tipo === "tour" || s.tipo === "catamaran") && s.horario
          ? `<div style="${STYLES.cellNote}">${escape(T.horario)}: ${escape(s.horario)}</div>`
          : "";

      const fechasCatamaranLine =
        s.tipo === "catamaran" && s.fechaInicio && s.fechaFin
          ? `<div style="${STYLES.cellNote}">Fechas: ${escape(fmtFecha(s.fechaInicio))} al ${escape(fmtFecha(s.fechaFin))}${s.noches ? ` · ${s.noches} noche${s.noches !== 1 ? "s" : ""}` : ""}</div>`
          : "";

      const notasLine = renderNotasHTML(s.notas, s.notesImportant, s.notasList, STYLES.cellNote);
      const imagesLine = renderImagesHTML(s.images);

      if (d.isCalc) {
        return `<tr style="page-break-inside:avoid;">
          <td style="${STYLES.td};width:65%;">
            <div style="${STYLES.cellTitle}">${escape(displayName)}</div>
            ${ticketsLine}
            ${fechasCatamaranLine}
            ${horarioLine}
            ${notasLine}
            ${imagesLine}
          </td>
          <td style="${STYLES.td};width:15%;">${escape(tipo)}</td>
          <td style="${STYLES.tdNum};width:20%;">${escape(fmt(s.unitAplicado ?? 0))}</td>
        </tr>`;
      }

      const chdCell = showChdCol
        ? `<td style="${STYLES.tdNum};width:10%;">${escape(fmt(chdUnit > 0 ? chdUnit : 0))}</td>`
        : `<td style="${STYLES.tdEmpty};width:10%;"></td>`;

      return `<tr style="page-break-inside:avoid;">
        <td style="${STYLES.td};width:${showChdCol ? "55%" : "65%"};">
          <div style="${STYLES.cellTitle}">${escape(displayName)}</div>
          ${ticketsLine}
          ${fechasCatamaranLine}
          ${horarioLine}
          ${notasLine}
          ${imagesLine}
        </td>
        <td style="${STYLES.td};width:15%;">${escape(tipo)}</td>
        <td style="${STYLES.tdNum};width:10%;">${escape(fmt(mainUnit))}</td>
        ${chdCell}
      </tr>`;
    })
    .join("");

  const itemTipo = items[0]?.tipo ?? "";
  const tarifaSub = itemTipo === "catamaran" ? "PAX/NOCHE" : "PAX";
  const tarifaSubDiv = `<div style="font-weight:400;color:#94a3b8;font-size:9px;margin-top:2px;line-height:1.2;white-space:nowrap;">${tarifaSub}</div>`;
  const tarifaHeaderHtml = onlyCHD ? escape("TARIFA CHD") : `TARIFA${tarifaSubDiv}`;
  const chdThHeader = showChdCol
    ? `<th style="${STYLES.thNum};width:10%;">CHD${tarifaSubDiv}</th>`
    : `<th style="${STYLES.thEmpty};width:10%;"></th>`;
  const thead = d.isCalc
    ? `<tr>
        <th style="${STYLES.th};width:65%;">${escape(T.descripcion)}</th>
        <th style="${STYLES.th};width:15%;">${escape(T.modalidad)}</th>
        <th style="${STYLES.thNum};width:20%;">${tarifaHeaderHtml}</th>
      </tr>`
    : `<tr>
        <th style="${STYLES.th};width:${showChdCol ? "55%" : "65%"};">${escape(T.descripcion)}</th>
        <th style="${STYLES.th};width:15%;">${escape(T.tipo)}</th>
        <th style="${STYLES.thNum};width:10%;">${tarifaHeaderHtml}</th>
        ${chdThHeader}
      </tr>`;

  return `
  <div style="${STYLES.block}">
    ${sectionBar(title, barColor)}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
      <thead>${thead}</thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function itinerarioTable(d: PropuestaData, barColor = C_TOT_ITINERARIO, barTextColor = "#ffffff"): string {
  if (d.itinerario.length === 0) return "";
  const { T } = d;
  const editAttrs = (dia: number) =>
    d.editable
      ? ` contenteditable="true" data-edit-actividad="${dia}" spellcheck="false" style="${STYLES.cellTitle};outline:none;border-radius:4px;padding:2px 4px;margin:-2px -4px;cursor:text;" title="Click para editar"`
      : ` style="${STYLES.cellTitle}"`;

  const rows = d.itinerario
    .map(
      (it) => `<tr style="page-break-inside:avoid;">
        <td style="padding:12px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;font-weight:700;color:${COLOR_AZUL};font-size:13px;width:50px;">${escape(it.dia)}</td>
        <td style="padding:12px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:${COLOR_LABEL};font-size:12px;white-space:nowrap;width:110px;">${escape(it.fecha ? fmtFecha(it.fecha) : "—")}</td>
        <td style="${STYLES.td}">
          <div${editAttrs(it.dia)}>${escape(it.actividad)}</div>
          ${
            d.incluirDescriptivos && it.esTour && it.horario
              ? `<div style="${STYLES.cellNote}">${escape(T.horario)}: ${escape(it.horario)}</div>`
              : ""
          }
        </td>
      </tr>`,
    )
    .join("");

  return `
  <div style="${STYLES.block}">
    ${sectionBar(T.itinerarioSugerido, barColor, barTextColor)}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="${STYLES.th};width:50px;">${escape(T.dia)}</th>
          <th style="${STYLES.th};width:110px;">${escape(T.fecha)}</th>
          <th style="${STYLES.th}">${escape(T.actividad)}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function descriptivosBlock(d: PropuestaData, barColor = C_TOT_DESCRIPTIVOS): string {
  if (!d.incluirDescriptivoCompleto || d.descriptivosTours.length === 0) {
    return "";
  }
  const { T, idioma } = d;

  const items = d.descriptivosTours
    .map((desc) => {
      const titulo = pickDesc(desc.titulo, desc.titulo_en, desc.titulo_pt, idioma) ?? desc.titulo;
      const parrafos = pickDescArr(desc.parrafos, desc.parrafos_en, desc.parrafos_pt, idioma) ?? [];
      const incluye = pickDesc(desc.incluye, desc.incluye_en, desc.incluye_pt, idioma);
      const observaciones = pickDesc(desc.observaciones, desc.observaciones_en, desc.observaciones_pt, idioma);
      const recomendaciones = pickDesc(desc.recomendaciones, desc.recomendaciones_en, desc.recomendaciones_pt, idioma);
      const nota = pickDesc(desc.notaImportante, desc.notaImportante_en, desc.notaImportante_pt, idioma);

      const infoBits: string[] = [];
      if (desc.info) infoBits.push(desc.info);
      if (desc.horarioExtra) infoBits.push(desc.horarioExtra);
      const infoLine = infoBits.length
        ? `<div style="font-size:11px;color:${COLOR_LABEL};margin:4px 0 10px;">${escape(infoBits.join(" · "))}</div>`
        : "";

      const parrafosHtml = parrafos
        .map(
          (p) =>
            `<p style="margin:0 0 8px;color:${COLOR_TEXTO};font-size:12px;line-height:1.5;">${escape(p)}</p>`,
        )
        .join("");

      const incluyeList = incluye
        ? `<div style="margin-top:10px;padding:10px 12px;background:#f0fdf4;border-left:3px solid ${COLOR_VERDE};border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:${COLOR_VERDE};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">${escape(T.incluye)}</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escapeML(incluye)}</div>
          </div>`
        : "";

      const obsHtml = observaciones
        ? `<div style="margin-top:8px;padding:10px 12px;background:#fff7ed;border-left:3px solid ${COLOR_NARANJA};border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:${COLOR_NARANJA};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">${escape(T.observacionesSub)}</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escapeML(observaciones)}</div>
          </div>`
        : "";

      const recHtml = recomendaciones
        ? `<div style="margin-top:8px;padding:10px 12px;background:#f9f0f5;border-left:3px solid ${COLOR_AZUL};border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:${COLOR_AZUL};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">${escape(T.recomendaciones)}</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escapeML(recomendaciones)}</div>
          </div>`
        : "";

      const notaHtml = nota
        ? `<div style="margin-top:8px;padding:10px 12px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:#dc2626;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">${escape(T.notaImportante)}</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escapeML(nota)}</div>
          </div>`
        : "";

      return `<div style="padding:18px 0;border-bottom:1px solid ${COLOR_BORDE};">
        <div style="font-weight:bold;color:${COLOR_AZUL};font-size:14px;line-height:1.3;">${escape(titulo)}</div>
        ${infoLine}
        ${parrafosHtml}
        ${incluyeList}
        ${obsHtml}
        ${recHtml}
        ${notaHtml}
      </div>`;
    })
    .join("");

  return `
  <div style="${STYLES.block}">
    ${sectionBar(T.descriptivos, barColor)}
    <div style="margin-top:6px;">${items}</div>
  </div>`;
}

function buildTotalesView(d: PropuestaData): string {
  const { T } = d;

  const tdBase = `padding:9px 14px;border-top:1px solid ${COLOR_BORDE};color:${COLOR_TEXTO};font-size:12px;vertical-align:middle;`;
  const tdNum = `${tdBase}text-align:right;font-weight:600;`;
  const tdCtr = `${tdBase}text-align:center;`;

  let html = "";

  // ── 1. ALOJAMIENTO ──────────────────────────────────────────────
  if (d.hoteles.length > 0) {
    const groups = groupByLocation(d.hoteles);
    let rows = "";
    for (const { label, items } of groups) {
      rows += `<tr style="page-break-inside:avoid;">
        <td colspan="8" style="padding:8px 12px;background:#EEF1F8;border-top:1px solid #D8DFF0;border-bottom:1px solid #D8DFF0;">
          <div style="font-size:11px;font-weight:700;color:#363765;letter-spacing:1px;text-transform:uppercase;">${escape(label)}</div>
        </td>
      </tr>`;
      for (const h of items) {
        const hotelNoches = h.noches ?? d.cliente.noches ?? 1;
        const validAcoms = d.acoms.filter((a) => (h.preciosPorAcomodacion[a] ?? 0) > 0);
        // Add CHD row when there are children and CHD is not already included.
        const hotelNinos = d.cliente.ninos ?? 0;
        const chdKey = "CHD" as Acomodacion;
        if (hotelNinos > 0 && !validAcoms.some((a) => String(a).toUpperCase() === "CHD") && (h.preciosPorAcomodacion[chdKey] ?? 0) > 0) {
          validAcoms.push(chdKey);
        }
        for (const a of validAcoms) {
          const tarifa = h.preciosPorAcomodacion[a];
          const pax =
            String(a).toUpperCase() === "CHD"
              ? (d.cliente.ninos ?? 0)
              : d.result.pasajeros;
          const total = h.totalesPorAcomodacion[a];
          const regimenFmt = formatRegimen(h.desayuno);
          const regimenLine = regimenFmt
            ? `<div style="font-size:11px;color:#4B4C7A;font-weight:600;margin-top:4px;">${escape(regimenFmt)}</div>`
            : "";
          const fechaHotelLine = hotelFechasLine(h, STYLES.cellNote);
          const notasHotelLines = renderNotasHTML(h.notas, h.notesImportant, h.notasList, STYLES.cellNote);
          const imagesHotelLines = renderImagesHTML(h.images);
          rows += `<tr style="page-break-inside:avoid;">
            <td style="${tdBase};font-weight:600;width:30%;">${escape(h.nombre)}${regimenLine}${fechaHotelLine}${notasHotelLines}${imagesHotelLines}</td>
            <td style="${tdCtr};width:9%;">${escape(h.estrellas || "—")}</td>
            <td style="${tdBase};width:11%;">${escape(h.tipoHabitacion || "—")}</td>
            <td style="${tdCtr};width:8%;font-weight:700;color:#475569;">${escape(String(a))}</td>
            <td style="${tdNum};width:11%;">${escape(fmt(tarifa))}</td>
            <td style="${tdCtr};width:6%;">${escape(String(pax))}</td>
            <td style="${tdCtr};width:6%;">${escape(String(hotelNoches))}</td>
            <td style="${tdNum};width:15%;color:${C_TOT_ALOJAMIENTO};">${escape(fmt(total))}</td>
          </tr>`;
        }
      }
    }
    html += `
    <div style="${STYLES.block}">
      ${sectionBar(T.alojamiento, C_TOT_ALOJAMIENTO)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="${STYLES.th};width:30%;">${escape(T.hotel)}</th>
            <th style="${STYLES.thCenter};width:9%;">${escape(T.categoria)}</th>
            <th style="${STYLES.th};width:11%;">${escape(T.tipoHab)}</th>
            <th style="${STYLES.thCenter};width:8%;">${escape(T.acom)}</th>
            <th style="${STYLES.thNum};width:11%;">TARIFA<div style="font-weight:400;color:#94a3b8;font-size:9px;margin-top:2px;line-height:1.2;white-space:nowrap;">PAX/NOCHE</div></th>
            <th style="${STYLES.thCenter};width:6%;">${escape(T.pax)}</th>
            <th style="${STYLES.thCenter};width:6%;">${escape(T.noc)}</th>
            <th style="${STYLES.thNum};width:15%;color:${C_TOT_ALOJAMIENTO};">${escape(T.total)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  // ── 2. SERVICE SECTIONS ─────────────────────────────────────────
  const hasCHDTot = d.acoms.some((a) => String(a) === "CHD");
  const onlyCHDTot = hasCHDTot && d.acoms.length === 1;
  const showChdColTot = (d.cliente.ninos ?? 0) > 0;

  const serviceSectionHtml = (
    color: string,
    label: string,
    items: ServicioCalculado[],
    getTipo: (s: ServicioCalculado) => string,
    getName: (s: ServicioCalculado) => string,
  ): string => {
    if (items.length === 0) return "";
    let rows = "";
    for (const s of items) {
      const pax = s.paxAplicados ?? d.result.pasajeros;
      const total = s.totalesPorAcomodacion[d.primary];
      const chdUnit = (s.preciosPorAcomodacion as Record<string, number>)["CHD"] ?? 0;
      const mainUnit = onlyCHDTot
        ? (chdUnit > 0 ? chdUnit : (s.unitAplicado ?? 0))
        : (s.unitAplicado ?? 0);
      const ticketsLine = (() => {
        if (s.tipo !== "tour" || !s.tickets?.enabled || s.tickets.adultPrice <= 0) return "";
        const tk = s.tickets;
        const labelPart = tk.label ? `${escape(tk.label)} · ` : "";
        const adultPart = `${T.adultosCap} ${escape(fmt(tk.adultPrice))} PAX`;
        const childPart =
          tk.childPrice !== undefined && tk.childPrice > 0
            ? ` · ${T.ninosCap} ${escape(fmt(tk.childPrice))} PAX`
            : "";
        return `<div style="font-size:12px;color:#d97706;font-weight:500;margin-top:4px;">${escape(T.costoAdicionalEntradas)}: ${labelPart}${adultPart}${childPart}</div>`;
      })();
      const notasLine = renderNotasHTML(s.notas, s.notesImportant, s.notasList, STYLES.cellNote);
      const imagesLineTot = renderImagesHTML(s.images);
      const chdTotCell = showChdColTot
        ? `<td style="${tdNum};width:10%;">${escape(fmt(chdUnit > 0 ? chdUnit : 0))}</td>`
        : "";
      rows += `<tr style="page-break-inside:avoid;">
        <td style="${tdBase};width:${showChdColTot ? "43%" : "48%"};font-weight:600;">${escape(getName(s))}${ticketsLine}${notasLine}${imagesLineTot}</td>
        <td style="${tdBase};width:${showChdColTot ? "15%" : "17%"};">${escape(getTipo(s))}</td>
        <td style="${tdNum};width:${showChdColTot ? "10%" : "13%"};">${escape(fmt(mainUnit))}</td>
        ${chdTotCell}
        <td style="${tdCtr};width:8%;">${escape(String(pax))}</td>
        <td style="${tdNum};width:14%;color:${color};">${escape(fmt(total))}</td>
      </tr>`;
    }
    const totSubDiv = `<div style="font-weight:400;color:#94a3b8;font-size:9px;margin-top:2px;line-height:1.2;white-space:nowrap;">PAX</div>`;
    const tarifaHeaderTotHtml = onlyCHDTot ? escape("TARIFA CHD") : `TARIFA${totSubDiv}`;
    const chdThTot = showChdColTot
      ? `<th style="${STYLES.thNum};width:10%;">CHD${totSubDiv}</th>`
      : "";
    return `
    <div style="${STYLES.block}">
      ${sectionBar(label, color)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="${STYLES.th};width:${showChdColTot ? "43%" : "48%"};">${escape(T.descripcion)}</th>
            <th style="${STYLES.th};width:${showChdColTot ? "15%" : "17%"};">${escape(T.modalidad)}</th>
            <th style="${STYLES.thNum};width:${showChdColTot ? "10%" : "13%"};">${tarifaHeaderTotHtml}</th>
            ${chdThTot}
            <th style="${STYLES.thCenter};width:8%;">${escape(T.pax)}</th>
            <th style="${STYLES.thNum};width:14%;color:${color};">${escape(T.total)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  };

  html += serviceSectionHtml(
    C_TOT_TRASLADOS, T.traslados, d.traslados,
    (s) => s.tipoServicio ?? (s.detalle?.includes("Privado") ? T.privado : T.regular),
    (s) => formatTrasladoNombre(s.nombre),
  );
  html += serviceSectionHtml(
    C_TOT_TOURS, T.toursYExperiencias, d.tours,
    (s) => s.tipoServicio ?? T.regular,
    (s) => s.nombre,
  );
  html += serviceSectionHtml(
    C_TOT_VUELOS, T.vuelos, d.vuelos,
    () => T.tipoVuelo,
    (s) => s.nombre,
  );

  // ── 3. TOTALES ──────────────────────────────────────────────────
  if (d.isGrupo) {
    html += grupoDetalleBlock(d);
  } else {
    const totalLabelStyle = `padding:14px 20px;border-top:2px solid ${COLOR_AZUL};font-weight:700;color:${COLOR_AZUL};font-size:14px;text-transform:uppercase;letter-spacing:0.5px;background:#f0f4ff;`;
    const totalValStyle = `padding:14px 20px;border-top:2px solid ${COLOR_AZUL};text-align:right;font-weight:800;color:${COLOR_AZUL};font-size:16px;background:#f0f4ff;`;
    const totalRows = d.acoms
      .map(
        (a) => `<tr>
          <td style="${totalLabelStyle}">${escape(String(a))}</td>
          <td style="${totalValStyle}">${escape(fmt(d.result.totalesPorAcomodacion[a]))}</td>
        </tr>`,
      )
      .join("");

    html += `
    <div style="${STYLES.block}">
      ${sectionBar(T.totalesSegunAcomodacion)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#ffffff;border-collapse:collapse;border:2px solid ${COLOR_AZUL};border-radius:4px;">
        <tfoot>${totalRows}</tfoot>
      </table>
    </div>`;
  }

  // ── 4. OBSERVACIONES ────────────────────────────────────────────
  html += observacionesBlock(d, C_TOT_OBSERVACIONES);

  // ── 5. ITINERARIO ───────────────────────────────────────────────
  html += itinerarioTable(d, C_TOT_ITINERARIO, "#ffffff");

  // ── 6. DESCRIPTIVOS ─────────────────────────────────────────────
  html += descriptivosBlock(d, C_TOT_DESCRIPTIVOS);

  return html;
}

// ─── PACKAGE VIEW ─────────────────────────────────────────────────────────────

function buildPackageView(d: PropuestaData): string {
  const C_BLUE    = "#334196";
  const C_DARK    = "#041941";
  const C_BORDER  = "#e2e8f0";
  const C_HDR_BG  = "#f5f7fb";
  const C_SEP_BG  = "#eef2f8";
  const C_LBL     = "#64748b";
  const C_PRICE_BG = "#eef2f8";

  // ── 1. GROUPED INCLUSION BLOCK ────────────────────────────────────────────
  const C_INCL_CAT  = "#334196";
  const C_INCL_DIV  = "#e5eaf2";

  function inclCatGroup(title: string, rows: string[]): string {
    if (!rows.length) return "";
    const itemRows = rows.map((r) =>
      `<tr><td style="padding:4px 14px 5px 20px;font-size:13px;color:${C_DARK};">` +
      `<span style="color:${C_INCL_CAT};font-weight:700;margin-right:8px;">&#10003;</span>${escape(r)}</td></tr>`,
    ).join("");
    return (
      `<tr><td style="padding:9px 14px 5px 14px;font-size:10px;font-weight:700;` +
      `color:${C_INCL_CAT};text-transform:uppercase;letter-spacing:0.7px;` +
      `border-top:1px solid ${C_INCL_DIV};">${escape(title)}</td></tr>` +
      itemRows
    );
  }

  const alojaInclItems: string[] = [];
  d.hoteles.forEach((h) => {
    const parts: string[] = [];
    if (h.noches) parts.push(`${h.noches} ${h.noches === 1 ? "noche" : "noches"}`);
    parts.push(h.nombre);
    const reg = formatRegimen(h.desayuno);
    if (reg) parts.push(reg);
    alojaInclItems.push(parts.join(" | "));
  });

  const trasladoInclItems = d.traslados.map((t) =>
    personalizarNombreTraslado(formatTrasladoNombre(t.nombre), d.hoteles, d.personalizarTraslados),
  );
  const tourInclItems = [...d.tours, ...d.catamarans].map((s) => s.nombre);
  const vueloInclItems = d.vuelos.map((v) => v.nombre);

  const inclRows = [
    inclCatGroup("Alojamiento", alojaInclItems),
    inclCatGroup("Traslados", trasladoInclItems),
    inclCatGroup("Tours y Experiencias", tourInclItems),
    inclCatGroup("Vuelos", vueloInclItems),
  ].join("");

  const inclusionBlock = inclRows
    ? `<div style="margin-bottom:20px;">
        ${sectionBar("Incluye", C_TOT_ALOJAMIENTO)}
        <table cellpadding="0" cellspacing="0" border="0" width="100%"
          style="width:100%;border-collapse:collapse;border:1px solid ${C_BORDER};border-top:none;background:#ffffff;">
          <tbody>
            <tr><td style="padding:8px 14px 3px 14px;"></td></tr>
            ${inclRows}
            <tr><td style="padding:5px 14px 10px 14px;"></td></tr>
          </tbody>
        </table>
      </div>`
    : "";

  // ── 2. OPCIONES DE ALOJAMIENTO ────────────────────────────────────────────
  const acoms = d.acoms;
  const nAcoms = acoms.length;

  /** Sub-header row spanning all acom columns (colspan = nAcoms). */
  function subHeader(text: string, bg = C_HDR_BG): string {
    return (
      `<tr><td colspan="${nAcoms}" style="padding:7px 14px 7px 24px;font-size:10px;font-weight:700;` +
      `color:${C_DARK};text-transform:uppercase;letter-spacing:0.6px;` +
      `background:${bg};border-top:1px solid ${C_BORDER};border-bottom:1px solid ${C_BORDER};">` +
      `${escape(text)}</td></tr>`
    );
  }

  /** Noche-adicional cells (normal weight, muted style). */
  function nocheCells(totales: Record<string, number>): string {
    return acoms
      .map(
        (a) =>
          `<td style="padding:9px 12px;text-align:center;border-right:1px solid ${C_BORDER};vertical-align:middle;">` +
          `<div style="font-size:9px;font-weight:700;color:${C_LBL};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;">${escape(String(a))}</div>` +
          `<div style="font-size:13px;font-weight:700;color:${C_DARK};">USD ${escape(fmt(totales[a] ?? 0))}</div>` +
          `</td>`,
      )
      .join("");
  }

  /** Precio-final cells (large, bold, prominent). */
  function precioCells(totales: Record<string, number>): string {
    return acoms
      .map(
        (a) =>
          `<td style="padding:12px;text-align:center;border-right:1px solid ${C_BORDER};vertical-align:middle;background:${C_PRICE_BG};">` +
          `<div style="font-size:9px;font-weight:700;color:${C_LBL};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px;">${escape(String(a))}</div>` +
          `<div style="font-size:17px;font-weight:800;color:${C_DARK};">USD ${escape(fmt(totales[a] ?? 0))}</div>` +
          `</td>`,
      )
      .join("");
  }

  let hotelBlock = "";

  if (d.hoteles.length > 0) {
    const numOpciones = d.opcionesHoteleras?.length ?? 1;

    const thBase = `padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:${C_LBL};` +
      `text-transform:uppercase;letter-spacing:0.6px;background:${C_HDR_BG};` +
      `border-bottom:2px solid ${C_BORDER};border-right:1px solid ${C_BORDER};`;
    const thPrice = `padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:${C_DARK};` +
      `text-transform:uppercase;letter-spacing:0.6px;background:${C_PRICE_BG};` +
      `border-bottom:2px solid ${C_BORDER};`;

    const ninosPkg = d.cliente.ninos ?? 0;

    if (numOpciones <= 1) {
      // ── Single option: table WITHOUT Opción column ──────────────────────
      const opHoteles = d.opcionesHoteleras?.[0]?.hoteles ?? d.hoteles;
      const opTotales = (d.opcionesHoteleras?.[0]?.totalesPorAcomodacion ?? d.result.totalesPorAcomodacion) as Record<string, number>;
      const nHoteles = opHoteles.length;

      const chdPriceTotal = ninosPkg > 0
        ? opHoteles.reduce((sum, h) => {
            const rate = (h.preciosPorAcomodacion as Record<string, number>)["CHD"] ?? 0;
            return sum + rate * (h.noches ?? 0) * ninosPkg;
          }, 0)
        : 0;

      const chdPriceLine = ninosPkg > 0 && chdPriceTotal > 0
        ? `<div style="white-space:nowrap;line-height:2.2;">` +
          `<span style="font-weight:700;color:${C_LBL};font-size:10px;text-transform:uppercase;width:36px;display:inline-block;">CHD:</span>` +
          ` <span style="font-size:15px;font-weight:800;color:${C_DARK};">USD ${escape(fmt(chdPriceTotal))}</span>` +
          `</div>`
        : "";

      const priceLinesHtml = acoms.map((a) =>
        `<div style="white-space:nowrap;line-height:2.2;">` +
        `<span style="font-weight:700;color:${C_LBL};font-size:10px;text-transform:uppercase;width:36px;display:inline-block;">${escape(String(a))}:</span>` +
        ` <span style="font-size:15px;font-weight:800;color:${C_DARK};">USD ${escape(fmt(opTotales[String(a)] ?? 0))}</span>` +
        `</div>`
      ).join("") + chdPriceLine;

      const dataRows = opHoteles.map((h, idx) => {
        const regimenFmt = formatRegimen(h.desayuno);
        const notasHtml = renderNotasHTML(h.notas, h.notesImportant, h.notasList);
        const imagesHtml = renderImagesHTML(h.images);
        const rowBg = idx % 2 === 0 ? "#ffffff" : C_HDR_BG;
        const isFirst = idx === 0;
        const rowspanAttr = nHoteles > 1 ? ` rowspan="${nHoteles}"` : "";

        const chdRate = (h.preciosPorAcomodacion as Record<string, number>)["CHD"] ?? 0;
        const chdNocheLine = ninosPkg > 0 && chdRate > 0
          ? `<div style="line-height:2.0;">` +
            `<span style="font-weight:700;color:${C_LBL};font-size:10px;text-transform:uppercase;width:36px;display:inline-block;">CHD:</span>` +
            ` USD ${escape(fmt(chdRate))}</div>`
          : "";

        const nocheLinesHtml = acoms.map((a) =>
          `<div style="line-height:2.0;">` +
          `<span style="font-weight:700;color:${C_LBL};font-size:10px;text-transform:uppercase;width:36px;display:inline-block;">${escape(String(a))}:</span>` +
          ` USD ${escape(fmt(h.preciosPorAcomodacion[a] ?? 0))}</div>`
        ).join("") + chdNocheLine;

        return `<tr style="background:${rowBg};page-break-inside:avoid;">
          <td style="padding:12px 14px;border-bottom:1px solid ${C_BORDER};border-right:1px solid ${C_BORDER};vertical-align:top;">
            <div style="font-weight:600;font-size:13px;color:${C_DARK};">${escape(h.nombre)}</div>
            ${h.estrellas ? `<div style="font-size:11px;color:${C_LBL};">${escape(h.estrellas)}</div>` : ""}
            ${h.ubicacion ? `<div style="font-size:11px;color:${C_LBL};">${escape(h.ubicacion)}</div>` : ""}
            ${regimenFmt ? `<div style="font-size:11px;color:${C_BLUE};font-weight:600;margin-top:2px;">${escape(regimenFmt)}</div>` : ""}
            ${hotelFechasLine(h, `font-size:11px;color:#64748B;font-style:italic;margin-top:3px;`)}
            ${notasHtml}
            ${imagesHtml}
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid ${C_BORDER};border-right:1px solid ${C_BORDER};vertical-align:top;">${nocheLinesHtml}</td>
          ${isFirst ? `<td${rowspanAttr} style="padding:12px 14px;border-bottom:1px solid ${C_BORDER};vertical-align:middle;background:${C_PRICE_BG};">${priceLinesHtml}</td>` : ""}
        </tr>`;
      }).join("");

      hotelBlock = `
      <div style="margin-bottom:20px;">
        ${sectionBar("Alojamiento", C_TOT_ALOJAMIENTO)}
        <table cellpadding="0" cellspacing="0" border="0" width="100%"
          style="width:100%;border-collapse:collapse;border:1px solid ${C_BORDER};border-top:none;">
          <thead>
            <tr>
              <th style="${thBase}width:40%;">Alojamiento</th>
              <th style="${thBase}width:25%;">Noche adicional</th>
              <th style="${thPrice}width:35%;">Precio total</th>
            </tr>
          </thead>
          <tbody>${dataRows}</tbody>
        </table>
      </div>`;

    } else {
      // ── Multi option: grouped table with Opción column + rowspan ────────
      const BLOCK_COLORS = ["#f5f8ff", "#fafafa"];

      const dataRows = d.opcionesHoteleras!.map((op, opIdx) => {
        const blockBg = BLOCK_COLORS[opIdx % 2];
        const opTotales = op.totalesPorAcomodacion as Record<string, number>;
        const nHoteles = op.hoteles.length;
        const rowspanAttr = nHoteles > 1 ? ` rowspan="${nHoteles}"` : "";

        const opChdPriceTotal = ninosPkg > 0
          ? op.hoteles.reduce((sum, h) => {
              const rate = (h.preciosPorAcomodacion as Record<string, number>)["CHD"] ?? 0;
              return sum + rate * (h.noches ?? 0) * ninosPkg;
            }, 0)
          : 0;

        const opChdPriceLine = ninosPkg > 0 && opChdPriceTotal > 0
          ? `<div style="white-space:nowrap;line-height:2.2;">` +
            `<span style="font-weight:700;color:${C_LBL};font-size:10px;text-transform:uppercase;width:36px;display:inline-block;">CHD:</span>` +
            ` <span style="font-size:15px;font-weight:800;color:${C_DARK};">USD ${escape(fmt(opChdPriceTotal))}</span>` +
            `</div>`
          : "";

        const priceLinesHtml = acoms.map((a) =>
          `<div style="white-space:nowrap;line-height:2.2;">` +
          `<span style="font-weight:700;color:${C_LBL};font-size:10px;text-transform:uppercase;width:36px;display:inline-block;">${escape(String(a))}:</span>` +
          ` <span style="font-size:15px;font-weight:800;color:${C_DARK};">USD ${escape(fmt(opTotales[String(a)] ?? 0))}</span>` +
          `</div>`
        ).join("") + opChdPriceLine;

        return op.hoteles.map((h, hIdx) => {
          const isFirst = hIdx === 0;
          const isLast = hIdx === nHoteles - 1;
          const regimenFmt = formatRegimen(h.desayuno);
          const notasHtml = renderNotasHTML(h.notas, h.notesImportant, h.notasList);
          const imagesHtml = renderImagesHTML(h.images);
          const rowBorderBottom = isLast
            ? `border-bottom:2px solid ${C_BORDER};`
            : `border-bottom:1px dashed ${C_BORDER};`;

          const hChdRate = (h.preciosPorAcomodacion as Record<string, number>)["CHD"] ?? 0;
          const hChdNocheLine = ninosPkg > 0 && hChdRate > 0
            ? `<div style="line-height:2.0;">` +
              `<span style="font-weight:700;color:${C_LBL};font-size:10px;text-transform:uppercase;width:36px;display:inline-block;">CHD:</span>` +
              ` USD ${escape(fmt(hChdRate))}</div>`
            : "";

          const nocheLinesHtml = acoms.map((a) =>
            `<div style="line-height:2.0;">` +
            `<span style="font-weight:700;color:${C_LBL};font-size:10px;text-transform:uppercase;width:36px;display:inline-block;">${escape(String(a))}:</span>` +
            ` USD ${escape(fmt(h.preciosPorAcomodacion[a] ?? 0))}</div>`
          ).join("") + hChdNocheLine;

          return `<tr style="background:${blockBg};page-break-inside:avoid;">
            ${isFirst ? `<td${rowspanAttr} style="padding:12px 14px;border-bottom:2px solid ${C_BORDER};border-right:1px solid ${C_BORDER};vertical-align:middle;background:${blockBg};white-space:nowrap;">
              <div style="font-weight:700;color:${C_BLUE};font-size:13px;">${escape(op.nombre)}</div>
            </td>` : ""}
            <td style="padding:12px 14px;${rowBorderBottom}border-right:1px solid ${C_BORDER};vertical-align:top;background:${blockBg};">
              <div style="font-weight:600;font-size:13px;color:${C_DARK};">${escape(h.nombre)}</div>
              ${h.estrellas ? `<div style="font-size:11px;color:${C_LBL};">${escape(h.estrellas)}</div>` : ""}
              ${regimenFmt ? `<div style="font-size:11px;color:${C_BLUE};font-weight:600;margin-top:2px;">${escape(regimenFmt)}</div>` : ""}
              ${hotelFechasLine(h, `font-size:11px;color:#64748B;font-style:italic;margin-top:3px;`)}
              ${notasHtml}
              ${imagesHtml}
            </td>
            <td style="padding:12px 14px;${rowBorderBottom}border-right:1px solid ${C_BORDER};vertical-align:top;background:${blockBg};">${nocheLinesHtml}</td>
            ${isFirst ? `<td${rowspanAttr} style="padding:12px 14px;border-bottom:2px solid ${C_BORDER};vertical-align:middle;background:${C_PRICE_BG};">${priceLinesHtml}</td>` : ""}
          </tr>`;
        }).join("");
      }).join("");

      hotelBlock = `
      <div style="margin-bottom:20px;">
        ${sectionBar("Opciones de alojamiento", C_TOT_ALOJAMIENTO)}
        <table cellpadding="0" cellspacing="0" border="0" width="100%"
          style="width:100%;border-collapse:collapse;border:1px solid ${C_BORDER};border-top:none;">
          <thead>
            <tr>
              <th style="${thBase}width:9%;">Opci&#243;n</th>
              <th style="${thBase}width:31%;">Alojamiento</th>
              <th style="${thBase}width:25%;">Noche adicional</th>
              <th style="${thPrice}width:35%;">Precio total</th>
            </tr>
          </thead>
          <tbody>${dataRows}</tbody>
        </table>
      </div>`;
    }
  }

  // ── Compose ───────────────────────────────────────────────────────────────
  let html = inclusionBlock + hotelBlock;
  html += observacionesBlock(d, C_TOT_OBSERVACIONES);
  html += itinerarioTable(d, C_TOT_ITINERARIO, "#ffffff");
  html += descriptivosBlock(d, C_TOT_DESCRIPTIVOS);
  return html;
}

function grupoDetalleBlock(d: PropuestaData): string {
  if (!d.isGrupo) return "";
  const C_DARK = "#041941";
  const C_BLUE = "#1E3A8A";
  const C_BORDER = "#e2e8f0";
  const C_HDR_BG = "#f0f4ff";

  const ROOM_PAX: Partial<Record<Acomodacion, number>> = { SGL: 1, DBL: 2, TPL: 3, QDL: 4 };
  const rp = (a: Acomodacion) => ROOM_PAX[a] ?? 1;

  const roomAcoms = (["SGL", "DBL", "TPL", "QDL"] as Acomodacion[]).filter(
    (a) => d.acoms.includes(a) && (d.grupoHabitacionesPorAcom[a] ?? 0) > 0,
  );

  // ── Fallback: no room distribution configured — show per-acom totals from result ──
  if (roomAcoms.length === 0 && d.grupoNinos === 0) {
    const acoms = d.acoms.filter(
      (a) => (["SGL", "DBL", "TPL", "QDL"] as Acomodacion[]).includes(a as Acomodacion),
    );
    if (acoms.length === 0) return "";

    const thStyle = `padding:9px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#64748b;background:${C_HDR_BG};border-bottom:1px solid ${C_BORDER};text-align:left;`;
    const tdStyle = `padding:10px 14px;font-size:13px;color:${C_DARK};border-bottom:1px solid ${C_BORDER};vertical-align:middle;`;
    const tdRightStyle = `padding:10px 14px;font-size:13px;font-weight:700;color:${C_BLUE};border-bottom:1px solid ${C_BORDER};vertical-align:middle;text-align:right;`;

    const fallbackRows = acoms.map((a) => {
      const total = d.result.totalesPorAcomodacion[a] ?? 0;
      return `<tr>
        <td style="${tdStyle}">
          <span style="display:inline-block;background:#e8eeff;color:${C_BLUE};padding:3px 10px;border-radius:5px;font-size:12px;font-weight:800;letter-spacing:0.5px;">${escape(String(a))}</span>
        </td>
        <td style="${tdRightStyle}">USD ${escape(fmt(total))}</td>
      </tr>`;
    }).join("");

    return `
    <div style="margin-bottom:20px;">
      ${sectionBar("Totalizado", C_TOT_ALOJAMIENTO)}
      <div style="border:1px solid ${C_BORDER};border-top:none;background:#ffffff;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="${thStyle}width:40%;">Acomodación</th>
              <th style="${thStyle}width:60%;text-align:right;">Total estimado por persona</th>
            </tr>
          </thead>
          <tbody>${fallbackRows}</tbody>
        </table>
        <div style="padding:22px 24px;text-align:center;background:#ffffff;border-top:1px solid ${C_BORDER};">
          <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Total del Grupo</div>
          <div style="font-size:34px;font-weight:800;color:${C_DARK};letter-spacing:-0.5px;">USD ${escape(fmt(d.grupoTotal))}</div>
        </div>
      </div>
    </div>`;
  }

  // ── Per-accommodation hotel totals: rate × (rooms × paxPerRoom) × noches ──
  // Non-hotel services (traslados, tours, vuelos, catamaran) are NOT included here;
  // they roll up into d.grupoTotal via calcGrupoTotalFromResult.
  const acTotals: Partial<Record<Acomodacion, number>> = {};
  for (const a of roomAcoms) {
    const rooms = d.grupoHabitacionesPorAcom[a] ?? 0;
    const paxForAcom = rooms * rp(a);
    let total = 0;
    for (const svc of d.result.servicios) {
      if (svc.tipo === "hotel") {
        const rate = svc.preciosPorAcomodacion[a] ?? 0;
        total += rate * paxForAcom * (svc.noches ?? 0);
      }
    }
    acTotals[a] = total;
  }

  const totalHabs = roomAcoms.reduce((s, a) => s + (d.grupoHabitacionesPorAcom[a] ?? 0), 0);
  const adultosPax = roomAcoms.reduce((s, a) => s + (d.grupoHabitacionesPorAcom[a] ?? 0) * rp(a), 0);
  const totalPax = adultosPax + d.grupoNinos;

  // ── Table styles ──────────────────────────────────────────────
  const thStyle = `padding:9px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#64748b;background:${C_HDR_BG};border-bottom:1px solid ${C_BORDER};text-align:left;`;
  const tdStyle = `padding:10px 14px;font-size:13px;color:${C_DARK};border-bottom:1px solid ${C_BORDER};vertical-align:middle;`;
  const tdRightStyle = `padding:10px 14px;font-size:13px;font-weight:700;color:${C_BLUE};border-bottom:1px solid ${C_BORDER};vertical-align:middle;text-align:right;`;

  const dataRows = roomAcoms.map((a) => {
    const hab = d.grupoHabitacionesPorAcom[a] ?? 0;
    const pax = hab * rp(a);
    const total = acTotals[a] ?? 0;
    return `<tr>
      <td style="${tdStyle}">
        <span style="display:inline-block;background:#e8eeff;color:${C_BLUE};padding:3px 10px;border-radius:5px;font-size:12px;font-weight:800;letter-spacing:0.5px;">${escape(String(a))}</span>
      </td>
      <td style="${tdStyle}">${escape(String(hab))} hab</td>
      <td style="${tdStyle}">${escape(String(pax))} pax</td>
      <td style="${tdRightStyle}">USD ${escape(fmt(total))}</td>
    </tr>`;
  }).join("");

  return `
  <div style="margin-bottom:20px;">
    ${sectionBar("Detalle del Grupo", C_TOT_ALOJAMIENTO)}
    <div style="border:1px solid ${C_BORDER};border-top:none;background:#ffffff;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="${thStyle}width:18%;">Acomodación</th>
            <th style="${thStyle}width:22%;">Habitaciones</th>
            <th style="${thStyle}width:20%;">Pax</th>
            <th style="${thStyle}width:40%;text-align:right;">Tarifa por acomodación</th>
          </tr>
        </thead>
        <tbody>${dataRows}</tbody>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;border-top:1px solid ${C_BORDER};background:#f8faff;">
        <tr>
          <td style="padding:10px 14px;font-size:12px;color:#64748b;width:50%;">
            Total habitaciones: <strong style="color:${C_DARK};">${totalHabs}</strong>
          </td>
          <td style="padding:10px 14px;font-size:12px;color:#64748b;width:50%;">
            Total pasajeros: <strong style="color:${C_DARK};">${totalPax}</strong>
          </td>
        </tr>
      </table>
      <div style="padding:22px 24px;text-align:center;background:#ffffff;border-top:1px solid ${C_BORDER};">
        <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Total del Grupo</div>
        <div style="font-size:34px;font-weight:800;color:${C_DARK};letter-spacing:-0.5px;">USD ${escape(fmt(d.grupoTotal))}</div>
      </div>
    </div>
  </div>`;
}

function buildGrupoPackageView(d: PropuestaData): string {
  const C_BLUE = "#334196";
  const C_DARK = "#041941";
  const C_BORDER = "#e2e8f0";
  const TICK = `<span style="color:${C_BLUE};font-weight:800;margin-right:7px;">&#10003;</span>`;

  const includeItems: string[] = [];
  if (d.hoteles.length > 0) includeItems.push("Hotel");
  if (d.traslados.length > 0) includeItems.push("Traslados");
  if (d.tours.length > 0 || d.catamarans.length > 0) includeItems.push("Tours");
  if (d.vuelos.length > 0) includeItems.push("Vuelos");

  const checkTd = (text: string) =>
    `<tr><td style="padding:10px 14px;font-size:14px;color:${C_DARK};border-bottom:1px solid ${C_BORDER};">${TICK}${escape(text)}</td></tr>`;

  const inclusionBlock = includeItems.length
    ? `<div style="margin-bottom:20px;">
        ${sectionBar("Incluye", C_TOT_ALOJAMIENTO)}
        <table cellpadding="0" cellspacing="0" border="0" width="100%"
          style="width:100%;border-collapse:collapse;border:1px solid ${C_BORDER};border-top:none;background:#ffffff;">
          <tbody>${includeItems.map(checkTd).join("")}</tbody>
        </table>
      </div>`
    : "";

  let html = inclusionBlock;
  html += grupoDetalleBlock(d);
  html += observacionesBlock(d, C_TOT_OBSERVACIONES);
  html += itinerarioTable(d, C_TOT_ITINERARIO, "#ffffff");
  html += descriptivosBlock(d, C_TOT_DESCRIPTIVOS);
  return html;
}

function observacionesBlock(d: PropuestaData, barColor = C_TOT_OBSERVACIONES, barTextColor = C_TOT_OBSERVACIONES_TEXT): string {
  if (!d.observaciones || d.observaciones.length === 0) return "";
  const { T } = d;
  const items = d.observaciones
    .map(
      (o) =>
        `<tr><td style="padding:7px 14px 7px 16px;color:#041941;font-size:12px;line-height:1.6;border-left:3px solid #F1D45A;border-bottom:1px solid #F1D45A;background:#FFF8D6;">• ${escape(o)}</td></tr>`,
    )
    .join("");
  return `
  <div style="${STYLES.block}">
    ${sectionBar(T.observaciones, barColor, barTextColor)}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;background:#FFF8D6;border:1px solid #F1D45A;border-top:none;">
      <tbody>${items}</tbody>
    </table>
  </div>`;
}

export const PROPUESTA_CSS = `
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body {
    font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1f2937;
    line-height: 1.45;
    font-size: 13px;
  }
`;

function introBlock(d: PropuestaData): string {
  if (!d.intro) return "";
  const paragraphs = d.intro
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 10px;color:${COLOR_TEXTO};font-size:13px;line-height:1.55;">${escape(p).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
  return `<tr><td style="padding:0 0 16px 0;">${paragraphs}</td></tr>`;
}

function infoBar(d: PropuestaData): string {
  const { T, idioma } = d;
  const c = d.cliente;

  const fechasText =
    c.fechaInicio && c.fechaFin
      ? `${fmtFechaBar(c.fechaInicio, idioma)} – ${fmtFechaBar(c.fechaFin, idioma)}`
      : c.fechaInicio
      ? fmtFechaBar(c.fechaInicio, idioma)
      : "—";

  const LBL = `font-size:10px;font-weight:700;color:#63718a;text-transform:uppercase;letter-spacing:1px;line-height:1;margin:0;padding:0;`;
  const VAL = `font-size:15px;font-weight:700;color:#041941;line-height:1.25;margin-top:6px;word-break:break-word;`;
  const SEP = `width:1px;background:#e2e8f0;`;
  const CEL = `padding:16px 14px;text-align:center;vertical-align:middle;`;

  function col(lbl: string, val: string, width: string): string {
    return `<td width="${width}" style="${CEL}width:${width};">` +
      `<div style="${LBL}">${escape(lbl)}</div>` +
      `<div style="${VAL}">${escape(val)}</div>` +
      `</td>`;
  }

  return `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#f8faff;">
  <tr>
    ${col(T.destino,         d.destino,         "30%")}
    <td width="1" style="${SEP}width:1px;">&nbsp;</td>
    ${col(T.fechasDeEstadia, fechasText,         "40%")}
    <td width="1" style="${SEP}width:1px;">&nbsp;</td>
    ${col(T.noches,          d.noches,           "12%")}
    <td width="1" style="${SEP}width:1px;">&nbsp;</td>
    ${col(T.pasajeros,       d.pasajerosLabel,   "18%")}
  </tr>
</table>`;
}

export function buildPropuestaBody(d: PropuestaData): string {
  const { T } = d;

  let bodyContent: string;
  if (d.isGrupo && d.isPackage) {
    bodyContent = `<tr><td>${buildGrupoPackageView(d)}</td></tr>`;
  } else if (d.isGrupo) {
    bodyContent = `
      ${d.isCalc
        ? `<tr><td>${buildTotalesView(d)}</td></tr>`
        : `<tr><td>${alojamientoTable(d)}</td></tr>
      <tr><td>${adicionalesTable(T.traslados, d.traslados, d, C_TOT_TRASLADOS)}</td></tr>
      <tr><td>${adicionalesTable(T.toursYExperiencias, d.tours, d, C_TOT_TOURS)}</td></tr>
      <tr><td>${adicionalesTable(T.catamaranYNavegacion, d.catamarans, d, C_TOT_VUELOS)}</td></tr>
      <tr><td>${adicionalesTable(T.vuelos, d.vuelos, d, C_TOT_VUELOS)}</td></tr>
      <tr><td>${grupoDetalleBlock(d)}</td></tr>
      <tr><td>${observacionesBlock(d)}</td></tr>
      <tr><td>${itinerarioTable(d)}</td></tr>
      <tr><td>${descriptivosBlock(d)}</td></tr>`}
      `;
  } else if (d.isPackage) {
    bodyContent = `<tr><td>${buildPackageView(d)}</td></tr>`;
  } else if (d.isCalc) {
    bodyContent = `<tr><td>${buildTotalesView(d)}</td></tr>`;
  } else {
    bodyContent = `<tr><td>${alojamientoTable(d)}</td></tr>
      <tr><td>${adicionalesTable(T.traslados, d.traslados, d, C_TOT_TRASLADOS)}</td></tr>
      <tr><td>${adicionalesTable(T.toursYExperiencias, d.tours, d, C_TOT_TOURS)}</td></tr>
      <tr><td>${adicionalesTable(T.catamaranYNavegacion, d.catamarans, d, C_TOT_VUELOS)}</td></tr>
      <tr><td>${adicionalesTable(T.vuelos, d.vuelos, d, C_TOT_VUELOS)}</td></tr>
      <tr><td>${observacionesBlock(d)}</td></tr>
      <tr><td>${itinerarioTable(d)}</td></tr>
      <tr><td>${descriptivosBlock(d)}</td></tr>`;
  }

  return `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#ffffff;">
    <tr>
      <td align="center" style="padding:20px 24px;">
        <table cellpadding="0" cellspacing="0" border="0" width="720" style="width:100%;max-width:720px;background:#ffffff;font-family:'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLOR_TEXTO};font-size:13px;line-height:1.45;margin:0 auto;">
          <tbody>

            ${introBlock(d)}

            <tr>
              <td style="padding-bottom:16px;">
                ${infoBar(d)}
              </td>
            </tr>

            <tr>
              <td style="margin-bottom:16px;">
                <hr style="${STYLES.divider}" />
              </td>
            </tr>

            ${bodyContent}

            <tr>
              <td style="padding-top:24px;text-align:right;color:#9ca3af;font-size:11px;line-height:1.5;">
                <div>${escape(T.numeroCotizacion)}: ${escape(d.numeroCotizacion)}</div>
                <div>${escape(T.fechaEmision)}: ${escape(d.fechaEmision)}</div>
              </td>
            </tr>

          </tbody>
        </table>
      </td>
    </tr>
  </table>`;
}

export function buildPropuestaHtml(input: PropuestaInput): string {
  const d = buildPropuestaData(input);
  const lang = d.idioma === "pt" ? "pt-BR" : d.idioma === "en" ? "en" : "es";
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escape(d.T.propuestaDeServicios)} · ${escape(d.cliente.cotizacionNombre || d.cliente.nombre || "RGE Style Travel")}</title>
  <style>${PROPUESTA_CSS}</style>
</head>
<body>
${buildPropuestaBody(d)}
</body>
</html>`;
}
