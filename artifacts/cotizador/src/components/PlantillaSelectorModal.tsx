import { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Search,
  LayoutTemplate,
  Star,
  Clock,
  Building2,
  MapPin,
  Bus,
  Wand2,
  Edit3,
  Plus,
} from "lucide-react";
import type { Plantilla } from "@/lib/plantillas";
import {
  loadRecientes,
  loadFavoritas,
  toggleFavorita,
} from "@/lib/plantillas";

interface Props {
  open: boolean;
  plantillas: Plantilla[];
  onClose: () => void;
  onUsar: (plantilla: Plantilla) => void;
  onEditar: (plantilla: Plantilla) => void;
  onCrearNueva: () => void;
  tieneServicios: boolean;
}

type FilterChip = "Todos" | "Panamá" | "Costa Rica" | "Brasil" | "Colombia" | "Circuitos";

const CHIPS: FilterChip[] = ["Todos", "Panamá", "Costa Rica", "Brasil", "Colombia", "Circuitos"];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getDestino(nombre: string): FilterChip {
  const n = normalize(nombre);
  if (n.includes("panama") || n.includes("panamá")) return "Panamá";
  if (n.includes("costa rica")) return "Costa Rica";
  if (n.includes("brasil") || n.includes("brazil") || n.includes("carnaval")) return "Brasil";
  if (n.includes("colombia")) return "Colombia";
  return "Circuitos";
}

function plantillaResumen(p: Plantilla) {
  let hoteles = 0, tours = 0, traslados = 0;
  for (const b of p.bloques) {
    if (b.tipo === "hotel") hoteles++;
    else if (b.tipo === "tour") tours++;
    else if (b.tipo === "traslado") traslados++;
  }
  const parts: string[] = [];
  if (hoteles) parts.push(`${hoteles} hotel${hoteles !== 1 ? "es" : ""}`);
  if (tours) parts.push(`${tours} tour${tours !== 1 ? "s" : ""}`);
  if (traslados) parts.push(`${traslados} traslado${traslados !== 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(" · ") : "Sin servicios";
}

function formatRelative(iso: string) {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Hoy";
    if (days === 1) return "Ayer";
    if (days < 7) return `Hace ${days} días`;
    if (days < 14) return "Hace 1 semana";
    if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
    return d.toLocaleDateString("es-PA", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

export default function PlantillaSelectorModal({
  open,
  plantillas,
  onClose,
  onUsar,
  onEditar,
  onCrearNueva,
  tieneServicios,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeChip, setActiveChip] = useState<FilterChip>("Todos");
  const [favoritas, setFavoritas] = useState<string[]>([]);
  const [recientes, setRecientes] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveChip("Todos");
      setFavoritas(loadFavoritas());
      setRecientes(loadRecientes());
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [open]);

  const handleToggleFavorita = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoritas(toggleFavorita(id));
  };

  const handleUsar = (p: Plantilla) => {
    if (
      tieneServicios &&
      !window.confirm(
        `¿Cargar la plantilla "${p.nombre}"?\n\nLos servicios actuales serán reemplazados.`,
      )
    )
      return;
    onUsar(p);
  };

  const filtered = useMemo(() => {
    let list = plantillas;
    if (activeChip !== "Todos") {
      list = list.filter((p) => getDestino(p.nombre) === activeChip);
    }
    if (query.trim()) {
      const q = normalize(query.trim());
      list = list.filter((p) => normalize(p.nombre).includes(q) || normalize(plantillaResumen(p)).includes(q));
    }
    return list;
  }, [plantillas, activeChip, query]);

  const recientesPlantillas = useMemo(() => {
    if (query.trim() || activeChip !== "Todos") return [];
    return recientes
      .map((id) => plantillas.find((p) => p.id === id))
      .filter(Boolean) as Plantilla[];
  }, [recientes, plantillas, query, activeChip]);

  const favoritasPlantillas = useMemo(() => {
    if (query.trim() || activeChip !== "Todos") return [];
    return plantillas.filter((p) => favoritas.includes(p.id));
  }, [favoritas, plantillas, query, activeChip]);

  if (!open) return null;

  const isEmpty = plantillas.length === 0;
  const showFilters = !isEmpty && !query.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: 680, maxHeight: "88vh" }}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Seleccionar plantillas</h2>
              <p className="text-sm text-slate-500 mt-0.5">Busca y aplica una plantilla guardada.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="w-9 h-9 rounded-xl border border-[#D8E0EE] bg-white text-[#64748B] hover:bg-[#F5F7FA] flex items-center justify-center transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar plantillas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#802d62]/20 focus:border-[#b78ca4] transition"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter chips */}
          {showFilters && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {CHIPS.map((chip) => {
                const count = chip === "Todos"
                  ? plantillas.length
                  : plantillas.filter((p) => getDestino(p.nombre) === chip).length;
                if (chip !== "Todos" && count === 0) return null;
                return (
                  <button
                    key={chip}
                    onClick={() => setActiveChip(chip)}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                    style={
                      activeChip === chip
                        ? { backgroundColor: "#802d62", color: "#fff" }
                        : { backgroundColor: "#f1f5f9", color: "#475569" }
                    }
                  >
                    {chip}
                    {count > 0 && (
                      <span
                        className="ml-1.5 text-[10px] opacity-70"
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {isEmpty ? (
            <EmptyState onCrear={onCrearNueva} onClose={onClose} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <Search className="w-8 h-8 mb-3 opacity-30" />
              <p className="font-medium text-slate-600">Sin resultados</p>
              <p className="text-sm mt-1">Intenta con otro término o filtro</p>
              <button onClick={() => { setQuery(""); setActiveChip("Todos"); }} className="mt-3 text-sm text-[#802d62] hover:underline">
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              {/* Recientes */}
              {recientesPlantillas.length > 0 && (
                <Section icon={<Clock className="w-3.5 h-3.5" />} title="Recientes">
                  {recientesPlantillas.map((p) => (
                    <PlantillaCard
                      key={p.id}
                      plantilla={p}
                      isFavorita={favoritas.includes(p.id)}
                      onToggleFavorita={(e) => handleToggleFavorita(p.id, e)}
                      onUsar={() => handleUsar(p)}
                      onEditar={() => { onClose(); onEditar(p); }}
                    />
                  ))}
                </Section>
              )}

              {/* Favoritas */}
              {favoritasPlantillas.length > 0 && (
                <Section icon={<Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />} title="Favoritas">
                  {favoritasPlantillas.map((p) => (
                    <PlantillaCard
                      key={p.id}
                      plantilla={p}
                      isFavorita={true}
                      onToggleFavorita={(e) => handleToggleFavorita(p.id, e)}
                      onUsar={() => handleUsar(p)}
                      onEditar={() => { onClose(); onEditar(p); }}
                    />
                  ))}
                </Section>
              )}

              {/* Todas */}
              <Section
                icon={<LayoutTemplate className="w-3.5 h-3.5" />}
                title={query.trim() || activeChip !== "Todos" ? `Resultados (${filtered.length})` : "Todas las plantillas"}
              >
                {filtered.map((p) => (
                  <PlantillaCard
                    key={p.id}
                    plantilla={p}
                    isFavorita={favoritas.includes(p.id)}
                    onToggleFavorita={(e) => handleToggleFavorita(p.id, e)}
                    onUsar={() => handleUsar(p)}
                    onEditar={() => { onClose(); onEditar(p); }}
                  />
                ))}
              </Section>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!isEmpty && (
          <div className="px-6 py-3 border-t border-slate-100 shrink-0 flex items-center justify-between bg-slate-50/60">
            <span className="text-xs text-slate-400">
              {plantillas.length} plantilla{plantillas.length !== 1 ? "s" : ""} guardada{plantillas.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => { onClose(); onCrearNueva(); }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#802d62] hover:text-[#6b2252] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva plantilla
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-slate-400">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PlantillaCard({
  plantilla,
  isFavorita,
  onToggleFavorita,
  onUsar,
  onEditar,
}: {
  plantilla: Plantilla;
  isFavorita: boolean;
  onToggleFavorita: (e: React.MouseEvent) => void;
  onUsar: () => void;
  onEditar: () => void;
}) {
  const resumen = plantillaResumen(plantilla);
  const hoteles = plantilla.bloques.filter((b) => b.tipo === "hotel").length;
  const tours = plantilla.bloques.filter((b) => b.tipo === "tour").length;
  const traslados = plantilla.bloques.filter((b) => b.tipo === "traslado").length;

  return (
    <div className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-[#e8d5e0] hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: "rgba(128,45,98,0.08)" }}
        >
          <LayoutTemplate className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: "#802d62" }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm leading-tight truncate">
              {plantilla.nombre}
            </span>
            <button
              onClick={onToggleFavorita}
              className="shrink-0 transition-colors"
              title={isFavorita ? "Quitar de favoritas" : "Agregar a favoritas"}
            >
              <Star
                className="w-3.5 h-3.5"
                style={isFavorita
                  ? { color: "#f59e0b", fill: "#f59e0b" }
                  : { color: "#cbd5e1" }}
              />
            </button>
          </div>

          {/* Pills */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {hoteles > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                <Building2 className="w-2.5 h-2.5" />
                {hoteles} hotel{hoteles !== 1 ? "es" : ""}
              </span>
            )}
            {tours > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700">
                <MapPin className="w-2.5 h-2.5" />
                {tours} tour{tours !== 1 ? "s" : ""}
              </span>
            )}
            {traslados > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700">
                <Bus className="w-2.5 h-2.5" />
                {traslados} traslado{traslados !== 1 ? "s" : ""}
              </span>
            )}
            {resumen === "Sin servicios" && (
              <span className="text-[10px] text-slate-400 italic">Sin servicios</span>
            )}
          </div>

          <p className="text-[11px] text-slate-400 mt-1">{formatRelative(plantilla.updatedAt)}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onEditar}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            Editar
          </button>
          <button
            onClick={onUsar}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-all hover:brightness-110 shadow-sm"
            style={{ backgroundColor: "#802d62" }}
          >
            <Wand2 className="w-3 h-3" />
            Usar
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCrear, onClose }: { onCrear: () => void; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(128,45,98,0.08)" }}
      >
        <LayoutTemplate className="w-8 h-8" style={{ color: "#802d62" }} />
      </div>
      <p className="font-semibold text-slate-700 text-base">Sin plantillas</p>
      <p className="text-sm text-slate-400 mt-1 max-w-xs">
        Crea plantillas desde la sección Plantillas.
      </p>
      <button
        onClick={() => { onClose(); onCrear(); }}
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold shadow-sm transition-all hover:brightness-110"
        style={{ backgroundColor: "#802d62" }}
      >
        <Plus className="w-4 h-4" />
        Crear plantilla
      </button>
    </div>
  );
}
