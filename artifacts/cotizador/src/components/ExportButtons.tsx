import { useState } from "react";
import {
  MessageCircle,
  Mail,
  Printer,
  Save,
  Eraser,
  Eye,
  Check,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import html2pdfImport from "html2pdf.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const html2pdf = html2pdfImport as unknown as (...args: any[]) => any;
import type {
  Acomodacion,
  Cliente,
  CotizacionResult,
  Descriptivo,
  ServicioSeleccionado,
} from "@/lib/types";
import type { ModoCotizacion, ActividadTipo, PresentationMode, QuotingMode } from "./Guardadas";
import { fmt, calcGrupoTotalFromResult } from "@/lib/calc";
import { buildItinerario } from "./Itinerario";
import { buildPropuestaHtml } from "@/lib/propuesta";
import { formatRegimen } from "@/lib/regimen";
import { tr, type Idioma } from "@/lib/i18n";

interface Props {
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  result: CotizacionResult;
  modo: ModoCotizacion;
  presentationMode?: PresentationMode;
  quotingMode?: QuotingMode;
  habitacionesPorAcomodacion?: Partial<Record<Acomodacion, number>>;
  incluirItinerario: boolean;
  incluirDescriptivos: boolean;
  incluirDescriptivoCompleto: boolean;
  descriptivos: Descriptivo[];
  actividadesOverride?: Record<number, string>;
  onClear: () => void;
  onPreview: () => void;
  onActionComplete?: (tipo: ActividadTipo, isNew?: boolean) => void;
  onSaveToSeguimiento: () => { ok: boolean; isNew: boolean };
  validateBeforeAction: () => boolean;
  getNumeroCotizacion: () => string;
  observaciones?: string[];
  idioma?: Idioma;
  personalizarTraslados?: boolean;
  opcionesPaquete?: Array<{ id: string; nombre: string }>;
}

/** Formats an ISO date (YYYY-MM-DD) as DD-MM-YYYY. */
function fmtDMA(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
}

/** Capitalize: "DÍA" → "Día", "DAY" → "Day", "DIA" → "Dia" */
function cap(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Converts a name to Title Case (handles accented uppercase like MARÍA → María). */
function toTitleCase(s: string): string {
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Detects Estimada vs Estimado/a based on common Spanish feminine name endings. */
function detectTratamiento(name: string): string {
  const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const feminineEndings = ["ia", "na", "ela", "ina", "ira", "isa", "a"];
  for (const ending of feminineEndings) {
    if (normalized.endsWith(ending)) return "Estimada";
  }
  return "Estimado/a";
}

/** Builds a time-aware personalized email greeting using the agent's first name. */
function buildEmailGreeting(agente: string): string {
  const hour = new Date().getHours();
  const saludo = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const rawFirst = agente.trim().split(/\s+/)[0] ?? "";
  const firstName = rawFirst ? toTitleCase(rawFirst) : "";
  const tratamiento = firstName ? detectTratamiento(firstName) : "";
  const greeting = firstName
    ? `${saludo}, ${tratamiento} ${firstName}:`
    : `${saludo}:`;
  return `${greeting}\n\nEs un gusto saludarle.\n\nA continuación encontrará la propuesta solicitada.`;
}

export default function ExportButtons({
  cliente,
  servicios,
  result,
  modo,
  presentationMode = "detailed",
  quotingMode = "individual",
  habitacionesPorAcomodacion,
  incluirItinerario,
  incluirDescriptivos,
  incluirDescriptivoCompleto,
  descriptivos,
  actividadesOverride,
  observaciones,
  onClear,
  onPreview,
  onActionComplete,
  onSaveToSeguimiento,
  validateBeforeAction,
  getNumeroCotizacion,
  idioma = "es",
  personalizarTraslados = true,
  opcionesPaquete,
}: Props) {
  const [waCopied, setWaCopied] = useState(false);
  const [mailCopied, setMailCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [saving, setSaving] = useState(false);

  const T = tr(idioma);

  const acoms = result.acomodaciones;
  const primary = acoms[0];
  const hoteles = result.servicios.filter((s) => s.tipo === "hotel");
  const adicionales = result.servicios.filter((s) => s.tipo !== "hotel");
  const isCalc = modo === "calculo";

  const isPackage = presentationMode === "package";

  const buildPackageText = (): string => {
    const lines: string[] = [];
    lines.push("🎁 *PAQUETE DE SERVICIOS*");
    lines.push("");
    if (cliente.fechaInicio) {
      const inicio = fmtDMA(cliente.fechaInicio);
      const fin = cliente.fechaFin ? fmtDMA(cliente.fechaFin) : "";
      lines.push(`📅 *${T.fechasDeEstadia}:* ${inicio}${fin ? ` al ${fin}` : ""}`);
    }
    const pax = cliente.pasajeros;
    const ninos = cliente.ninos ?? 0;
    const pasajerosStr = `${pax} ${pax === 1 ? T.adulto : T.adultos}${ninos ? ` + ${ninos} ${ninos === 1 ? T.nino : T.ninoPlural}` : ""}`;
    lines.push(`👥 *${T.pasajeros}:* ${pasajerosStr}`);
    lines.push("");

    const inclusions: string[] = [];
    if (hoteles.length > 0) {
      inclusions.push("Alojamiento");
      if (hoteles.some((h) => !!formatRegimen(h.desayuno))) inclusions.push("Desayuno");
    }
    const traslados2 = adicionales.filter((s) => s.tipo === "traslado");
    const tours2 = adicionales.filter((s) => s.tipo === "tour");
    const catamarans2 = adicionales.filter((s) => s.tipo === "catamaran");
    const vuelos2 = adicionales.filter((s) => s.tipo === "vuelo");
    if (traslados2.length > 0) inclusions.push("Traslados");
    if (tours2.length > 0 || catamarans2.length > 0) inclusions.push("Tours seleccionados");
    if (vuelos2.length > 0) inclusions.push("Vuelos (si aplica)");
    if (tours2.some((s) => s.tickets?.enabled && s.tickets.adultPrice > 0)) inclusions.push("Entradas (si aplica)");

    lines.push(`📦 *El paquete incluye:*`);
    lines.push("");
    for (const inc of inclusions) lines.push(`✓ ${inc}`);

    if (hoteles.length > 0) {
      lines.push("");
      lines.push(`🏨 *${T.alojamiento}*`);
      for (const h of hoteles) {
        lines.push(`• ${h.nombre}${h.estrellas ? ` · ${h.estrellas}` : ""}`);
        const reg = formatRegimen(h.desayuno);
        if (reg) lines.push(`  🍽 ${reg}`);
      }
    }
    if (traslados2.length > 0) {
      lines.push("");
      lines.push(`🚐 *${T.traslados}*`);
      for (const s of traslados2) lines.push(`• ${s.nombre}`);
    }
    if (tours2.length > 0) {
      lines.push("");
      lines.push(`🌴 *${T.toursYExperiencias}*`);
      for (const s of tours2) lines.push(`• ${s.nombre}`);
    }
    if (catamarans2.length > 0) {
      lines.push("");
      lines.push(`⛵ *${T.catamaranYNavegacion}*`);
      for (const s of catamarans2) lines.push(`• ${s.nombre}`);
    }
    if (vuelos2.length > 0) {
      lines.push("");
      lines.push(`✈️ *${T.vuelos}*`);
      for (const s of vuelos2) lines.push(`• ${s.nombre}`);
    }

    const totalVal = result.totalesPorAcomodacion[primary];
    lines.push("");
    lines.push(`💰 *VALOR DEL PAQUETE*`);
    lines.push("");
    if (acoms.length > 1) {
      for (const a of acoms) lines.push(`• ${a}: *${fmt(result.totalesPorAcomodacion[a])}*`);
    } else {
      lines.push(`*${fmt(totalVal)}*${!isCalc ? ` por persona` : ""}`);
    }

    if (cliente.vigencia) {
      lines.push("");
      lines.push(`⏳ *Vigencia:* ${fmtDMA(cliente.vigencia)}`);
    }

    if (observaciones && observaciones.length > 0) {
      lines.push("");
      lines.push(`📋 *${T.observaciones}*`);
      for (const o of observaciones) lines.push(`• ${o}`);
    }

    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    return lines.join("\n");
  };

  const buildText = () => {
    if (isPackage) return buildPackageText();

    const lines: string[] = [];

    // ── Encabezado ──────────────────────────────────────────────
    lines.push(T.waIntro);
    lines.push("");

    if (cliente.fechaInicio) {
      const inicio = fmtDMA(cliente.fechaInicio);
      const fin = cliente.fechaFin ? fmtDMA(cliente.fechaFin) : "";
      lines.push(`📅 *${T.fechasDeEstadia}:* ${inicio}${fin ? ` al ${fin}` : ""}`);
    }
    const pax = cliente.pasajeros;
    const ninos = cliente.ninos ?? 0;
    const pasajerosStr = `${pax} ${pax === 1 ? T.adulto : T.adultos}${
      ninos ? ` + ${ninos} ${ninos === 1 ? T.nino : T.ninoPlural}` : ""
    }`;
    lines.push(`👥 *${T.pasajeros}:* ${pasajerosStr}`);

    // ── Alojamiento ──────────────────────────────────────────────
    if (hoteles.length) {
      lines.push("");
      lines.push(`🏨 *${T.alojamiento}*`);
      lines.push("");

      const hotelGroups: { ubicacion: string; items: typeof hoteles }[] = [];
      const hotelGroupMap = new Map<string, number>();
      for (const s of hoteles) {
        const key = (s.ubicacion ?? "").trim().toUpperCase() || "SIN UBICACIÓN";
        if (hotelGroupMap.has(key)) {
          hotelGroups[hotelGroupMap.get(key)!].items.push(s);
        } else {
          hotelGroupMap.set(key, hotelGroups.length);
          hotelGroups.push({ ubicacion: key, items: [s] });
        }
      }

      for (const group of hotelGroups) {
        lines.push(`📍 *${group.ubicacion}*`);
        lines.push("");

        for (const s of group.items) {
          const starsLabel = s.estrellas ? ` · ${s.estrellas}` : "";
          const tipoLabel = s.tipoHabitacion ? ` · ${s.tipoHabitacion}` : "";
          lines.push(`• *${s.nombre}*${starsLabel}${tipoLabel}`);

          const regimenWa = formatRegimen(s.desayuno);
          if (regimenWa) lines.push(`🍽 ${regimenWa}`);

          for (const a of acoms) {
            if (isCalc) {
              lines.push(`💲 ${a}: ${fmt(s.totalesPorAcomodacion[a])}`);
            } else {
              lines.push(`💲 ${a}: ${fmt(s.preciosPorAcomodacion[a])}`);
            }
          }
          // Show CHD tarifa when there are children and CHD is not already in acoms.
          const waNinos = cliente.ninos ?? 0;
          const hasChdInAcoms = acoms.some((a) => String(a).toUpperCase() === "CHD");
          if (waNinos > 0 && !hasChdInAcoms) {
            const chdRate = (s.preciosPorAcomodacion as Record<string, number>)["CHD"] ?? 0;
            if (chdRate > 0) {
              if (isCalc) {
                lines.push(`💲 CHD: ${fmt((s.totalesPorAcomodacion as Record<string, number>)["CHD"] ?? 0)}`);
              } else {
                lines.push(`💲 CHD: ${fmt(chdRate)}`);
              }
            }
          }

          if (s.notas) lines.push(`📝 ${s.notesImportant ? "⚠️ IMPORTANTE: " : ""}${s.notas}`);
          const waImgLinks = (s.images ?? []).filter((img) => !img.startsWith("data:"));
          if (waImgLinks.length > 0) {
            lines.push(`🖼 Imágenes:`);
            for (const link of waImgLinks) lines.push(link);
          }
          lines.push("");
        }
      }

      lines.push(`ℹ️ ${T.waTarifaNetaPP}`);
      lines.push(`ℹ️ ${T.waDisponibilidad}`);
    }

    const traslados = adicionales.filter((s) => s.tipo === "traslado");
    const tours = adicionales.filter((s) => s.tipo === "tour");
    const catamarans = adicionales.filter((s) => s.tipo === "catamaran");
    const vuelos = adicionales.filter((s) => s.tipo === "vuelo");

    // ── Traslados ────────────────────────────────────────────────
    if (traslados.length) {
      lines.push("");
      lines.push(`🚐 *${T.traslados}*`);
      lines.push("");

      for (const s of traslados) {
        lines.push(`• ${s.nombre}`);
        const modalidad = s.tipoServicio
          ? s.tipoServicio
          : s.detalle?.toLowerCase().includes("privado")
            ? T.privado
            : T.regular;
        lines.push(`🚐 ${T.waModoLabel}: ${modalidad}`);
        lines.push(
          `💲 ${T.waTarifa}: ${isCalc ? fmt(s.totalesPorAcomodacion[primary]) : `${fmt(s.unitAplicado ?? 0)} ${T.waPorPersona}`}`,
        );
        if (s.notas) lines.push(`ℹ️ ${s.notesImportant ? "⚠️ IMPORTANTE: " : ""}${s.notas}`);
        lines.push("");
      }
    }

    // ── Tours ────────────────────────────────────────────────────
    if (tours.length) {
      lines.push("");
      lines.push(`🌴 *${T.toursYExperiencias}*`);
      lines.push("");

      for (const s of tours) {
        lines.push(`• *${s.nombre}*`);
        if (incluirDescriptivos && s.horario) {
          lines.push(`🕒 ${s.horario}`);
        }
        if (s.tickets?.enabled && s.tickets.adultPrice > 0) {
          const label = s.tickets.label || T.incluye;
          const childPart =
            s.tickets.childPrice && s.tickets.childPrice > 0
              ? ` · ${T.ninosCap} ${fmt(s.tickets.childPrice)} PAX`
              : "";
          lines.push(`🎟 ${T.waAdicional}: ${label} ${fmt(s.tickets.adultPrice)} PAX${childPart}`);
        } else {
          lines.push(`🎟 ${T.noIncluyeEntradas}`);
        }
        lines.push(
          `💲 ${T.waTarifa}: ${isCalc ? fmt(s.totalesPorAcomodacion[primary]) : `${fmt(s.unitAplicado ?? 0)} ${T.waPorPersona}`}`,
        );
        if (s.notas) lines.push(`ℹ️ ${s.notesImportant ? "⚠️ IMPORTANTE: " : ""}${s.notas}`);
        lines.push("");
      }
    }

    // ── Catamarán ────────────────────────────────────────────────
    if (catamarans.length) {
      lines.push("");
      lines.push(`⛵ *${T.catamaranYNavegacion}*`);
      lines.push("");

      for (const s of catamarans) {
        lines.push(`• *${s.nombre}*`);
        lines.push(
          `💲 ${T.waTarifa}: ${isCalc ? fmt(s.totalesPorAcomodacion[primary]) : `${fmt(s.unitAplicado ?? 0)} ${T.waPorPersona}`}`,
        );
        if (s.notas) lines.push(`ℹ️ ${s.notesImportant ? "⚠️ IMPORTANTE: " : ""}${s.notas}`);
        lines.push("");
      }
    }

    // ── Vuelos ───────────────────────────────────────────────────
    if (vuelos.length) {
      lines.push("");
      lines.push(`✈️ *${T.vuelos}*`);
      lines.push("");

      for (const s of vuelos) {
        lines.push(`• ${s.nombre}`);
        lines.push(
          `💲 ${T.waTarifa}: ${isCalc ? fmt(s.totalesPorAcomodacion[primary]) : `${fmt(s.unitAplicado ?? 0)} ${T.waPorPersona}`}`,
        );
        if (s.notas) lines.push(`ℹ️ ${s.notesImportant ? "⚠️ IMPORTANTE: " : ""}${s.notas}`);
        lines.push("");
      }
    }

    // ── Resumen de costos ─────────────────────────────────────────
    if (isCalc) {
      lines.push("");
      lines.push(`💰 *${T.resumenDeCostos}*`);
      lines.push("");
      for (const a of acoms) {
        lines.push(`• ${a}: *${fmt(result.totalesPorAcomodacion[a])}* ${T.waPorPersona}`);
      }
    }

    // ── Detalle del Grupo ─────────────────────────────────────────
    if (quotingMode === "grupo") {
      const ROOM_PAX: Partial<Record<Acomodacion, number>> = { SGL: 1, DBL: 2, TPL: 3 };
      const ROOM_ACOMS: Acomodacion[] = (["SGL", "DBL", "TPL"] as Acomodacion[]).filter((a) => acoms.includes(a));
      const rp = (a: Acomodacion) => ROOM_PAX[a] ?? 1;
      const hab = habitacionesPorAcomodacion ?? {};
      const activeRoomAcoms = ROOM_ACOMS.filter((a) => (hab[a] ?? 0) > 0);
      const ninos = cliente.ninos ?? 0;
      const grupoAdultoPax = activeRoomAcoms.reduce((s, a) => s + (hab[a] ?? 0) * rp(a), 0);
      const grupoTotalPax = grupoAdultoPax + ninos;
      const grupoSubs = calcGrupoTotalFromResult(result, hab, ninos);
      const grupoTotal = grupoSubs.total;

      lines.push("");
      lines.push("👥 *DETALLE DEL GRUPO*");
      lines.push("");
      for (const a of activeRoomAcoms) {
        const habCount = hab[a] ?? 0;
        lines.push(`• ${String(a)}: ${habCount} hab × ${rp(a)} pax = ${habCount * rp(a)} pasajeros`);
      }
      if (ninos > 0) lines.push(`• Niños (CHD): ${ninos}`);
      if (grupoTotalPax > 0) lines.push(`• *Total pasajeros: ${grupoTotalPax}*`);

      if (activeRoomAcoms.length > 0) {
        lines.push("");
        lines.push("*Tarifas por persona:*");
        for (const a of activeRoomAcoms) {
          const pp = result.totalesPorAcomodacion[a] ?? 0;
          if (pp > 0) lines.push(`  ${String(a)}: ${fmt(pp)}`);
        }
        if (ninos > 0 && chdRate > 0) lines.push(`  Tarifa niño: ${fmt(chdRate)}`);
      }

      lines.push("");
      lines.push(`💵 *TOTAL DEL GRUPO: ${fmt(grupoTotal)}*`);
    }

    // ── Itinerario ───────────────────────────────────────────────
    const overrides = actividadesOverride ?? {};
    const it = incluirItinerario
      ? buildItinerario(cliente, servicios).map((d) =>
          overrides[d.dia] !== undefined
            ? { ...d, actividad: overrides[d.dia] }
            : d,
        )
      : [];
    if (it.length > 0) {
      lines.push("");
      lines.push(`🗓 *${T.itinerarioSugerido}*`);
      lines.push("");
      for (const d of it) {
        const fechaLabel = d.fecha ? ` · ${d.fecha}` : "";
        lines.push(`*${cap(T.dia)} ${d.dia}*${fechaLabel}`);
        lines.push(d.actividad);
        lines.push("");
      }
    }

    // ── Descriptivos ─────────────────────────────────────────────
    if (incluirDescriptivoCompleto && descriptivos.length) {
      const seen = new Set<string>();
      const tourDescs: Descriptivo[] = [];
      for (const t of tours) {
        const code = t.codigo || t.id;
        if (!code || seen.has(code)) continue;
        const d = descriptivos.find((x) => x.codigo === code);
        if (d) {
          seen.add(code);
          tourDescs.push(d);
        }
      }
      if (tourDescs.length) {
        lines.push("");
        lines.push(`📋 *${T.descriptivos}*`);
        for (const desc of tourDescs) {
          const titulo =
            (idioma === "en" ? desc.titulo_en : idioma === "pt" ? desc.titulo_pt : null) || desc.titulo;
          const parrafos =
            (idioma === "en" ? desc.parrafos_en : idioma === "pt" ? desc.parrafos_pt : null)?.filter(Boolean).length
              ? (idioma === "en" ? desc.parrafos_en : desc.parrafos_pt)!
              : desc.parrafos ?? [];
          const incluye =
            (idioma === "en" ? desc.incluye_en : idioma === "pt" ? desc.incluye_pt : null) || desc.incluye;
          const obsText =
            (idioma === "en" ? desc.observaciones_en : idioma === "pt" ? desc.observaciones_pt : null) || desc.observaciones;
          const recText =
            (idioma === "en" ? desc.recomendaciones_en : idioma === "pt" ? desc.recomendaciones_pt : null) || desc.recomendaciones;
          const nota =
            (idioma === "en" ? desc.notaImportante_en : idioma === "pt" ? desc.notaImportante_pt : null) || desc.notaImportante;

          lines.push("");
          lines.push(`*${titulo}*`);
          const infoBits: string[] = [];
          if (desc.info) infoBits.push(desc.info);
          if (desc.horarioExtra) infoBits.push(desc.horarioExtra);
          if (infoBits.length) lines.push(`_${infoBits.join(" · ")}_`);
          lines.push("");
          for (const p of parrafos) { lines.push(p); }
          if (incluye) {
            lines.push("");
            lines.push(`*✅ ${T.incluye}:*`);
            lines.push(incluye);
          }
          if (obsText) {
            lines.push("");
            lines.push(`*⚠️ ${T.observacionesSub}:*`);
            lines.push(obsText);
          }
          if (recText) {
            lines.push("");
            lines.push(`*💡 ${T.recomendaciones}:*`);
            lines.push(recText);
          }
          if (nota) {
            lines.push("");
            lines.push(`*🔴 ${T.notaImportante}:*`);
            lines.push(nota);
          }
        }
      }
    }

    // ── Observaciones ─────────────────────────────────────────────
    if (observaciones && observaciones.length > 0) {
      lines.push("");
      lines.push(`📋 *${T.observaciones}*`);
      lines.push("");
      for (const o of observaciones) {
        lines.push(`• ${o}`);
      }
    }

    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    return lines.join("\n");
  };

  const buildHtml = (numeroCotizacion: string, intro?: string) =>
    buildPropuestaHtml({
      cliente,
      servicios,
      result,
      modo,
      presentationMode,
      quotingMode,
      habitacionesPorAcomodacion,
      incluirItinerario,
      incluirDescriptivos,
      incluirDescriptivoCompleto,
      descriptivos,
      actividadesOverride,
      observaciones,
      numeroCotizacion,
      intro,
      idioma,
      personalizarTraslados,
      opcionesPaquete,
    });

  const sanitizeForFilename = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "")
      .slice(0, 40) || "Cliente";

  const copyWhatsapp = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setWaCopied(true);
      setTimeout(() => setWaCopied(false), 2000);
    } catch {
      // noop
    }
  };

  const copyEmail = async () => {
    if (!validateBeforeAction()) return;

    // Save to Seguimiento FIRST — before copying
    const { ok: saved, isNew } = onSaveToSeguimiento();
    if (!saved) return;

    try {
      const numero = getNumeroCotizacion();
      const emailIntro = buildEmailGreeting(cliente.agente ?? "");
      const html = buildHtml(numero, emailIntro);
      const text = `${emailIntro}\n\n${buildText()}`;

      let copied = false;
      const w = window as unknown as { ClipboardItem?: typeof ClipboardItem };
      if (w.ClipboardItem && navigator.clipboard && "write" in navigator.clipboard) {
        try {
          const item = new w.ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          });
          await navigator.clipboard.write([item]);
          copied = true;
        } catch {
          // fall through
        }
      }

      if (!copied) {
        const container = document.createElement("div");
        container.setAttribute("contenteditable", "true");
        container.style.position = "fixed";
        container.style.left = "-10000px";
        container.style.top = "0";
        container.style.opacity = "0";
        container.innerHTML = html;
        document.body.appendChild(container);
        const range = document.createRange();
        range.selectNodeContents(container);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        document.execCommand("copy");
        sel?.removeAllRanges();
        document.body.removeChild(container);
        copied = true;
      }

      if (copied) {
        setMailCopied(true);
        setTimeout(() => setMailCopied(false), 2000);
        onActionComplete?.("correo_enviado", isNew);
      }
    } catch (err) {
      console.error("Copy email failed:", err);
    }
  };

  const handlePdf = async () => {
    if (pdfLoading) return;
    if (!validateBeforeAction()) return;

    // Save to Seguimiento FIRST — before generating PDF
    const { ok: saved, isNew } = onSaveToSeguimiento();
    if (!saved) return;

    setPdfError(false);
    setPdfLoading(true);

    const numero = getNumeroCotizacion();
    const clienteSafe = sanitizeForFilename(cliente.cotizacionNombre || cliente.nombre || "");
    const filename = `Cotizacion-${numero}-${clienteSafe}.pdf`;

    let iframe: HTMLIFrameElement | null = null;

    try {
      const html = buildHtml(numero);

      iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = "816px";
      iframe.style.height = "1056px";
      iframe.style.border = "0";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) throw new Error("No iframe document");
      doc.open();
      doc.write(html);
      doc.close();

      await new Promise<void>((resolve) => {
        if (doc.readyState === "complete") resolve();
        else {
          iframe!.onload = () => resolve();
          setTimeout(() => resolve(), 1500);
        }
      });

      const images = Array.from(doc.images);
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
        ),
      );

      const target = doc.body;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 816 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(target)
        .save();

      onActionComplete?.("pdf_enviado", isNew);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setPdfError(true);
      setTimeout(() => setPdfError(false), 3000);
    } finally {
      if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
      setPdfLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
        <Send className="w-4 h-4 flex-shrink-0" style={{ color: "#b78ca4" }} />
        <h3 className="font-bold leading-tight" style={{ fontSize: 20, color: "#07152f" }}>Acciones</h3>
      </div>
      <div className="p-5 space-y-2">
        <button
          onClick={() => onPreview()}
          style={{ backgroundColor: "#041433" }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium transition-colors hover:brightness-110"
        >
          <Eye className="w-4 h-4" />
          Vista previa
        </button>
        <button
          onClick={copyWhatsapp}
          style={{ backgroundColor: "#03a04e" }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium transition-colors hover:brightness-95"
        >
          {waCopied ? (
            <><Check className="w-4 h-4" />¡Copiado!</>
          ) : (
            <><MessageCircle className="w-4 h-4" />Copiar WhatsApp</>
          )}
        </button>
        <button
          onClick={copyEmail}
          style={{ backgroundColor: "#802d62" }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium transition-colors hover:brightness-95"
          title="Copia el correo (mismo diseño que el PDF) listo para pegar en tu cliente de email"
        >
          {mailCopied ? (
            <><Check className="w-4 h-4" />¡Copiado!</>
          ) : (
            <><Mail className="w-4 h-4" />Copiar correo</>
          )}
        </button>
        <button
          onClick={handlePdf}
          disabled={pdfLoading}
          style={{ backgroundColor: pdfError ? "#b91c1c" : "#e6ae33" }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium transition-colors hover:brightness-110 disabled:opacity-70 disabled:cursor-wait"
        >
          {pdfLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Generando PDF…</>
          ) : pdfError ? (
            <><Printer className="w-4 h-4" />Error al generar PDF</>
          ) : (
            <><Printer className="w-4 h-4" />Descargar PDF</>
          )}
        </button>

        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5">
          <IconBtn
            onClick={() => {
              if (saving) return;
              if (!validateBeforeAction()) return;
              setSaving(true);
              try { onActionComplete?.("guardado_manual"); } finally {
                setTimeout(() => setSaving(false), 1200);
              }
            }}
            title="Guardar"
            disabled={saving}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</>
            ) : (
              <><Save className="w-4 h-4" />Guardar</>
            )}
          </IconBtn>
          <IconBtn onClick={onClear} title="Limpiar" danger>
            <Eraser className="w-4 h-4" />
            Limpiar
          </IconBtn>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  title,
  children,
  danger,
  disabled,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
        danger
          ? "border border-red-200 text-red-600 hover:bg-red-50"
          : "border border-slate-200 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
