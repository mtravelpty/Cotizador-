import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Hotel as HotelIcon,
  Bus,
  MapPin,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";
import type {
  Hotel,
  ServicioSeleccionado,
  Tour,
  Traslado,
} from "@/lib/types";
import { fmt } from "@/lib/calc";

type Categoria = "todos" | "hotel" | "traslado" | "tour";
type Mercado = "general" | "brasil";

/**
 * Returns the commercial code to display for a catalog item.
 * - Local items have id = "hotel_TIMESTAMP_N" / "tour_..." / "traslado_..." and a separate `codigo` field.
 * - API/Excel items have id = the RGE code itself (e.g. "RGE-020") and no `codigo` field.
 * Rule: use `codigoField` if present; else use `id` unless it looks like an internal generated ID.
 */
function displayCodigo(id: string, codigoField?: string): string {
  if (codigoField) return codigoField;
  if (/^(hotel|tour|traslado)_\d+_\d+$/.test(id)) return "";
  return id;
}

interface Props {
  hoteles: Hotel[];
  tours: Tour[];
  traslados: Traslado[];
  globalFechaInicio: string;
  globalFechaFin: string;
  onPick: (s: ServicioSeleccionado) => void;
  mercado?: Mercado;
  onMercadoChange?: (m: Mercado) => void;
}

interface Resultado {
  tipo: "hotel" | "tour" | "traslado";
  raw: Hotel | Tour | Traslado;
  nombre: string;
  codigo: string;
  vigencia?: string;
  categoria?: string;
  rating?: string;
  precios: { primario: { label: string; value: number }; secundario?: { label: string; value: number } };
}

const MERCADOS: { value: Mercado; label: string }[] = [
  { value: "general", label: "Tarifario general" },
  { value: "brasil", label: "Tarifario Brasil" },
];

const FILTROS: { value: Categoria; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "hotel", label: "Hoteles" },
  { value: "tour", label: "Tours" },
  { value: "traslado", label: "Traslados" },
];

const TIPO_LABEL: Record<Categoria, string> = {
  todos: "Todos",
  hotel: "Hoteles",
  tour: "Tours",
  traslado: "Traslados",
};

export default function ServiceSearchBar({
  hoteles,
  tours,
  traslados,
  globalFechaInicio,
  globalFechaFin,
  onPick,
  mercado = "general",
  onMercadoChange,
}: Props) {
  const [categoria, setCategoria] = useState<Categoria>("todos");
  const [mercadoOpen, setMercadoOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce 300ms
  useEffect(() => {
    if (!query) {
      setDebounced("");
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = window.setTimeout(() => {
      setDebounced(query);
      setLoading(false);
    }, 300);
    return () => window.clearTimeout(t);
  }, [query]);

  // Outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMercadoOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMercadoOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const resultados = useMemo<Resultado[]>(() => {
    const q = debounced.trim().toLowerCase();
    if (q.length < 2) return [];

    const matches = (text: string) => text.toLowerCase().includes(q);
    const out: Resultado[] = [];

    if (categoria === "todos" || categoria === "hotel") {
      for (const h of hoteles) {
        const hCodigo = displayCodigo(h.id, (h as any).codigo);
        if (matches(h.nombre) || matches(hCodigo) || matches(h.ubicacion ?? "") || matches(h.categoria ?? "")) {
          out.push({
            tipo: "hotel",
            raw: h,
            nombre: h.nombre,
            codigo: hCodigo,
            vigencia: h.vigencia,
            categoria: h.ubicacion || h.categoria,
            rating: h.estrellas,
            precios: {
              primario: { label: "DBL", value: h.precios.DBL },
              secundario: { label: "SGL", value: h.precios.SGL },
            },
          });
        }
      }
    }

    if (categoria === "todos" || categoria === "traslado") {
      for (const t of traslados) {
        const tCodigo = displayCodigo(t.id, (t as any).codigo);
        if (matches(t.nombre) || matches(tCodigo) || matches(t.categoria ?? "")) {
          out.push({
            tipo: "traslado",
            raw: t,
            nombre: t.nombre,
            codigo: tCodigo,
            vigencia: undefined,
            categoria: t.tipo,
            precios: {
              primario: { label: "2-5 pax", value: t.precios.p2_5 },
              secundario: { label: "1 pax", value: t.precios.p1 },
            },
          });
        }
      }
    }

    if (categoria === "todos" || categoria === "tour") {
      for (const t of tours) {
        const tCodigo = displayCodigo(t.id);
        if (matches(t.nombre) || matches(tCodigo) || matches(t.categoria ?? "") || matches(t.seccion ?? "")) {
          out.push({
            tipo: "tour",
            raw: t,
            nombre: t.nombre,
            codigo: tCodigo,
            vigencia: t.horario,
            categoria: t.categoria || t.seccion,
            precios: {
              primario: { label: "2-5 pax", value: t.precios.p2_5 },
              secundario: { label: "1 pax", value: t.precios.p1 },
            },
          });
        }
      }
    }

    return out.slice(0, 80);
  }, [debounced, categoria, hoteles, tours, traslados]);

  useEffect(() => {
    setActiveIndex(0);
  }, [resultados.length, debounced, categoria]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const grouped = useMemo(() => {
    const groups: { tipo: Resultado["tipo"]; label: string; items: Resultado[] }[] = [];
    const order: Resultado["tipo"][] = ["hotel", "tour", "traslado"];
    for (const tipo of order) {
      const items = resultados.filter((r) => r.tipo === tipo);
      if (items.length > 0) groups.push({ tipo, label: TIPO_LABEL[tipo], items });
    }
    return groups;
  }, [resultados]);

  const buildServicio = (r: Resultado): ServicioSeleccionado => {
    const uid = `${r.tipo}-${Date.now()}`;
    if (r.tipo === "hotel") {
      const h = r.raw as Hotel;
      const codValue = displayCodigo(h.id, (h as any).codigo);
      return {
        id: uid, codigo: codValue || h.id, tipo: "hotel", nombre: h.nombre,
        precios: { SGL: h.precios.SGL, DBL: h.precios.DBL, TPL: h.precios.TPL, CHD: h.precios.CHD },
        ubicacion: h.ubicacion, estrellas: h.estrellas, vigencia: h.vigencia,
        tipoHabitacion: h.tipoHabitacion,
        desayuno: h.desayuno,
        fechaInicio: globalFechaInicio || undefined,
        fechaFin: globalFechaFin || undefined,
        notas: h.observaciones || undefined,
        images: h.imagenes?.length ? [...h.imagenes] : undefined,
      };
    }
    if (r.tipo === "tour") {
      const t = r.raw as Tour;
      return {
        id: uid, codigo: t.id, tipo: "tour", nombre: t.nombre,
        precios: { p1: t.precios.p1, p2_5: t.precios.p2_5, p6_10: t.precios.p6_10, chd: t.precios.chd },
        usarFecha: false, horario: t.horario || undefined,
      };
    }
    const tr = r.raw as Traslado;
    const trCodigo = displayCodigo(tr.id, (tr as any).codigo);
    return {
      id: uid, codigo: trCodigo || tr.id, tipo: "traslado", nombre: tr.nombre,
      precios: { p1: tr.precios.p1, p2_5: tr.precios.p2_5, p6_10: tr.precios.p6_10, chd: tr.precios.chd },
      usarFecha: false, tipoServicio: tr.tipo,
    };
  };

  const pick = (r: Resultado) => {
    onPick(buildServicio(r));
    const key = `${r.tipo}-${r.codigo}`;
    setJustAdded(key);
    window.setTimeout(() => setJustAdded((curr) => (curr === key ? null : curr)), 1000);
    setQuery("");
    setDebounced("");
    setCategoria("todos");
    setOpen(false);
    setMercadoOpen(false);
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = resultados[activeIndex];
      if (r) pick(r);
    }
  };

  const showDropdown = open && (loading || debounced.length >= 2);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-stretch gap-2">
        {/* Mercado dropdown */}
        {onMercadoChange && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMercadoOpen((v) => !v)}
              className="h-11 inline-flex items-center gap-2 px-3.5 rounded-xl text-sm font-medium transition-all"
              style={
                mercado !== "general"
                  ? { backgroundColor: "#802d62", border: "1px solid #802d62", color: "#fff", boxShadow: "0 2px 8px rgba(128,45,98,0.35)" }
                  : { backgroundColor: "#fff", border: "1px solid #802d62", color: "#802d62", boxShadow: "0 1px 4px rgba(128,45,98,0.12)" }
              }
            >
              <span>{MERCADOS.find((m) => m.value === mercado)?.label ?? "General"}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${mercadoOpen ? "rotate-180" : ""}`}
                style={{ color: mercado !== "general" ? "#fff" : "#802d62", opacity: 0.8 }}
              />
            </button>
            {mercadoOpen && (
              <div className="absolute z-40 mt-2 left-0 min-w-[160px] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150" style={{ backgroundColor: "#fff", border: "1.5px solid #802d62", borderRadius: 16, boxShadow: "0 8px 24px rgba(128,45,98,0.14), 0 2px 6px rgba(128,45,98,0.08)", padding: "6px" }}>
                {MERCADOS.map((m) => {
                  const active = mercado === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => { onMercadoChange(m.value); setMercadoOpen(false); inputRef.current?.focus(); }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", borderRadius: 10, fontSize: 14, fontWeight: active ? 700 : 500, color: active ? "#fff" : "#07152f", backgroundColor: active ? "#802d62" : "transparent", transition: "all 0.12s" }}
                      onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f9f0f5"; (e.currentTarget as HTMLButtonElement).style.color = "#802d62"; } }}
                      onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#07152f"; } }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#802d62" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (e.target.value) setCategoria("todos"); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKey}
            placeholder="Nombre, código RGE o texto parcial…"
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-white text-sm placeholder:text-slate-400 focus:outline-none transition-all"
            style={{ border: "1.5px solid #802d62", boxShadow: "0 1px 6px rgba(128,45,98,0.12)", color: "#07152f" }}
            data-testid="input-service-search"
          />
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          )}
          {query && !loading && (
            <button
              type="button"
              onClick={() => { setQuery(""); setDebounced(""); setCategoria("todos"); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Smart dropdown */}
      {showDropdown && (
        <div
          className="absolute z-30 left-0 right-0 mt-2 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          style={{ backgroundColor: "#fff", border: "1.5px solid #802d62", borderRadius: 20, boxShadow: "0 16px 48px rgba(128,45,98,0.16), 0 4px 12px rgba(128,45,98,0.08)" }}
        >
          {/* Filter tabs */}
          {!loading && resultados.length > 0 && (
            <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-slate-100">
              {FILTROS.map((f) => {
                const count = f.value === "todos"
                  ? resultados.length
                  : resultados.filter((r) => r.tipo === f.value).length;
                if (f.value !== "todos" && count === 0) return null;
                const active = categoria === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => { setCategoria(f.value); setActiveIndex(0); inputRef.current?.focus(); }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                    style={
                      active
                        ? { backgroundColor: "#802d62", color: "#fff" }
                        : { backgroundColor: "#f5eef3", color: "#7d4a6d" }
                    }
                  >
                    {f.label}
                    <span
                      className="rounded-full px-1 py-0.5 text-[10px] leading-none font-bold tabular-nums"
                      style={active ? { backgroundColor: "rgba(255,255,255,0.25)", color: "#fff" } : { backgroundColor: "#ecdce7", color: "#7d4a6d" }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {loading ? (
            <div className="px-4 py-10 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Buscando…
            </div>
          ) : resultados.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-sm font-semibold" style={{ color: "#07152f" }}>Sin resultados</div>
              <div className="text-xs mt-1 text-slate-500">Intenta con otra palabra, código o cambia el filtro.</div>
            </div>
          ) : (
            <div ref={listRef} className="max-h-[440px] overflow-y-auto py-2">
              {grouped.map((group) => {
                const groupStart = resultados.indexOf(group.items[0]);
                return (
                  <div key={group.tipo}>
                    {/* Group header */}
                    <div className="flex items-center gap-2 px-4 py-1.5 sticky top-0 bg-white z-10">
                      <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#802d62" }}>
                        {group.label}
                      </span>
                      <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#f9f0f5", color: "#802d62" }}>
                        {group.items.length}
                      </span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
                    {group.items.map((r, localIdx) => {
                      const flatIdx = groupStart + localIdx;
                      return (
                        <ResultRow
                          key={`${r.tipo}-${r.codigo}-${flatIdx}`}
                          r={r}
                          query={debounced}
                          active={flatIdx === activeIndex}
                          added={justAdded === `${r.tipo}-${r.codigo}`}
                          onClick={() => pick(r)}
                          onMouseEnter={() => setActiveIndex(flatIdx)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function iconForTipo(tipo: "hotel" | "tour" | "traslado") {
  const cls = "w-4 h-4";
  if (tipo === "hotel") return <HotelIcon className={cls} />;
  if (tipo === "tour") return <MapPin className={cls} />;
  return <Bus className={cls} />;
}

function colorsForTipo(tipo: "hotel" | "tour" | "traslado"): { bg: string; text: string; border: string } {
  if (tipo === "hotel") return { bg: "#fff8ed", text: "#b45309", border: "#fde68a" };
  if (tipo === "tour") return { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" };
  return { bg: "#f9f0f5", text: "#802d62", border: "#bfdbfe" };
}

function highlight(text: string, q: string) {
  if (!q || q.length < 2) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ backgroundColor: "rgba(128,45,98,0.12)", color: "#802d62", borderRadius: 3, padding: "0 2px", fontWeight: 700 }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function ResultRow({
  r,
  query,
  active,
  added,
  onClick,
  onMouseEnter,
}: {
  r: Resultado;
  query: string;
  active: boolean;
  added: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const colors = colorsForTipo(r.tipo);
  const bgColor = added ? "#f0fdf4" : active ? "#f9f0f5" : "transparent";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      data-active={active}
      data-testid={`result-${r.tipo}-${r.codigo}`}
      className="w-full text-left transition-colors"
      style={{ backgroundColor: bgColor, padding: "9px 16px", display: "flex", alignItems: "center", gap: 12 }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
      >
        {iconForTipo(r.tipo)}
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold truncate" style={{ color: "#07152f", maxWidth: "100%" }}>
            {highlight(r.nombre, query)}
          </span>
          {r.rating && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#fff8ed", color: "#b45309" }}>
              {r.rating}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {r.codigo && (
            <span className="text-[11px] font-mono font-semibold" style={{ color: "#802d62" }}>
              {highlight(r.codigo, query)}
            </span>
          )}
          {r.categoria && (
            <>
              <span className="text-slate-300 text-[10px]">·</span>
              <span className="text-[11px] text-slate-500 truncate">{r.categoria}</span>
            </>
          )}
          {r.vigencia && (
            <>
              <span className="text-slate-300 text-[10px]">·</span>
              <span className="text-[11px] text-slate-400 truncate">{r.vigencia}</span>
            </>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold tabular-nums leading-tight" style={{ color: "#07152f" }}>
          {fmt(r.precios.primario.value)}
          <span className="text-[10px] font-medium text-slate-400 ml-0.5">/{r.precios.primario.label.toLowerCase()}</span>
        </div>
        {r.precios.secundario && (
          <div className="text-[11px] tabular-nums text-slate-400 leading-tight mt-0.5">
            {fmt(r.precios.secundario.value)}
            <span className="text-[10px] ml-0.5">/{r.precios.secundario.label.toLowerCase()}</span>
          </div>
        )}
      </div>
    </button>
  );
}
