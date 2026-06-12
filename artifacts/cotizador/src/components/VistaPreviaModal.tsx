import Modal from "./Modal";
import { X } from "lucide-react";
import type {
  Acomodacion,
  Cliente,
  CotizacionResult,
  Descriptivo,
  ServicioSeleccionado,
} from "@/lib/types";
import type { ModoCotizacion, PresentationMode, QuotingMode } from "./Guardadas";
import { buildPropuestaBody, buildPropuestaData } from "@/lib/propuesta";
import type { Idioma } from "@/lib/i18n";
import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
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
  actividadesOverride: Record<number, string>;
  onActividadesOverrideChange: (
    next: Record<number, string>,
  ) => void;
  /** Stable cotización code shown in the preview header (matches PDF/email/Seguimiento). */
  numeroCotizacion: string;
  /** Resolved observation strings to show in the proposal */
  observaciones?: string[];
  /** Output language for all section labels */
  idioma?: Idioma;
  /** Hotel options for Paquete mode */
  opcionesPaquete?: Array<{ id: string; nombre: string }>;
}

export default function VistaPreviaModal({
  open,
  onClose,
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
  onActividadesOverrideChange,
  numeroCotizacion,
  observaciones,
  idioma,
  opcionesPaquete,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overrideRef = useRef(actividadesOverride);
  overrideRef.current = actividadesOverride;
  const onChangeRef = useRef(onActividadesOverrideChange);
  onChangeRef.current = onActividadesOverrideChange;

  const [descriptivosFallback, setDescriptivosFallback] = useState<
    Descriptivo[]
  >([]);

  useEffect(() => {
    if (descriptivos.length > 0) return;
    let cancelled = false;
    fetch("/api/descriptivos")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Descriptivo[]) => {
        if (cancelled) return;
        console.log("[Preview] Descriptivos cargados (fallback):", data.length);
        setDescriptivosFallback(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.warn("[Preview] No pude cargar /api/descriptivos:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [descriptivos.length]);

  const descriptivosEffective =
    descriptivos.length > 0 ? descriptivos : descriptivosFallback;

  const data = useMemo(() => {
    if (incluirDescriptivoCompleto) {
      const tourCodes = servicios
        .filter((s) => s.tipo === "tour")
        .map((s) => (s.codigo || s.id || "").trim().toUpperCase())
        .filter(Boolean);
      const haveCodes = new Set(
        descriptivosEffective.map((d) => d.codigo.trim().toUpperCase()),
      );
      console.log("[Preview] Buscando tours:", tourCodes);
      console.log(
        "[Preview] Descriptivos disponibles:",
        descriptivosEffective.length,
        "matches:",
        tourCodes.filter((c) => haveCodes.has(c)),
      );
    }
    return buildPropuestaData({
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
      descriptivos: descriptivosEffective,
      actividadesOverride,
      observaciones,
      editable: true,
      numeroCotizacion,
      idioma,
      opcionesPaquete,
    });
  }, [
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
    descriptivosEffective,
    actividadesOverride,
    numeroCotizacion,
    idioma,
  ]);

  const bodyHtml = useMemo(() => buildPropuestaBody(data), [data]);

  useEffect(() => {
    if (!open) return;
    const root = containerRef.current;
    if (!root) return;

    const findCell = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return null;
      const el = target.closest<HTMLElement>("[data-edit-actividad]");
      return el ?? null;
    };

    const handleBlur = (e: FocusEvent) => {
      const el = findCell(e.target);
      if (!el) return;
      const dia = Number(el.getAttribute("data-edit-actividad"));
      if (!Number.isFinite(dia)) return;
      const newText = (el.textContent ?? "").trim();
      const current = overrideRef.current ?? {};
      if ((current[dia] ?? null) === newText) return;
      const next = { ...current };
      if (newText) next[dia] = newText;
      else delete next[dia];
      onChangeRef.current(next);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const el = findCell(e.target);
      if (!el) return;
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    };

    const handleFocus = (e: FocusEvent) => {
      const el = findCell(e.target);
      if (!el) return;
      el.style.background = "#fff7ed";
      el.style.boxShadow = "0 0 0 2px #f97316";
    };

    const handleBlurStyle = (e: FocusEvent) => {
      const el = findCell(e.target);
      if (!el) return;
      el.style.background = "";
      el.style.boxShadow = "";
    };

    root.addEventListener("focusout", handleBlur, true);
    root.addEventListener("focusout", handleBlurStyle, true);
    root.addEventListener("focusin", handleFocus, true);
    root.addEventListener("keydown", handleKeyDown);
    return () => {
      root.removeEventListener("focusout", handleBlur, true);
      root.removeEventListener("focusout", handleBlurStyle, true);
      root.removeEventListener("focusin", handleFocus, true);
      root.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, bodyHtml]);

  const formatoLabel =
    quotingMode === "grupo"
      ? "GRUPO"
      : modo === "tarifas"
        ? "TARIFARIO"
        : presentationMode === "package"
          ? "PAQUETE"
          : "TARIFARIO";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Propuesta de Servicios"
      titleRight={
        <span style={{ fontSize: 13, fontWeight: 700, color: "#2b4596", letterSpacing: "0.08em" }}>
          {formatoLabel}
        </span>
      }
      size="xl"
    >
      <div className="bg-slate-100 p-4 max-h-[72vh] overflow-y-auto">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
          <div
            ref={containerRef}
            className="propuesta-preview"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>
      </div>
    </Modal>
  );
}
