/**
 * Native jsPDF-based PDF generator — produces real text (selectable, copyable, zoomable).
 * Replaces the html2pdf.js/html2canvas screenshot approach in ExportButtons.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { buildPropuestaData, type PropuestaInput, type PropuestaData } from "./propuesta";
import { fmt } from "./calc";
import { formatRegimen } from "./regimen";
import { formatTrasladoNombre, personalizarNombreTraslado } from "./utils";
import type { ServicioCalculado, Acomodacion } from "./types";

// ── Brand colours as [R, G, B] ───────────────────────────────────────────────
const C_PURPLE: [number, number, number] = [128, 45, 98];
const C_DARK: [number, number, number] = [4, 25, 65];
const C_BLUE: [number, number, number] = [30, 58, 138];
const C_GRAY: [number, number, number] = [100, 116, 139];
const C_LIGHT: [number, number, number] = [248, 250, 252];
const C_TEXT: [number, number, number] = [31, 41, 55];
const C_BORDER: [number, number, number] = [226, 232, 240];
const C_WHITE: [number, number, number] = [255, 255, 255];
const C_LOC_BG: [number, number, number] = [238, 241, 248];
const C_LOC_TEXT: [number, number, number] = [54, 55, 101];
const C_OBS_BG: [number, number, number] = [255, 248, 214];
const C_OBS_BORDER: [number, number, number] = [241, 212, 90];

// ── Page geometry (A4 mm) ────────────────────────────────────────────────────
const A4_W = 210;
const A4_H = 297;
const MARGIN = 14;
const CONTENT_W = A4_W - MARGIN * 2;

// ── Helpers ──────────────────────────────────────────────────────────────────
function sanitize(s: string): string {
  return (s || "cotizacion").replace(/[/\\:*?"<>|]/g, "-").replace(/\s+/g, "-").slice(0, 60);
}

function lastY(doc: jsPDF): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable?.finalY ?? MARGIN;
}

function fmtFecha(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
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

// ── Section bar (full-width colored band with title) ─────────────────────────
function sectionBarY(doc: jsPDF, title: string, y: number): number {
  const BAR_H = 7;
  doc.setFillColor(...C_PURPLE);
  doc.rect(MARGIN, y, CONTENT_W, BAR_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C_WHITE);
  doc.text(title.toUpperCase(), MARGIN + 3, y + BAR_H * 0.72);
  return y + BAR_H;
}

// ── Page 1 header ─────────────────────────────────────────────────────────────
function renderHeader(doc: jsPDF, d: PropuestaData): number {
  const y = MARGIN;

  // ── Left: company branding ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...C_PURPLE);
  doc.text("RGE Style Travel", MARGIN, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C_GRAY);
  doc.text("PROPUESTA DE SERVICIOS TURÍSTICOS", MARGIN, y + 11);

  // ── Right: quote number + emission date ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C_DARK);
  doc.text(`N° ${d.numeroCotizacion}`, A4_W - MARGIN, y + 6, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C_GRAY);
  doc.text(`Emitida: ${d.fechaEmision}`, A4_W - MARGIN, y + 11, { align: "right" });
  if (d.validaHasta && d.validaHasta !== "—") {
    doc.text(`Válida hasta: ${d.validaHasta}`, A4_W - MARGIN, y + 15, { align: "right" });
  }

  // ── Purple divider ──
  doc.setDrawColor(...C_PURPLE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 14, A4_W - MARGIN, y + 14);

  return y + 17;
}

// ── Info bar (destination / dates / nights / passengers) ──────────────────────
function renderInfoBar(doc: jsPDF, d: PropuestaData, startY: number): number {
  const { T, cliente } = d;

  const fechasText =
    cliente.fechaInicio && cliente.fechaFin
      ? `${fmtFecha(cliente.fechaInicio)} – ${fmtFecha(cliente.fechaFin)}`
      : cliente.fechaInicio
        ? fmtFecha(cliente.fechaInicio)
        : "—";

  const cols = [
    { label: T.destino,         value: d.destino,           w: 0.28 },
    { label: T.fechasDeEstadia, value: fechasText,           w: 0.35 },
    { label: T.noches,          value: d.noches,             w: 0.15 },
    { label: T.pasajeros,       value: d.pasajerosLabel,     w: 0.22 },
  ];

  const BAR_H = 16;
  const BOX_Y = startY;

  // Outer box
  doc.setFillColor(...C_LIGHT);
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, BOX_Y, CONTENT_W, BAR_H, 2, 2, "FD");

  let cx = MARGIN;
  cols.forEach((col, i) => {
    const cw = CONTENT_W * col.w;

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C_GRAY);
    doc.text(col.label.toUpperCase(), cx + cw / 2, BOX_Y + 5, { align: "center" });

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C_DARK);
    const maxW = cw - 4;
    const lines = doc.splitTextToSize(col.value, maxW);
    doc.text(lines[0] as string, cx + cw / 2, BOX_Y + 11.5, { align: "center" });

    // Separator
    if (i < cols.length - 1) {
      doc.setDrawColor(...C_BORDER);
      doc.setLineWidth(0.3);
      doc.line(cx + cw, BOX_Y + 2, cx + cw, BOX_Y + BAR_H - 2);
    }

    cx += cw;
  });

  // Agency / agent row below info bar
  const metaY = BOX_Y + BAR_H + 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C_GRAY);
  const agInfo = [
    d.agencia !== "—" ? `Agencia: ${d.agencia}` : "",
    d.agente !== "—" ? `Agente: ${d.agente}` : "",
  ].filter(Boolean).join("   ·   ");
  if (agInfo) doc.text(agInfo, MARGIN, metaY);

  return metaY + (agInfo ? 5 : 2);
}

// ── Hotels table ─────────────────────────────────────────────────────────────
function renderHotels(doc: jsPDF, d: PropuestaData, startY: number): number {
  if (d.hoteles.length === 0) return startY;
  const { T } = d;

  const ninosCount = d.cliente.ninos ?? 0;
  const hasChdAcom = d.acoms.some((a) => String(a).toUpperCase() === "CHD");
  const displayAcoms: Acomodacion[] =
    ninosCount > 0 && !hasChdAcom ? [...d.acoms, "CHD" as Acomodacion] : d.acoms;

  const groups = groupByLocation(d.hoteles);

  const head = [
    [
      { content: T.hotel, styles: { halign: "left" as const } },
      { content: T.categoria, styles: { halign: "center" as const } },
      { content: T.tipoHab, styles: { halign: "left" as const } },
      ...displayAcoms.map((a) => ({
        content: `${String(a)}\nPAX/Noche`,
        styles: { halign: "center" as const },
      })),
    ],
  ];

  const body: Parameters<typeof autoTable>[1]["body"] = [];

  for (const group of groups) {
    body.push([
      {
        content: group.label,
        colSpan: 3 + displayAcoms.length,
        styles: {
          fillColor: C_LOC_BG,
          textColor: C_LOC_TEXT,
          fontStyle: "bold" as const,
          fontSize: 8,
          cellPadding: { top: 4, bottom: 4, left: 6, right: 4 },
        },
      },
    ]);

    for (const h of group.items) {
      const regimen = formatRegimen(h.desayuno);
      let hotelCell = h.nombre;
      if (regimen) hotelCell += `\n${regimen}`;
      const fechaStr =
        h.fechaInicio && h.fechaFin
          ? `Check-in: ${fmtFecha(h.fechaInicio)} · Check-out: ${fmtFecha(h.fechaFin)}${h.noches ? ` (${h.noches} noches)` : ""}`
          : h.fechaInicio
            ? `Check-in: ${fmtFecha(h.fechaInicio)}`
            : "";
      if (fechaStr) hotelCell += `\n${fechaStr}`;
      if (h.notas) hotelCell += `\n${h.notas}`;

      body.push([
        { content: hotelCell, styles: { fontStyle: "normal" as const } },
        { content: h.estrellas || "—", styles: { halign: "center" as const } },
        { content: h.tipoHabitacion || "—", styles: { halign: "left" as const } },
        ...displayAcoms.map((a) => ({
          content: fmt(h.preciosPorAcomodacion[a] ?? 0),
          styles: { halign: "right" as const, fontStyle: "bold" as const },
        })),
      ]);
    }
  }

  const barY = sectionBarY(doc, T.alojamiento, startY);

  autoTable(doc, {
    startY: barY,
    head,
    body,
    theme: "plain",
    styles: {
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      lineColor: C_BORDER,
      lineWidth: 0.2,
      textColor: C_TEXT,
      font: "helvetica",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: C_LIGHT,
      textColor: C_GRAY,
      fontStyle: "bold",
      fontSize: 7.5,
      lineColor: C_BORDER,
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: "auto", minCellWidth: 45 },
      1: { cellWidth: 22, halign: "center" },
      2: { cellWidth: 30 },
      ...Object.fromEntries(
        displayAcoms.map((_, i) => [3 + i, { cellWidth: 20, halign: "right" as const }]),
      ),
    },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data) => {
      // Style location-group header rows
      if (
        data.row.raw &&
        Array.isArray(data.row.raw) &&
        data.row.raw[0] &&
        typeof data.row.raw[0] === "object" &&
        "colSpan" in (data.row.raw[0] as object)
      ) {
        data.cell.styles.fillColor = C_LOC_BG;
        data.cell.styles.textColor = C_LOC_TEXT;
      }
    },
  });

  return lastY(doc) + 5;
}

// ── Adicionales table (transfers / tours / catamarans / flights) ──────────────
function renderAdicionales(
  doc: jsPDF,
  d: PropuestaData,
  items: ServicioCalculado[],
  title: string,
  startY: number,
): number {
  if (items.length === 0) return startY;
  const { T } = d;

  const hasCHD = d.acoms.some((a) => String(a) === "CHD");
  const onlyCHD = hasCHD && d.acoms.length === 1;

  const body = items.map((s) => {
    const chdUnit = (s.preciosPorAcomodacion as Record<string, number>)["CHD"] ?? 0;
    const mainUnit = onlyCHD
      ? chdUnit > 0
        ? chdUnit
        : (s.unitAplicado ?? 0)
      : (s.unitAplicado ?? 0);

    const displayName =
      s.tipo === "traslado"
        ? personalizarNombreTraslado(
            formatTrasladoNombre(s.nombre),
            d.hoteles,
            d.personalizarTraslados,
          )
        : s.nombre;

    let nameCell = displayName;
    if (s.horario && (s.tipo === "tour" || s.tipo === "catamaran"))
      nameCell += `\n${T.horario}: ${s.horario}`;
    if (s.fechaInicio && s.fechaFin && s.tipo === "catamaran")
      nameCell += `\nFechas: ${fmtFecha(s.fechaInicio)} al ${fmtFecha(s.fechaFin)}`;
    if (s.notas) nameCell += `\n${s.notas}`;
    if (hasCHD && !onlyCHD && chdUnit > 0)
      nameCell += `\nCHD: ${fmt(chdUnit)}`;

    const tipo =
      s.tipo === "vuelo"
        ? T.tipoVuelo
        : s.tipoServicio
          ? s.tipoServicio
          : s.tipo === "traslado"
            ? (s.detalle || "").toLowerCase().includes("privado")
              ? T.privado
              : T.regular
            : T.regular;

    return [nameCell, tipo, { content: fmt(mainUnit), styles: { halign: "right" as const } }];
  });

  const barY = sectionBarY(doc, title, startY);

  autoTable(doc, {
    startY: barY,
    head: [
      [
        { content: T.descripcion, styles: { halign: "left" as const } },
        { content: T.tipo },
        { content: onlyCHD ? "TARIFA CHD" : "TARIFA (PAX)", styles: { halign: "right" as const } },
      ],
    ],
    body,
    theme: "plain",
    styles: {
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      lineColor: C_BORDER,
      lineWidth: 0.2,
      textColor: C_TEXT,
      font: "helvetica",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: C_LIGHT,
      textColor: C_GRAY,
      fontStyle: "bold",
      fontSize: 7.5,
      lineColor: C_BORDER,
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: "auto", minCellWidth: 60 },
      1: { cellWidth: 30 },
      2: { cellWidth: 28, halign: "right" },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  return lastY(doc) + 5;
}

// ── Totals block ─────────────────────────────────────────────────────────────
function renderTotals(doc: jsPDF, d: PropuestaData, startY: number): number {
  const totals = d.result.totalesPorAcomodacion as Record<string, number>;
  const acoms = d.acoms;
  if (!acoms.length) return startY;

  const head = [acoms.map((a) => ({ content: `TOTAL ${String(a)}`, styles: { halign: "center" as const } }))];
  const body = [
    acoms.map((a) => ({
      content: fmt(totals[String(a)] ?? 0),
      styles: { halign: "center" as const, fontStyle: "bold" as const, fontSize: 11 },
    })),
  ];

  const barY = sectionBarY(doc, "Total por persona", startY);

  autoTable(doc, {
    startY: barY,
    head,
    body,
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      lineColor: C_BORDER,
      lineWidth: 0.2,
      textColor: C_TEXT,
      font: "helvetica",
    },
    headStyles: {
      fillColor: C_LIGHT,
      textColor: C_GRAY,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  return lastY(doc) + 5;
}

// ── Observations ─────────────────────────────────────────────────────────────
function renderObservaciones(doc: jsPDF, d: PropuestaData, startY: number): number {
  if (d.observaciones.length === 0) return startY;

  let y = sectionBarY(doc, "Observaciones", startY);

  // Yellow background box for observations
  const lineH = 5;
  const padding = 3;
  const totalH = d.observaciones.length * lineH + padding * 2;

  doc.setFillColor(...C_OBS_BG);
  doc.setDrawColor(...C_OBS_BORDER);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, CONTENT_W, totalH, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C_TEXT);

  let ty = y + padding + 3;
  for (const obs of d.observaciones) {
    const wrapped = doc.splitTextToSize(`• ${obs}`, CONTENT_W - 6);
    for (const line of wrapped as string[]) {
      // Check page overflow
      if (ty > A4_H - MARGIN - 10) {
        doc.addPage();
        ty = MARGIN + 5;
      }
      doc.text(line, MARGIN + 3, ty);
      ty += lineH;
    }
  }

  return ty + 3;
}

// ── Itinerary ─────────────────────────────────────────────────────────────────
function renderItinerario(doc: jsPDF, d: PropuestaData, startY: number): number {
  if (d.itinerario.length === 0) return startY;
  const { T } = d;

  const body = d.itinerario.map((it) => [
    { content: String(it.dia), styles: { fontStyle: "bold" as const, textColor: C_BLUE, halign: "center" as const } },
    { content: it.fecha ? fmtFecha(it.fecha) : "—", styles: { textColor: C_GRAY } },
    { content: it.actividad },
  ]);

  const barY = sectionBarY(doc, T.itinerario || "Itinerario", startY);

  autoTable(doc, {
    startY: barY,
    head: [
      [
        { content: T.dia || "Día", styles: { halign: "center" as const } },
        { content: T.fecha || "Fecha" },
        { content: T.actividad || "Actividad" },
      ],
    ],
    body,
    theme: "plain",
    styles: {
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      lineColor: C_BORDER,
      lineWidth: 0.2,
      textColor: C_TEXT,
      font: "helvetica",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: C_LIGHT,
      textColor: C_GRAY,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 28 },
      2: { cellWidth: "auto", minCellWidth: 60 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  return lastY(doc) + 5;
}

// ── Per-page footer ──────────────────────────────────────────────────────────
function addFooters(doc: jsPDF, d: PropuestaData): void {
  const total = (doc.internal as unknown as { getNumberOfPages(): number }).getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, A4_H - 8, A4_W - MARGIN, A4_H - 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C_GRAY);
    doc.text("RGE Style Travel · Cotización de viajes", MARGIN, A4_H - 5);
    doc.text(`Página ${i} de ${total}`, A4_W - MARGIN, A4_H - 5, { align: "right" });
    doc.text(`N° ${d.numeroCotizacion}`, A4_W / 2, A4_H - 5, { align: "center" });
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generarPDF(
  input: PropuestaInput,
  numeroCotizacion?: string,
): Promise<void> {
  const d = buildPropuestaData({ ...input, numeroCotizacion });
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  // ── Page 1: header ──────────────────────────────────────────────────────
  let y = renderHeader(doc, d);

  // ── Info bar ─────────────────────────────────────────────────────────────
  y = renderInfoBar(doc, d, y);

  // ── Services ──────────────────────────────────────────────────────────────
  if (!d.isCalc) {
    if (d.hoteles.length > 0)     y = renderHotels(doc, d, y);
    if (d.traslados.length > 0)   y = renderAdicionales(doc, d, d.traslados,   d.T.traslados,              y);
    if (d.tours.length > 0)       y = renderAdicionales(doc, d, d.tours,       d.T.toursYExperiencias,     y);
    if (d.catamarans.length > 0)  y = renderAdicionales(doc, d, d.catamarans,  d.T.catamaranYNavegacion,   y);
    if (d.vuelos.length > 0)      y = renderAdicionales(doc, d, d.vuelos,      d.T.vuelos,                 y);
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  y = renderTotals(doc, d, y);

  // ── Observations ──────────────────────────────────────────────────────────
  if (d.observaciones.length > 0) y = renderObservaciones(doc, d, y);

  // ── Itinerary ─────────────────────────────────────────────────────────────
  if (d.itinerario.length > 0) renderItinerario(doc, d, y);

  // ── Footers ───────────────────────────────────────────────────────────────
  addFooters(doc, d);

  // ── Save ──────────────────────────────────────────────────────────────────
  const safe = sanitize(d.cliente.cotizacionNombre || d.cliente.nombre || "cotizacion");
  doc.save(`Cotizacion-${d.numeroCotizacion}-${safe}.pdf`);
}
