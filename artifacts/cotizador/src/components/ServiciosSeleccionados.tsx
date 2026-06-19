import { useState, useRef, useEffect, useMemo } from "react";
import defaultEmptyImg from "@assets/download_(1)_1781846831858.png";
import { PriceInput } from "@/components/ui/price-input";
import { Section } from "./ClientForm";
import type {
  Acomodacion,
  ServicioSeleccionado,
  TourTickets,
} from "@/lib/types";
import { fmt, pickTier, priceForTier } from "@/lib/calc";
import { formatTrasladoNombre, personalizarNombreTraslado } from "@/lib/utils";
import { formatRegimen } from "@/lib/regimen";
import InlineRangePicker, { nightsBetween } from "./InlineRangePicker";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ListChecks,
  Pencil,
  Trash2,
  Hotel,
  Compass,
  Car,
  Plane,
  Anchor,
  LayoutGrid,
  Search,
  Plus,
  Calendar,
  StickyNote,
  Ticket,
  GripVertical,
  LayoutTemplate,
  ChevronDown,
  Building2,
  List,
  X,
  Check,
  Flag,
  Copy,
  BedDouble,
  Package,
  Camera,
} from "lucide-react";
import { loadPlantillas, pushReciente, type Plantilla } from "@/lib/plantillas";
import { loadObservaciones } from "@/lib/observaciones";
import PlantillaSelectorModal from "./PlantillaSelectorModal";

interface Props {
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  pasajeros: number;
  ninos?: number;
  highlightedId?: string | null;
  onChange: (s: ServicioSeleccionado[]) => void;
  onEdit: (s: ServicioSeleccionado) => void;
  onAddCustom?: () => void;
  onQuickAdd?: (s: ServicioSeleccionado) => void;
  onCargarPlantilla?: (id: string) => void;
  onEditarPlantilla?: (p: Plantilla) => void;
  observaciones?: string;
  onObservacionesChange?: (v: string) => void;
  personalizarTraslados?: boolean;
  /** Enables hotel-option tabs in Paquete mode */
  presentationMode?: "detailed" | "package";
  opcionesPaquete?: Array<{ id: string; nombre: string }>;
  activeOpcionPaquete?: string;
  onActiveOpcionChange?: (id: string) => void;
  onAddOpcion?: () => void;
  onRenameOpcion?: (id: string, nombre: string) => void;
  onDeleteOpcion?: (id: string) => void;
}

function plantillaResumen(p: Plantilla) {
  let hoteles = 0;
  let tours = 0;
  let traslados = 0;
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

const GROUP_ORDER: ServicioSeleccionado["tipo"][] = [
  "hotel",
  "traslado",
  "vuelo",
  "tour",
  "catamaran",
];

const GROUP_TITLE: Record<ServicioSeleccionado["tipo"], string> = {
  hotel: "Alojamiento",
  traslado: "Traslados",
  vuelo: "Vuelos",
  tour: "Tours",
  catamaran: "Catamarán y Navegación",
};

type CategoriaQuick = "hoteleria" | "traslados" | "aereos" | "catamaran" | "tours" | "otros";

const CATEGORIAS_QUICK: { id: CategoriaQuick; label: string; icon: React.ReactNode; nombre: string }[] = [
  { id: "hoteleria",  label: "Hotelería",  icon: <BedDouble className="w-5 h-5" />, nombre: "Hotel" },
  { id: "traslados",  label: "Traslados",  icon: <Car className="w-5 h-5" />,       nombre: "Traslado" },
  { id: "tours",      label: "Tours",      icon: <Compass className="w-5 h-5" />,   nombre: "Tour" },
  { id: "aereos",     label: "Aéreos",     icon: <Plane className="w-5 h-5" />,     nombre: "Aéreo" },
  { id: "catamaran",  label: "Catamarán",  icon: <Anchor className="w-5 h-5" />,    nombre: "Catamarán" },
  { id: "otros",      label: "Otros",      icon: <Package className="w-5 h-5" />,   nombre: "Servicio" },
];

const TIPO_QUICK: Record<CategoriaQuick, ServicioSeleccionado["tipo"]> = {
  hoteleria: "hotel",
  traslados: "traslado",
  aereos:    "vuelo",
  catamaran: "catamaran",
  tours:     "tour",
  otros:     "tour",
};

export default function ServiciosSeleccionados({
  servicios,
  acomodaciones,
  pasajeros,
  ninos = 0,
  highlightedId,
  onChange,
  onEdit,
  onAddCustom,
  onQuickAdd,
  onCargarPlantilla,
  onEditarPlantilla,
  observaciones = "",
  onObservacionesChange,
  personalizarTraslados = true,
  presentationMode,
  opcionesPaquete,
  activeOpcionPaquete,
  onActiveOpcionChange,
  onAddOpcion,
  onRenameOpcion,
  onDeleteOpcion,
}: Props) {
  const hotelesServs = servicios.filter((s) => s.tipo === "hotel");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [customEmptyImg, setCustomEmptyImg] = useState<string | null>(
    () => {
      try { return localStorage.getItem("rge_empty_state_img"); } catch { return null; }
    }
  );
  const [emptyImgHover, setEmptyImgHover] = useState(false);
  const emptyImgInputRef = useRef<HTMLInputElement>(null);

  const handleEmptyImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target!.result as string;
      setCustomEmptyImg(src);
      try { localStorage.setItem("rge_empty_state_img", src); } catch {}
    };
    reader.readAsDataURL(file);
    if (emptyImgInputRef.current) emptyImgInputRef.current.value = "";
  };
  const [plantillaModalOpen, setPlantillaModalOpen] = useState(false);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [editingOpId, setEditingOpId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleOpenPlantillaModal = () => {
    setPlantillas(loadPlantillas());
    setPlantillaModalOpen(true);
  };

  const handleUsarPlantilla = (p: Plantilla) => {
    setPlantillaModalOpen(false);
    if (!onCargarPlantilla) return;
    pushReciente(p.id);
    onCargarPlantilla(p.id);
  };

  const handleEditarPlantilla = (p: Plantilla) => {
    setPlantillaModalOpen(false);
    onEditarPlantilla?.(p);
  };

  const remove = (s: ServicioSeleccionado) => {
    onChange(servicios.filter((x) => !(x.tipo === s.tipo && x.id === s.id)));
  };

  const duplicate = (s: ServicioSeleccionado) => {
    const copy: ServicioSeleccionado = JSON.parse(JSON.stringify(s));
    const newId = `${s.id}-dup-${Date.now()}`;
    copy.id = newId;
    copy.codigo = newId;
    copy.isDuplicate = true;
    copy.duplicatedFromId = s.id;
    const idx = servicios.findIndex((x) => x.tipo === s.tipo && x.id === s.id);
    const newList = [...servicios];
    newList.splice(idx + 1, 0, copy);
    onChange(newList);
  };

  const update = (s: ServicioSeleccionado) => {
    onChange(
      servicios.map((x) =>
        x.tipo === s.tipo && x.id === s.id ? s : x,
      ),
    );
  };

  const handleDrop = (
    targetTipo: ServicioSeleccionado["tipo"],
    targetId: string,
  ) => {
    if (!dragId) return;
    const sep = dragId.indexOf("|");
    const dTipo = dragId.slice(0, sep) as ServicioSeleccionado["tipo"];
    const dId = dragId.slice(sep + 1);
    if (dTipo !== targetTipo || dId === targetId) {
      setDragId(null);
      setDragOverKey(null);
      return;
    }
    const groupItems = servicios.filter((s) => s.tipo === targetTipo);
    const fromIdx = groupItems.findIndex((s) => s.id === dId);
    const toIdx = groupItems.findIndex((s) => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDragId(null);
      setDragOverKey(null);
      return;
    }
    const newGroup = [...groupItems];
    const [moved] = newGroup.splice(fromIdx, 1);
    newGroup.splice(toIdx, 0, moved);
    const result = GROUP_ORDER.flatMap((t) =>
      t === targetTipo ? newGroup : servicios.filter((s) => s.tipo === t),
    );
    onChange(result);
    setDragId(null);
    setDragOverKey(null);
  };

  const groups = GROUP_ORDER.map((tipo) => ({
    tipo,
    items: servicios.filter((s) => s.tipo === tipo),
  })).filter((g) => g.items.length > 0);

  const handleQuickAddItem = (cat: CategoriaQuick) => {
    if (!onQuickAdd) return;
    const tipo = TIPO_QUICK[cat];
    const catData = CATEGORIAS_QUICK.find(c => c.id === cat)!;
    const id = `manual-${tipo}-${Date.now()}`;
    onQuickAdd({
      id,
      tipo,
      nombre: catData.nombre,
      precios: {},
      manual: true,
      ...(cat === "hoteleria" && { tipoHabitacion: "Standard" }),
      ...(cat === "otros" && { customTipo: "Otro" }),
    });
  };

  return (
  <>
    <Section
      icon={<ListChecks className="w-4 h-4" />}
      title="Agregar servicios"
      subtitle={
        servicios.length
          ? `${servicios.length} ítem${servicios.length !== 1 ? "s" : ""} en la cotización`
          : undefined
      }
      action={
        onCargarPlantilla && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPlantillaModal}
              className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
              style={{ backgroundColor: "#802d62" }}
            >
              <LayoutTemplate className="w-4 h-4" />
              Plantillas
            </button>
          </div>
        )
      }
    >
      {onQuickAdd && (
        <div className="mb-3 pb-3 border-b border-[#f0e4ea]">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {CATEGORIAS_QUICK.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleQuickAddItem(cat.id)}
                className="group flex flex-col items-center justify-center gap-1 px-1.5 rounded-xl border transition-all duration-150 text-center active:scale-95"
                style={{
                  height: 88,
                  backgroundColor: "#ffffff",
                  borderColor: "#d8bdd0",
                  color: "#802d62",
                  boxShadow: "none",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.backgroundColor = "#f8eef5";
                  el.style.borderColor = "#802d62";
                  el.style.boxShadow = "0 3px 10px rgba(128,45,98,0.13)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.backgroundColor = "#ffffff";
                  el.style.borderColor = "#d8bdd0";
                  el.style.boxShadow = "none";
                  el.style.color = "#802d62";
                }}
                onMouseDown={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.backgroundColor = "#802d62";
                  el.style.borderColor = "#802d62";
                  el.style.color = "#ffffff";
                  el.style.boxShadow = "0 2px 8px rgba(128,45,98,0.30)";
                }}
                onMouseUp={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.backgroundColor = "#f8eef5";
                  el.style.borderColor = "#802d62";
                  el.style.color = "#802d62";
                  el.style.boxShadow = "0 3px 10px rgba(128,45,98,0.13)";
                }}
              >
                <span style={{ display: "flex" }}>{cat.icon}</span>
                <span className="text-[12px] font-bold leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {servicios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e8d5e0] px-6 py-10 text-center flex flex-col items-center gap-3" style={{ backgroundColor: "#ffffff" }}>
          <div className="relative" style={{ display: "inline-block" }}>
            <img
              src={customEmptyImg ?? defaultEmptyImg}
              alt=""
              aria-hidden="true"
              style={{
                maxWidth: 170, maxHeight: 170, width: "100%",
                objectFit: "contain", display: "block",
                borderRadius: 8,
                transition: "opacity 0.15s",
                opacity: emptyImgHover ? 0.6 : 1,
                cursor: "pointer",
              }}
              onClick={() => emptyImgInputRef.current?.click()}
              onMouseEnter={() => setEmptyImgHover(true)}
              onMouseLeave={() => setEmptyImgHover(false)}
            />
            {emptyImgHover && (
              <div
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1"
                style={{ borderRadius: 8 }}
              >
                <Camera className="w-6 h-6" style={{ color: "#802d62" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "#802d62" }}>Cambiar imagen</span>
              </div>
            )}
            <input
              ref={emptyImgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleEmptyImgUpload}
            />
          </div>
          <div className="font-semibold text-slate-700 text-sm">
            Aún no has agregado servicios
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => {
            const isPaqueteHotel =
              g.tipo === "hotel" &&
              presentationMode === "package" &&
              opcionesPaquete &&
              opcionesPaquete.length > 0;

            const firstOpId = opcionesPaquete?.[0]?.id;
            const displayItems = isPaqueteHotel
              ? g.items.filter((s) =>
                  s.paqueteOpcionId === activeOpcionPaquete ||
                  (activeOpcionPaquete === firstOpId && !s.paqueteOpcionId),
                )
              : g.items;

            const OPTION_COLORS      = ["#802d62", "#e6ae33", "#6b2252", "#b78ca4"];
            const OPTION_TEXT_COLORS = ["#802d62", "#b88400", "#6b2252", "#802d62"];
            const activeOpIdx = isPaqueteHotel
              ? Math.max(0, opcionesPaquete?.findIndex((op) => op.id === activeOpcionPaquete) ?? 0)
              : 0;
            const activeOpColor = OPTION_COLORS[activeOpIdx] ?? "#802d62";

            return (
            <div key={g.tipo}>
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2 px-1">
                {GROUP_TITLE[g.tipo]}
              </div>

              {isPaqueteHotel && (
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {opcionesPaquete!.map((op, opIdx) => {
                    const isActive = op.id === activeOpcionPaquete;
                    const isEditing = editingOpId === op.id;
                    const opColor     = OPTION_COLORS[opIdx]      ?? "#802d62";
                    const opTextColor = OPTION_TEXT_COLORS[opIdx] ?? opColor;
                    return (
                      <div key={op.id} className="relative flex items-center">
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => {
                              if (editingName.trim()) {
                                onRenameOpcion?.(op.id, editingName.trim());
                              }
                              setEditingOpId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (editingName.trim()) {
                                  onRenameOpcion?.(op.id, editingName.trim());
                                }
                                setEditingOpId(null);
                              } else if (e.key === "Escape") {
                                setEditingOpId(null);
                              }
                            }}
                            className="h-7 px-2 text-xs font-semibold rounded-full border-2 border-[#802d62] outline-none bg-white min-w-[80px] max-w-[140px]"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => onActiveOpcionChange?.(op.id)}
                            onDoubleClick={() => {
                              setEditingOpId(op.id);
                              setEditingName(op.nombre);
                            }}
                            title="Clic para activar · Doble clic para renombrar"
                            className={`h-7 px-3 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                              isActive
                                ? "text-white shadow-sm"
                                : opIdx === 0
                                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  : ""
                            }`}
                            style={isActive
                              ? { backgroundColor: opColor }
                              : opIdx > 0
                                ? { backgroundColor: opColor + "26", color: opTextColor, border: `1px solid ${opColor}66` }
                                : undefined}
                          >
                            {op.nombre}
                          </button>
                        )}
                        {opcionesPaquete!.length > 1 && !isEditing && (
                          <button
                            type="button"
                            onClick={() => onDeleteOpcion?.(op.id)}
                            title="Eliminar esta opción"
                            className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={onAddOpcion}
                    className="h-7 px-2.5 text-xs font-semibold rounded-full border border-dashed border-slate-300 text-slate-500 hover:border-[#b78ca4] hover:text-[#802d62] transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Nueva opción
                  </button>
                </div>
              )}

              <div
                className="rounded-2xl bg-white border border-[#e8d5e0] overflow-hidden divide-y divide-[#f0e4ea]"
                style={isPaqueteHotel && activeOpIdx > 0 ? { borderLeftColor: activeOpColor + "cc", borderLeftWidth: "3px" } : undefined}
              >
                {displayItems.length === 0 && isPaqueteHotel ? (
                  <div className="px-4 py-5 text-center text-sm text-slate-400 italic">
                    Sin hotel para esta opción. Buscá y agregá uno arriba.
                  </div>
                ) : (
                  displayItems.map((s) => {
                    const rowKey = `${s.tipo}-${s.id}`;
                    const dragKey = `${s.tipo}|${s.id}`;
                    return (
                      <div
                        key={rowKey}
                        style={s.isDuplicate ? { background: "rgba(128, 45, 98, 0.035)" } : undefined}
                      >
                        <ServicioRow
                          servicio={s}
                          acomodaciones={acomodaciones}
                          pasajeros={pasajeros}
                          ninos={ninos}
                          highlight={highlightedId === s.id}
                          isDragging={dragId === dragKey}
                          isDragOver={dragOverKey === rowKey}
                          onDragStart={() => setDragId(dragKey)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            setDragOverKey(rowKey);
                          }}
                          onDrop={() => handleDrop(s.tipo, s.id)}
                          onDragEnd={() => {
                            setDragId(null);
                            setDragOverKey(null);
                          }}
                          onEdit={() => onEdit(s)}
                          onRemove={() => remove(s)}
                          onDuplicate={() => duplicate(s)}
                          onUpdate={update}
                          hoteles={hotelesServs}
                          personalizarTraslados={personalizarTraslados}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
      <ObsPanel observaciones={observaciones} onObservacionesChange={onObservacionesChange} />
    </Section>
    <PlantillaSelectorModal
      open={plantillaModalOpen}
      plantillas={plantillas}
      tieneServicios={servicios.length > 0}
      onClose={() => setPlantillaModalOpen(false)}
      onUsar={handleUsarPlantilla}
      onEditar={handleEditarPlantilla}
      onCrearNueva={() => { setPlantillaModalOpen(false); onEditarPlantilla?.({ id: "__new__", nombre: "", bloques: [], createdAt: "", updatedAt: "" }); }}
    />
  </>
  );
}

/* ───────────────────────── ObsPanel ───────────────────────── */

const PRIORITY_IDS = [
  "precios_netos_pp",
  "sujeto_disponibilidad",
  "suplemento_sgl",
  "suplemento_vuelo_nocturno",
];

function ObsPanel({
  observaciones,
  onObservacionesChange,
}: {
  observaciones: string;
  onObservacionesChange?: (v: string) => void;
}) {
  const [inputVal, setInputVal] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const catalog = useMemo(() => loadObservaciones(), []);

  const bullets = useMemo(
    () => observaciones.split("\n").map((l) => l.trim()).filter(Boolean),
    [observaciones],
  );

  const addObs = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !onObservacionesChange) return;
    const next = bullets.length > 0 ? bullets.join("\n") + "\n" + trimmed : trimmed;
    onObservacionesChange(next);
  };

  const removeObs = (idx: number) => {
    if (!onObservacionesChange) return;
    onObservacionesChange(bullets.filter((_, i) => i !== idx).join("\n"));
  };

  const existingTexts = new Set(bullets.map((b) => b.toLowerCase()));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addObs(inputVal);
      setInputVal("");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return;
    e.preventDefault();
    if (!onObservacionesChange) return;
    const newLines = lines.filter((l) => !existingTexts.has(l.toLowerCase()));
    if (newLines.length > 0) {
      const next = [...bullets, ...newLines].join("\n");
      onObservacionesChange(next);
    }
    setInputVal("");
  };

  const priorityObs = catalog.filter((o) => PRIORITY_IDS.includes(o.id));
  const otherObs = catalog.filter((o) => !PRIORITY_IDS.includes(o.id));

  return (
    <div className="mt-5 pt-5 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-3">
        <List className="w-3.5 h-3.5" style={{ color: "#07152f" }} />
        <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: "#07152f" }}>
          Observaciones
        </span>
      </div>

      {bullets.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 group">
              <span className="text-slate-400 mt-0.5 shrink-0 leading-snug">•</span>
              <span className="text-sm text-slate-700 flex-1 leading-snug">{b}</span>
              {onObservacionesChange && (
                <button
                  type="button"
                  onClick={() => removeObs(i)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0 mt-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {onObservacionesChange && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Escribir observación y presionar Enter…"
            className="flex-1 px-3 h-9 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
          <Popover open={quickOpen} onOpenChange={setQuickOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 ring-1 ring-slate-200 transition-colors"
              >
                <List className="w-3.5 h-3.5" />
                Rápidas
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-1.5 z-[60]">
              <div className="space-y-0.5">
                {priorityObs.map((o) => {
                  const already = existingTexts.has(o.texto.toLowerCase());
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={already}
                      onClick={() => {
                        addObs(o.texto);
                        setQuickOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {o.texto}
                    </button>
                  );
                })}
                {otherObs.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                      Otras cláusulas
                    </div>
                    {otherObs.map((o) => {
                      const already = existingTexts.has(o.texto.toLowerCase());
                      return (
                        <button
                          key={o.id}
                          type="button"
                          disabled={already}
                          onClick={() => {
                            addObs(o.texto);
                            setQuickOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {o.texto}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function iconForTipo(tipo: ServicioSeleccionado["tipo"]) {
  if (tipo === "hotel") return <Hotel className="w-4 h-4" />;
  if (tipo === "tour") return <Compass className="w-4 h-4" />;
  if (tipo === "vuelo") return <Plane className="w-4 h-4" />;
  if (tipo === "catamaran") return <Anchor className="w-4 h-4" />;
  return <Car className="w-4 h-4" />;
}

function tipoColors(_tipo: ServicioSeleccionado["tipo"]) {
  return { bg: "bg-[#fdf4f9]", text: "text-[#802d62]" };
}

function fmtDMA(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${String(y).slice(-2)}`;
}

/* ───────────────────────── ServicioRow ───────────────────────── */

function ServicioRow({
  servicio,
  acomodaciones,
  pasajeros,
  ninos = 0,
  highlight,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEdit,
  onRemove,
  onDuplicate,
  onUpdate,
  hoteles = [],
  personalizarTraslados = true,
}: {
  servicio: ServicioSeleccionado;
  acomodaciones: Acomodacion[];
  pasajeros: number;
  ninos?: number;
  highlight?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdate: (s: ServicioSeleccionado) => void;
  hoteles?: ServicioSeleccionado[];
  personalizarTraslados?: boolean;
}) {
  const isHotel = servicio.tipo === "hotel";
  const isCatamaranItem = servicio.tipo === "catamaran";
  const paxLocal = servicio.paxOverride ?? pasajeros;
  const autoTier = pickTier(paxLocal);
  const appliedTier = servicio.tarifaOverride ?? autoTier;
  const unit =
    typeof servicio.unitOverride === "number"
      ? servicio.unitOverride
      : priceForTier(servicio.precios, appliedTier);
  const colors = tipoColors(servicio.tipo);

  const [openEditor, setOpenEditor] = useState<
    | "dates" | "price" | "notes" | "important-note" | "tickets" | "ubicacion" | "estrellas"
    | "regimen" | "tipoHab" | "origen" | "destino" | "fecha" | "fechaIda" | "fechaRegreso"
    | "equipaje" | "horario" | "ruta"
    | null
  >(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(servicio.nombre);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const dragHandleActive = useRef(false);
  const [iconHover, setIconHover] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const handleImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    Promise.all(
      files.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target!.result as string);
            reader.readAsDataURL(f);
          })
      )
    ).then((newImgs) => {
      onUpdate({ ...servicio, images: [...(servicio.images ?? []), ...newImgs] });
      if (imgInputRef.current) imgInputRef.current.value = "";
    });
  };

  const removeImage = (idx: number) => {
    onUpdate({ ...servicio, images: (servicio.images ?? []).filter((_, i) => i !== idx) });
  };

  function startNameEdit() {
    setNameValue(servicio.nombre);
    setEditingName(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  }

  function commitName() {
    if (savingRef.current) return;
    savingRef.current = true;
    const trimmed = nameValue.trim();
    if (trimmed) {
      onUpdate({ ...servicio, nombre: trimmed });
    }
    setEditingName(false);
    setTimeout(() => { savingRef.current = false; }, 0);
  }

  function cancelName() {
    setNameValue(servicio.nombre);
    setEditingName(false);
  }

  let descripcion: React.ReactNode = null;
  if (isHotel) {
    const meta = [servicio.ubicacion, servicio.estrellas]
      .filter(Boolean)
      .join(" · ");
    const hasDates = servicio.fechaInicio && servicio.fechaFin;
    descripcion = (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {meta && <span>{meta}</span>}
        {meta && hasDates && <span className="text-slate-300">·</span>}
        {hasDates && (
          <span className="inline-flex items-center gap-1 text-slate-600">
            <Calendar className="w-3 h-3" />
            {fmtDMA(servicio.fechaInicio)} → {fmtDMA(servicio.fechaFin)}
          </span>
        )}
        {formatRegimen(servicio.desayuno) && (
          <>
            {(meta || hasDates) && <span className="text-slate-300">·</span>}
            <span className="text-amber-700 font-medium">{formatRegimen(servicio.desayuno)}</span>
          </>
        )}
      </span>
    );
  } else if (servicio.tipo === "vuelo") {
    const parts: string[] = [];
    if (servicio.origen && servicio.destino)
      parts.push(`${servicio.origen} → ${servicio.destino}`);
    if (servicio.usarFecha && servicio.fecha) parts.push(servicio.fecha);
    if (parts.length) descripcion = parts.join(" · ");
  } else {
    const parts: string[] = [];
    if (servicio.usarFecha && servicio.fecha) parts.push(servicio.fecha);
    if (servicio.paxOverride) parts.push(`${servicio.paxOverride} pax`);
    if (parts.length) descripcion = parts.join(" · ");
  }

  const titleLabel =
    servicio.tipo === "traslado"
      ? personalizarNombreTraslado(
          formatTrasladoNombre(servicio.nombre),
          hoteles,
          personalizarTraslados,
        )
      : servicio.nombre;

  const rowClasses = [
    "group flex items-center gap-2 px-3 py-3 transition-colors",
    isDragging ? "opacity-40" : "",
    isDragOver ? "ring-2 ring-inset ring-primary/30 bg-primary/[0.03]" : "",
    highlight
      ? "bg-emerald-50 ring-1 ring-emerald-200"
      : !isDragOver
        ? "bg-white hover:bg-slate-50"
        : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      draggable
      onDragStart={(e) => {
        if (!dragHandleActive.current) {
          e.preventDefault();
          return;
        }
        dragHandleActive.current = false;
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={() => {
        dragHandleActive.current = false;
        onDragEnd();
      }}
      className={rowClasses}
    >
      {/* Drag handle — only draggable from here */}
      <div
        className="text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors"
        onMouseDown={() => { dragHandleActive.current = true; }}
        onMouseUp={() => { dragHandleActive.current = false; }}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Type icon — hover → camera to upload images */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => imgInputRef.current?.click()}
          onMouseEnter={() => setIconHover(true)}
          onMouseLeave={() => setIconHover(false)}
          title="Clic para agregar imágenes"
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 ${
            iconHover
              ? "bg-[#f0e4ea] text-[#802d62] ring-1 ring-[#d8bdd0]"
              : `${colors.bg} ${colors.text}`
          }`}
          style={{ cursor: "pointer" }}
        >
          {iconHover ? <Camera className="w-4 h-4" /> : iconForTipo(servicio.tipo)}
        </button>
        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImgUpload}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitName(); }
              if (e.key === "Escape") { e.preventDefault(); cancelName(); }
            }}
            className="text-sm font-semibold text-slate-900 w-full bg-transparent border-b border-primary/50 focus:outline-none focus:border-primary pb-px leading-tight"
          />
        ) : (
          <div
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors bg-[#fdf4f9] hover:bg-[#f5e8f1]"
            onClick={startNameEdit}
            title="Clic para editar el nombre"
          >
            <span className="text-sm font-semibold text-slate-900 truncate">{titleLabel}</span>
            {servicio.isDuplicate && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                background: "#f9f0f5",
                color: "#802d62",
                borderRadius: 999,
                padding: "1px 8px",
                flexShrink: 0,
                letterSpacing: "0.03em",
              }}>
                COPIA
              </span>
            )}
            {!isHotel && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const current = servicio.tipoServicio ?? "Regular";
                  const next = current === "Regular" ? "Privado" : "Regular";
                  onUpdate({ ...servicio, tipoServicio: next });
                }}
                title="Cambiar modalidad (Regular / Privado)"
                className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  (servicio.tipoServicio ?? "Regular") === "Privado"
                    ? "bg-[#f3e8ef] text-[#6b2252] hover:bg-[#edd8e6]"
                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                }`}
              >
                {servicio.tipoServicio ?? "Regular"}
              </button>
            )}
          </div>
        )}

        {/* Description / meta */}
        {isHotel ? (
          <div className="flex items-center gap-0.5 flex-wrap mt-0.5">
            {/* Ubicación */}
            <Popover
              open={openEditor === "ubicacion"}
              onOpenChange={(o) => setOpenEditor(o ? "ubicacion" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] text-[#802d62]/75 hover:text-[#802d62] hover:bg-[#802d62]/8 px-1 py-0.5 rounded transition-colors cursor-pointer"
                  title="Cambiar ubicación"
                >
                  {servicio.ubicacion ?? <span className="italic text-[#802d62]/45">Ubicación</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[210px] p-1 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <UbicacionEditor
                  current={servicio.ubicacion ?? ""}
                  onSave={(v) => { onUpdate({ ...servicio, ubicacion: v }); setOpenEditor(null); }}
                  onClose={() => setOpenEditor(null)}
                />
              </PopoverContent>
            </Popover>

            <span className="text-slate-300 text-[11px] select-none">·</span>

            {/* Categoría / Estrellas */}
            <Popover
              open={openEditor === "estrellas"}
              onOpenChange={(o) => setOpenEditor(o ? "estrellas" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] text-amber-500 hover:text-amber-600 hover:bg-amber-50 px-1 py-0.5 rounded transition-colors cursor-pointer"
                  title="Cambiar categoría"
                >
                  {servicio.estrellas ?? <span className="text-slate-400 italic">★ Cat.</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[160px] p-1 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <EstrellasEditor
                  current={servicio.estrellas ?? ""}
                  onSave={(v) => { onUpdate({ ...servicio, estrellas: v }); setOpenEditor(null); }}
                  onClose={() => setOpenEditor(null)}
                />
              </PopoverContent>
            </Popover>

            <span className="text-slate-300 text-[11px] select-none">·</span>

            {/* Fechas */}
            <Popover
              open={openEditor === "dates"}
              onOpenChange={(o) => setOpenEditor(o ? "dates" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] hover:text-primary hover:bg-primary/5 px-1 py-0.5 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                  title="Editar fechas de estadía"
                >
                  {servicio.fechaInicio && servicio.fechaFin ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                      <Calendar className="w-3 h-3" />
                      {fmtDMA(servicio.fechaInicio)} → {fmtDMA(servicio.fechaFin)}
                    </span>
                  ) : (
                    <span className="italic text-slate-400">Fechas</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[290px] p-3 z-[60]"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <DatesEditor
                  servicio={servicio}
                  onSave={(patch) => onUpdate({ ...servicio, ...patch })}
                  onClose={() => setOpenEditor(null)}
                />
              </PopoverContent>
            </Popover>

            {/* Régimen */}
            <span className="text-slate-300 text-[11px] select-none">·</span>
            <Popover open={openEditor === "regimen"} onOpenChange={(o) => setOpenEditor(o ? "regimen" : null)}>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] text-amber-700 hover:text-amber-800 hover:bg-amber-50 px-1 py-0.5 rounded transition-colors cursor-pointer" title="Cambiar régimen">
                  {formatRegimen(servicio.desayuno) || <span className="italic text-slate-400">Régimen</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[200px] p-1 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <RegimenEditor current={servicio.desayuno ?? ""} onSave={(v) => { onUpdate({ ...servicio, desayuno: v || undefined }); setOpenEditor(null); }} onClose={() => setOpenEditor(null)} />
              </PopoverContent>
            </Popover>

            {/* Tipo habitación */}
            <span className="text-slate-300 text-[11px] select-none">·</span>
            <Popover open={openEditor === "tipoHab"} onOpenChange={(o) => setOpenEditor(o ? "tipoHab" : null)}>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] text-[#802d62]/75 hover:text-[#802d62] hover:bg-[#802d62]/8 px-1 py-0.5 rounded transition-colors cursor-pointer" title="Tipo de habitación">
                  {servicio.tipoHabitacion || <span className="italic text-[#802d62]/45">Tipo hab.</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[230px] p-0 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <TextFieldEditor label="Tipo de habitación" placeholder="Ej. Superior Vista Mar" current={servicio.tipoHabitacion ?? ""} onSave={(v) => { onUpdate({ ...servicio, tipoHabitacion: v || undefined }); setOpenEditor(null); }} onClose={() => setOpenEditor(null)} />
              </PopoverContent>
            </Popover>
          </div>
        ) : isCatamaranItem ? (
          <div className="flex items-center gap-0.5 flex-wrap mt-0.5">
            {/* Fechas estadía catamarán */}
            <Popover open={openEditor === "dates"} onOpenChange={(o) => setOpenEditor(o ? "dates" : null)}>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] hover:text-primary hover:bg-primary/5 px-1 py-0.5 rounded transition-colors cursor-pointer inline-flex items-center gap-1" title="Editar fechas de estadía">
                  {servicio.fechaInicio && servicio.fechaFin ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                      <Calendar className="w-3 h-3" />
                      {fmtDMA(servicio.fechaInicio)} → {fmtDMA(servicio.fechaFin)}
                      <span className="ml-0.5 text-[10px] font-bold bg-[#fdf4f9] text-[#802d62] px-1.5 py-0.5 rounded">
                        {nightsBetween(servicio.fechaInicio, servicio.fechaFin)}n
                      </span>
                    </span>
                  ) : (
                    <span className="italic text-slate-400"><Calendar className="w-3 h-3 inline mr-0.5" />Fechas estadía</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[290px] p-3 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DatesEditor servicio={servicio} onSave={(patch) => onUpdate({ ...servicio, ...patch })} onClose={() => setOpenEditor(null)} />
              </PopoverContent>
            </Popover>
          </div>
        ) : servicio.tipo === "traslado" ? (
          <div className="flex items-center gap-0.5 flex-wrap mt-0.5">
            {/* Origen */}
            <Popover open={openEditor === "origen"} onOpenChange={(o) => setOpenEditor(o ? "origen" : null)}>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] text-[#802d62]/75 hover:text-[#802d62] hover:bg-[#802d62]/8 px-1 py-0.5 rounded transition-colors cursor-pointer" title="Origen">
                  {servicio.origen || <span className="italic text-[#802d62]/45">Origen</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[230px] p-0 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <TextFieldEditor label="Origen" placeholder="Ej. Aeropuerto Internacional" current={servicio.origen ?? ""} onSave={(v) => { onUpdate({ ...servicio, origen: v || undefined }); setOpenEditor(null); }} onClose={() => setOpenEditor(null)} />
              </PopoverContent>
            </Popover>
            <span className="text-slate-400 text-[11px] select-none">→</span>
            {/* Destino */}
            <Popover open={openEditor === "destino"} onOpenChange={(o) => setOpenEditor(o ? "destino" : null)}>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] text-[#802d62]/75 hover:text-[#802d62] hover:bg-[#802d62]/8 px-1 py-0.5 rounded transition-colors cursor-pointer" title="Destino">
                  {servicio.destino || <span className="italic text-[#802d62]/45">Destino</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[230px] p-0 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <TextFieldEditor label="Destino" placeholder="Ej. Hotel" current={servicio.destino ?? ""} onSave={(v) => { onUpdate({ ...servicio, destino: v || undefined }); setOpenEditor(null); }} onClose={() => setOpenEditor(null)} />
              </PopoverContent>
            </Popover>
            <span className="text-slate-300 text-[11px] select-none">·</span>
            {/* Fecha */}
            <Popover open={openEditor === "fecha"} onOpenChange={(o) => setOpenEditor(o ? "fecha" : null)}>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] text-[#802d62]/75 hover:text-[#802d62] hover:bg-[#802d62]/8 px-1 py-0.5 rounded transition-colors cursor-pointer inline-flex items-center gap-1" title="Fecha">
                  {servicio.fecha ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700"><Calendar className="w-3 h-3" />{fmtDMA(servicio.fecha)}</span>
                  ) : (
                    <span className="italic text-[#802d62]/45 inline-flex items-center gap-1"><Calendar className="w-3 h-3" />Fecha</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[200px] p-0 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <SingleDateEditor label="Fecha" current={servicio.fecha ?? ""} onSave={(v) => { onUpdate({ ...servicio, fecha: v || undefined, usarFecha: !!v }); setOpenEditor(null); }} onClose={() => setOpenEditor(null)} />
              </PopoverContent>
            </Popover>
          </div>
        ) : servicio.tipo === "vuelo" ? (
          <div className="flex items-center gap-0.5 flex-wrap mt-0.5">
            {/* Origen */}
            <Popover open={openEditor === "origen"} onOpenChange={(o) => setOpenEditor(o ? "origen" : null)}>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] text-[#802d62]/75 hover:text-[#802d62] hover:bg-[#802d62]/8 px-1 py-0.5 rounded transition-colors cursor-pointer" title="Origen">
                  {servicio.origen || <span className="italic text-[#802d62]/45">Origen</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[230px] p-0 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <TextFieldEditor label="Origen" placeholder="Ej. BOG" current={servicio.origen ?? ""} onSave={(v) => { onUpdate({ ...servicio, origen: v || undefined }); setOpenEditor(null); }} onClose={() => setOpenEditor(null)} />
              </PopoverContent>
            </Popover>
            <span className="text-slate-400 text-[11px] select-none">→</span>
            {/* Destino */}
            <Popover open={openEditor === "destino"} onOpenChange={(o) => setOpenEditor(o ? "destino" : null)}>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] text-[#802d62]/75 hover:text-[#802d62] hover:bg-[#802d62]/8 px-1 py-0.5 rounded transition-colors cursor-pointer" title="Destino">
                  {servicio.destino || <span className="italic text-[#802d62]/45">Destino</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[230px] p-0 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <TextFieldEditor label="Destino" placeholder="Ej. AUA" current={servicio.destino ?? ""} onSave={(v) => { onUpdate({ ...servicio, destino: v || undefined }); setOpenEditor(null); }} onClose={() => setOpenEditor(null)} />
              </PopoverContent>
            </Popover>
            <span className="text-slate-300 text-[11px] select-none">·</span>
            {/* Ida */}
            <Popover open={openEditor === "fechaIda"} onOpenChange={(o) => setOpenEditor(o ? "fechaIda" : null)}>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] hover:text-primary hover:bg-primary/5 px-1 py-0.5 rounded transition-colors cursor-pointer inline-flex items-center gap-1" title="Fecha de ida">
                  {servicio.fechaInicio ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700"><Calendar className="w-3 h-3" />Ida {fmtDMA(servicio.fechaInicio)}</span>
                  ) : (
                    <span className="italic text-slate-400 inline-flex items-center gap-1"><Calendar className="w-3 h-3" />Ida</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[200px] p-0 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <SingleDateEditor label="Ida" current={servicio.fechaInicio ?? ""} onSave={(v) => { onUpdate({ ...servicio, fechaInicio: v || undefined }); setOpenEditor(null); }} onClose={() => setOpenEditor(null)} />
              </PopoverContent>
            </Popover>
            {/* Regreso */}
            <Popover open={openEditor === "fechaRegreso"} onOpenChange={(o) => setOpenEditor(o ? "fechaRegreso" : null)}>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] hover:text-primary hover:bg-primary/5 px-1 py-0.5 rounded transition-colors cursor-pointer inline-flex items-center gap-1" title="Fecha de regreso">
                  {servicio.fechaFin ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700"><Calendar className="w-3 h-3" />Regreso {fmtDMA(servicio.fechaFin)}</span>
                  ) : (
                    <span className="italic text-slate-400 inline-flex items-center gap-1"><Calendar className="w-3 h-3" />Regreso</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[200px] p-0 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <SingleDateEditor label="Regreso" current={servicio.fechaFin ?? ""} onSave={(v) => { onUpdate({ ...servicio, fechaFin: v || undefined }); setOpenEditor(null); }} onClose={() => setOpenEditor(null)} />
              </PopoverContent>
            </Popover>
            <span className="text-slate-300 text-[11px] select-none">·</span>
            {/* Equipaje */}
            <Popover open={openEditor === "equipaje"} onOpenChange={(o) => setOpenEditor(o ? "equipaje" : null)}>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] text-slate-500 hover:text-primary hover:bg-primary/5 px-1 py-0.5 rounded transition-colors cursor-pointer" title="Equipaje">
                  {servicio.duracion || <span className="italic text-slate-400">Equipaje</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[230px] p-0 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <TextFieldEditor label="Equipaje" placeholder="Ej. 23 kg incluido" current={servicio.duracion ?? ""} onSave={(v) => { onUpdate({ ...servicio, duracion: v || undefined }); setOpenEditor(null); }} onClose={() => setOpenEditor(null)} />
              </PopoverContent>
            </Popover>
          </div>
        ) : servicio.tipo === "tour" ? (
          <div className="flex items-center gap-0.5 flex-wrap mt-0.5">
            {/* Fecha */}
            <Popover open={openEditor === "fecha"} onOpenChange={(o) => setOpenEditor(o ? "fecha" : null)}>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] hover:text-primary hover:bg-primary/5 px-1 py-0.5 rounded transition-colors cursor-pointer inline-flex items-center gap-1" title="Fecha del tour">
                  {servicio.fecha ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700"><Calendar className="w-3 h-3" />{fmtDMA(servicio.fecha)}</span>
                  ) : (
                    <span className="italic text-slate-400 inline-flex items-center gap-1"><Calendar className="w-3 h-3" />Fecha</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[200px] p-0 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <SingleDateEditor label="Fecha" current={servicio.fecha ?? ""} onSave={(v) => { onUpdate({ ...servicio, fecha: v || undefined, usarFecha: !!v }); setOpenEditor(null); }} onClose={() => setOpenEditor(null)} />
              </PopoverContent>
            </Popover>
            <span className="text-slate-300 text-[11px] select-none">·</span>
            {/* Horario */}
            <Popover open={openEditor === "horario"} onOpenChange={(o) => setOpenEditor(o ? "horario" : null)}>
              <PopoverTrigger asChild>
                <button type="button" className="text-[11px] text-slate-500 hover:text-primary hover:bg-primary/5 px-1 py-0.5 rounded transition-colors cursor-pointer" title="Horario">
                  {servicio.horario || <span className="italic text-slate-400">Horario</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[230px] p-0 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <TextFieldEditor label="Horario" placeholder="Ej. 08:00 AM" current={servicio.horario ?? ""} onSave={(v) => { onUpdate({ ...servicio, horario: v || undefined }); setOpenEditor(null); }} onClose={() => setOpenEditor(null)} />
              </PopoverContent>
            </Popover>
          </div>
        ) : null}

        {/* Notes list (multi-note system) */}
        {(servicio.notasList && servicio.notasList.length > 0) ? (
          <div className="mt-0.5 space-y-0.5">
            {[...(servicio.notasList)]
              .map((n, origIdx) => ({ n, origIdx }))
              .sort(({ n: a }, { n: b }) => {
                const aImp = (a.type === "important" || a.important === true) ? 0 : 1;
                const bImp = (b.type === "important" || b.important === true) ? 0 : 1;
                return aImp - bImp;
              })
              .map(({ n, origIdx }) => (
              <NoteItem
                key={n.id ?? origIdx}
                note={n}
                onEdit={(newText) => {
                  const now = new Date().toISOString();
                  const updated = (servicio.notasList ?? []).map((x, xi) =>
                    (x.id && n.id ? x.id === n.id : xi === origIdx)
                      ? { ...x, text: newText, updatedAt: now }
                      : x
                  );
                  onUpdate({ ...servicio, notasList: updated });
                }}
                onDelete={() => {
                  const updated = (servicio.notasList ?? []).filter((x, xi) =>
                    x.id && n.id ? x.id !== n.id : xi !== origIdx
                  );
                  onUpdate({ ...servicio, notasList: updated });
                }}
              />
            ))}
          </div>
        ) : servicio.notas ? (
          <div
            className="text-[11px] truncate mt-0.5 italic"
            style={{ color: servicio.notesImportant ? "#ef7b15" : "#92400e" }}
          >
            "{servicio.notas}"
          </div>
        ) : null}

        {/* Images grid */}
        {(servicio.images?.length ?? 0) > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(servicio.images ?? []).map((img, i) => (
              <div
                key={i}
                className="group/img relative flex-shrink-0"
                style={{
                  width: 80,
                  height: 60,
                  borderRadius: 7,
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                }}
              >
                <img
                  src={img}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                  style={{
                    background: "rgba(0,0,0,0.65)",
                    color: "#fff",
                    fontSize: 9,
                    lineHeight: 1,
                    padding: 0,
                    border: "none",
                    cursor: "pointer",
                  }}
                  title="Eliminar imagen"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tour tickets add-on */}
        {servicio.tipo === "tour" &&
          servicio.tickets?.enabled &&
          servicio.tickets.adultPrice > 0 && (
            <div className="text-[11px] text-amber-600 mt-1 truncate">
              Costo adicional por entradas:{servicio.tickets.label ? ` ${servicio.tickets.label} ·` : ""} Adultos {fmt(servicio.tickets.adultPrice)} p/p
              {servicio.tickets.childPrice !== undefined && servicio.tickets.childPrice > 0
                ? ` · Niños ${fmt(servicio.tickets.childPrice)} p/p`
                : ""}
            </div>
          )}

      </div>

      {/* Price area */}
      {isHotel ? (
        <Popover
          open={openEditor === "price"}
          onOpenChange={(o) => setOpenEditor(o ? "price" : null)}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-3 flex-shrink-0 px-2 py-1 -mx-1 rounded-lg hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 transition-colors"
              title="Editar precios"
            >
              {acomodaciones.map((a) => (
                <div key={a} className="text-center" style={{ minWidth: 64 }}>
                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                    {fmt(servicio.precios[a] ?? 0)}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400" style={{ lineHeight: 1.2 }}>
                    {a}
                  </div>
                  <div className="text-slate-400" style={{ fontSize: 10, lineHeight: 1.2, whiteSpace: "normal" }}>
                    Pax/Noche
                  </div>
                </div>
              ))}
              {ninos > 0 && (
                <div className="text-center" style={{ minWidth: 64 }}>
                  <div className="text-sm font-bold tabular-nums" style={{ color: "#92400e" }}>
                    {fmt(servicio.precios.CHD ?? 0)}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#b45309", lineHeight: 1.2 }}>
                    CHD
                  </div>
                  <div style={{ fontSize: 10, lineHeight: 1.2, color: "#b45309", whiteSpace: "normal" }}>
                    Pax/Noche
                  </div>
                </div>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[180px] p-0 z-[60]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <PricesEditor
              servicio={servicio}
              acomodaciones={acomodaciones}
              ninos={ninos}
              onSave={(precios) => {
                onUpdate({ ...servicio, precios });
                setOpenEditor(null);
              }}
              onClose={() => setOpenEditor(null)}
            />
          </PopoverContent>
        </Popover>
      ) : (
        <Popover
          open={openEditor === "price"}
          onOpenChange={(o) => setOpenEditor(o ? "price" : null)}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-right flex-shrink-0 px-2 py-1 -mx-1 rounded-lg hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 transition-colors"
              title="Editar precio"
            >
              <div className="text-sm font-bold text-slate-900 tabular-nums">
                {fmt(unit)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                {isCatamaranItem && (servicio.fechaInicio || servicio.fechaFin) ? "p/noche" : "p/p"}
              </div>
              {ninos > 0 && (
                <>
                  <div className="text-sm font-bold tabular-nums mt-0.5" style={{ color: "#92400e" }}>
                    {fmt(servicio.precios.chd ?? (servicio.precios.CHD as number | undefined) ?? 0)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide" style={{ color: "#b45309" }}>
                    CHD p/p
                  </div>
                </>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[180px] p-0 z-[60]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <UnitPriceEditor
              currentUnit={unit}
              currentChd={servicio.precios.chd ?? (servicio.precios.CHD as number | undefined) ?? 0}
              ninos={ninos}
              onSave={(val, chdVal) => {
                const newPrecios = { ...servicio.precios };
                if (chdVal !== undefined && chdVal !== null) {
                  newPrecios.chd = chdVal;
                  (newPrecios as Record<string, number>).CHD = chdVal;
                } else if (chdVal === null) {
                  newPrecios.chd = 0;
                  (newPrecios as Record<string, number>).CHD = 0;
                }
                onUpdate({ ...servicio, unitOverride: val ?? undefined, precios: newPrecios });
                setOpenEditor(null);
              }}
              onClose={() => setOpenEditor(null)}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Action icons — all service types */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
        {/* Duplicar */}
        <button
          type="button"
          onClick={onDuplicate}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Duplicar servicio"
          title="Duplicar servicio"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {servicio.tipo === "tour" && (
          <Popover
            open={openEditor === "tickets"}
            onOpenChange={(o) => setOpenEditor(o ? "tickets" : null)}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`p-1.5 rounded-lg transition-colors ${
                  servicio.tickets?.enabled
                    ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 opacity-100"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
                aria-label="Entradas"
                title={
                  servicio.tickets?.enabled
                    ? "Editar entradas"
                    : "Agregar entradas"
                }
              >
                <Ticket className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[320px] p-4 z-[60]"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <TicketsEditor
                value={servicio.tickets}
                onSave={(tickets) => {
                  onUpdate({ ...servicio, tickets });
                  setOpenEditor(null);
                }}
                onClose={() => setOpenEditor(null)}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* 📝 Nota (unificada: normal + importante) */}
        {(() => {
          const hasImportant = (servicio.notasList ?? []).some(n => n.type === "important" || n.important === true) || (servicio.notas && servicio.notesImportant);
          const hasNormal = (servicio.notasList ?? []).some(n => n.type !== "important" && !n.important) || (servicio.notas && !servicio.notesImportant);
          const hasAny = hasImportant || hasNormal;
          return (
            <Popover
              open={openEditor === "notes"}
              onOpenChange={(o) => setOpenEditor(o ? "notes" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`p-1.5 rounded-lg transition-colors ${hasAny ? "opacity-100" : "text-slate-500 hover:bg-slate-100"}`}
                  style={
                    hasImportant
                      ? { color: "#ef7b15", backgroundColor: "#fff3eb" }
                      : hasNormal
                        ? { color: "#b45309", backgroundColor: "#fef3c7" }
                        : {}
                  }
                  aria-label="Agregar nota"
                  title="Agregar nota"
                >
                  <StickyNote className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-[290px] p-3 z-[60]"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <UnifiedNoteEditor
                  onSave={(text, important) => {
                    const now = new Date().toISOString();
                    const prev = servicio.notasList ?? [];
                    const newNote = {
                      id: `note-${Date.now()}-0`,
                      type: important ? "important" as const : "normal" as const,
                      text: important ? text.trim().toUpperCase() : text.trim(),
                      important,
                      createdAt: now,
                    };
                    onUpdate({ ...servicio, notasList: [...prev, newNote] });
                    setOpenEditor(null);
                  }}
                  onClose={() => setOpenEditor(null)}
                />
              </PopoverContent>
            </Popover>
          );
        })()}

        {/* 🗑 Eliminar con confirmación */}
        <Popover
          open={openEditor === "confirm-delete"}
          onOpenChange={(o) => setOpenEditor(o ? "confirm-delete" : null)}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              aria-label="Quitar"
              title="Quitar servicio"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[220px] p-4 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">Eliminar servicio</div>
                <div className="text-xs text-slate-500 mt-1">¿Seguro que deseas eliminar este servicio?</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setOpenEditor(null); onRemove(); }}
                  className="flex-1 h-8 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
                  style={{ backgroundColor: "#dc2626" }}
                >
                  Eliminar
                </button>
                <button
                  type="button"
                  onClick={() => setOpenEditor(null)}
                  className="flex-1 h-8 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

/* ───────────────────────── Shared popup button styles ──────────────────────── */

const btnApply: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 10,
  background: "#802d62", color: "#fff", border: "none",
  fontSize: 15, fontWeight: 700,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", flexShrink: 0, transition: "opacity 0.15s",
};

const btnReset: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 10,
  background: "#fff", color: "#64748B", border: "1.5px solid #D8E0EE",
  fontSize: 15, fontWeight: 500,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", flexShrink: 0, transition: "background 0.15s",
};

const btnClose: React.CSSProperties = {
  background: "none", border: "none", color: "#94A3B8",
  fontSize: 13, cursor: "pointer", padding: "2px 4px",
  lineHeight: 1, borderRadius: 4,
};

/* ───────────────────────── Inline editors (popovers) ───────────────────────── */

const UBICACIONES_LIST = [
  "BOCAS DEL TORO",
  "CHIRIQUÍ",
  "CIUDAD DE PANAMÁ",
  "COCLÉ (RIVIERA PACÍFICA)",
  "COLÓN",
  "CONTADORA",
  "SAN BLAS",
  "TABOGA",
  "VERAGUAS / SANTIAGO",
];

const ESTRELLAS_LIST = ["★★★", "★★★★", "★★★★★"];

function UbicacionEditor({
  current,
  onSave,
  onClose,
}: {
  current: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(current);
  return (
    <div className="p-3 flex flex-col gap-3">
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onSave(value.trim()); }
          if (e.key === "Escape") { e.preventDefault(); onClose(); }
        }}
        placeholder="Ej. Punta Cana"
        className="w-full px-3 h-9 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#802d62]/30"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(value.trim())}
          className="flex-1 h-8 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
          style={{ backgroundColor: "#802d62" }}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-8 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function EstrellasEditor({
  current,
  onSave,
  onClose,
}: {
  current: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="py-0.5">
      {ESTRELLAS_LIST.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSave(s)}
          className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors ${
            current === s ? "text-amber-600 font-semibold" : "text-slate-700"
          }`}
        >
          {current === s && <Check className="w-3 h-3 flex-shrink-0 text-amber-500" />}
          <span className={current === s ? "" : "ml-[15px]"}>{s}</span>
        </button>
      ))}
    </div>
  );
}

function DatesEditor({
  servicio,
  onSave,
  onClose,
}: {
  servicio: ServicioSeleccionado;
  onSave: (patch: Partial<ServicioSeleccionado>) => void;
  onClose: () => void;
}) {
  const [fechaInicio, setFechaInicio] = useState(servicio.fechaInicio ?? "");
  const [fechaFin, setFechaFin] = useState(servicio.fechaFin ?? "");
  const origInicio = servicio.fechaInicio ?? "";
  const origFin = servicio.fechaFin ?? "";

  const handleSelect = (inicio: string, fin: string) => {
    setFechaInicio(inicio);
    setFechaFin(fin);
  };

  const handleApply = () => {
    onSave({
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
    });
    onClose();
  };

  const handleReset = () => {
    onSave({
      fechaInicio: origInicio || undefined,
      fechaFin: origFin || undefined,
    });
    onClose();
  };

  const noches = fechaInicio && fechaFin && fechaFin > fechaInicio
    ? nightsBetween(fechaInicio, fechaFin)
    : null;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Estadía
        </span>
        <button type="button" onClick={onClose} style={btnClose} title="Cerrar">✕</button>
      </div>
      <InlineRangePicker
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onSelect={handleSelect}
      />
      <div className="flex items-center justify-between pt-1">
        {noches !== null ? (
          <span style={{ fontSize: 11, color: "#64748B", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
            {noches} noche{noches !== 1 ? "s" : ""}
          </span>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={handleReset} style={btnReset} title="Restablecer fechas originales">↺</button>
          <button type="button" onClick={handleApply} style={btnApply} title="Aplicar">✓</button>
        </div>
      </div>
    </div>
  );
}

function PricesEditor({
  servicio,
  acomodaciones,
  ninos = 0,
  onSave,
  onClose,
}: {
  servicio: ServicioSeleccionado;
  acomodaciones: Acomodacion[];
  ninos?: number;
  onSave: (precios: ServicioSeleccionado["precios"]) => void;
  onClose: () => void;
}) {
  const initial: Record<string, string> = {
    SGL: String(servicio.precios.SGL ?? 0),
    DBL: String(servicio.precios.DBL ?? 0),
    TPL: String(servicio.precios.TPL ?? 0),
    CHD: String(servicio.precios.CHD ?? servicio.precios.chd ?? 0),
  };
  const [vals, setVals] = useState<Record<string, string>>(initial);

  const num = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  const buildPrecios = (src: Record<string, string>) => ({
    ...servicio.precios,
    SGL: num(src.SGL),
    DBL: num(src.DBL),
    TPL: num(src.TPL),
    CHD: num(src.CHD),
    chd: num(src.CHD),
  });

  const handleApply = () => {
    onSave(buildPrecios(vals));
    onClose();
  };

  const handleReset = () => {
    onSave(buildPrecios(initial));
    onClose();
  };

  return (
    <div className="p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Tarifas por noche
        </span>
        <button type="button" onClick={onClose} style={btnClose} title="Cerrar">✕</button>
      </div>
      {/* Rows */}
      <div className="space-y-1.5">
        {acomodaciones.map((a) => (
          <div key={a} className="flex items-center gap-2">
            <span style={{ fontSize: 11, fontWeight: 700, color: "#041941", width: 28, flexShrink: 0 }}>{a}</span>
            <PriceInput
              value={vals[a] ?? "0"}
              onChange={(v) => setVals((prev) => ({ ...prev, [a]: v }))}
              onApply={handleApply}
              onCancel={onClose}
              wrapperClassName="flex-1"
              inputClassName="w-full h-8 pr-2.5 rounded-md text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        ))}
        {ninos > 0 && (
          <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px dashed #f0e4ea" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", width: 28, flexShrink: 0 }}>CHD</span>
            <PriceInput
              value={vals["CHD"] ?? "0"}
              onChange={(v) => setVals((prev) => ({ ...prev, CHD: v }))}
              onApply={handleApply}
              onCancel={onClose}
              wrapperClassName="flex-1"
              inputClassName="w-full h-8 pr-2.5 rounded-md text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        )}
      </div>
      {/* Actions */}
      <div className="flex justify-end gap-2 pt-0.5">
        <button type="button" onClick={handleReset} style={btnReset} title="Restablecer tarifa original">↺</button>
        <button type="button" onClick={handleApply} style={btnApply} title="Aplicar">✓</button>
      </div>
    </div>
  );
}

function UnitPriceEditor({
  currentUnit,
  currentChd = 0,
  ninos = 0,
  onSave,
  onClose,
}: {
  currentUnit: number;
  currentChd?: number;
  ninos?: number;
  onSave: (unitVal: number | null, chdVal?: number | null) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState<string>(String(currentUnit));
  const [chdVal, setChdVal] = useState<string>(String(currentChd));

  const handleApply = () => {
    const n = parseFloat(val);
    const c = parseFloat(chdVal);
    onSave(isNaN(n) ? null : n, ninos > 0 ? (isNaN(c) ? null : c) : undefined);
    onClose();
  };

  const handleReset = () => {
    onSave(null, ninos > 0 ? null : undefined);
    onClose();
  };

  return (
    <div className="p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Precio p/p
        </span>
        <button type="button" onClick={onClose} style={btnClose} title="Cerrar">✕</button>
      </div>
      <div className="space-y-1.5">
        <PriceInput
          value={val}
          onChange={setVal}
          onApply={handleApply}
          onCancel={onClose}
          autoFocus
          wrapperClassName="w-full"
          inputClassName="w-full h-8 pr-2.5 rounded-md border border-slate-200 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        {ninos > 0 && (
          <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px dashed #f0e4ea" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", flexShrink: 0 }}>CHD</span>
            <PriceInput
              value={chdVal}
              onChange={setChdVal}
              onApply={handleApply}
              onCancel={onClose}
              wrapperClassName="flex-1"
              inputClassName="w-full h-8 pr-2.5 rounded-md border border-slate-200 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={handleReset} style={btnReset} title="Restablecer precio automático">↺</button>
        <button type="button" onClick={handleApply} style={btnApply} title="Aplicar">✓</button>
      </div>
    </div>
  );
}

/* ───────────────── NoteItem — individual note row with edit/delete ─────── */

function NoteItem({
  note,
  onEdit,
  onDelete,
}: {
  note: { id?: string; type?: "normal" | "important"; text: string; important?: boolean };
  onEdit: (newText: string) => void;
  onDelete: () => void;
}) {
  const imp = note.type === "important" || note.important === true;
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="group/note flex items-start gap-1.5 min-w-0">
      {imp ? (
        <div
          className="flex-shrink-0 self-stretch rounded-sm"
          style={{ width: 2, backgroundColor: "#EF7B15", minHeight: 14 }}
        />
      ) : (
        <span className="text-slate-400 flex-shrink-0 text-[10px] leading-[1.6]">•</span>
      )}
      <span
        className="text-[11px] leading-snug flex-1 min-w-0 break-words"
        style={{ color: imp ? "#ef7b15" : "#475569", fontWeight: imp ? 600 : 400 }}
      >
        {note.text}
      </span>
      <div className="opacity-0 group-hover/note:opacity-100 flex gap-0.5 flex-shrink-0 ml-1 transition-opacity">
        <Popover open={editOpen} onOpenChange={setEditOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-0.5 rounded hover:bg-slate-200 transition-colors"
              title="Editar nota"
            >
              <Pencil className="w-2.5 h-2.5 text-slate-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[260px] p-3 z-[70]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <NoteEditor
              tipo={imp ? "important" : "normal"}
              initialText={note.text}
              onSave={(lines) => {
                onEdit(lines[0] ?? "");
                setEditOpen(false);
              }}
              onClose={() => setEditOpen(false)}
            />
          </PopoverContent>
        </Popover>
        <button
          type="button"
          className="p-0.5 rounded hover:bg-red-100 transition-colors"
          title="Eliminar nota"
          onClick={onDelete}
        >
          <Trash2 className="w-2.5 h-2.5 text-red-400" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── TextFieldEditor — generic inline text field ─────────── */

function TextFieldEditor({
  label,
  placeholder = "",
  current,
  onSave,
  onClose,
}: {
  label: string;
  placeholder?: string;
  current: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState(current);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
  }, []);
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <button type="button" onClick={onClose} style={btnClose}>✕</button>
      </div>
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onSave(val); }
          if (e.key === "Escape") { e.preventDefault(); onClose(); }
        }}
        className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} style={btnReset} title="Cancelar">✕</button>
        <button type="button" onClick={() => onSave(val)} style={btnApply} title="Aplicar">✓</button>
      </div>
    </div>
  );
}

/* ─────────────────── RegimenEditor — régimen dropdown ───────────────────── */

const REGIMENES_LIST = [
  { value: "", label: "Sin régimen" },
  { value: "Solo alojamiento", label: "Solo alojamiento" },
  { value: "Desayuno incluido", label: "Desayuno incluido" },
  { value: "Media pensión", label: "Media pensión" },
  { value: "Pensión completa", label: "Pensión completa" },
  { value: "All inclusive", label: "All inclusive" },
];

function RegimenEditor({
  current,
  onSave,
  onClose,
}: {
  current: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="py-0.5">
      {REGIMENES_LIST.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onSave(r.value)}
          className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[11px] rounded-lg hover:bg-amber-50 hover:text-amber-700 transition-colors ${
            current === r.value ? "text-amber-700 font-semibold" : "text-slate-700"
          }`}
        >
          {current === r.value && <Check className="w-3 h-3 flex-shrink-0" />}
          <span className={current === r.value ? "" : "ml-[15px]"}>{r.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ─────────────────── SingleDateEditor — single date picker ──────────────── */

function SingleDateEditor({
  label,
  current,
  onSave,
  onClose,
}: {
  label: string;
  current: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState(current);
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <button type="button" onClick={onClose} style={btnClose}>✕</button>
      </div>
      <input
        type="date"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        autoFocus
        className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => onSave("")} style={btnReset} title="Borrar fecha">✕</button>
        <button type="button" onClick={() => onSave(val)} style={btnApply} title="Aplicar">✓</button>
      </div>
    </div>
  );
}

/* ─────────────────── NoteEditor — add or edit a single note ─────────────── */

function NoteEditor({
  tipo,
  initialText = "",
  onSave,
  onClose,
}: {
  tipo: "normal" | "important";
  initialText?: string;
  onSave: (lines: string[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const isEdit = initialText.length > 0;

  const handleApply = () => {
    const lines = text
      .split("\n")
      .map((l) => (tipo === "important" ? l.trim().toUpperCase() : l.trim()))
      .filter(Boolean);
    if (lines.length === 0) { onClose(); return; }
    onSave(lines);
    onClose();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 11, fontWeight: 700, color: tipo === "important" ? "#ef7b15" : "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
          {tipo === "important"
            ? <Flag size={11} />
            : <StickyNote size={11} />
          }
          {isEdit
            ? (tipo === "important" ? "Editar importante" : "Editar nota")
            : (tipo === "important" ? "Nota importante" : "Agregar nota")
          }
        </div>
        <button type="button" onClick={onClose} style={btnClose} title="Cerrar">✕</button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={tipo === "important" ? "Texto de la nota importante..." : "Detalles, restricciones u observaciones..."}
        rows={2}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleApply();
          }
        }}
        className={`w-full px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 resize-none ${
          tipo === "important"
            ? "placeholder:text-orange-300 focus:ring-orange-400"
            : "placeholder:text-slate-300 focus:ring-[#802d62]"
        }`}
        style={
          tipo === "important"
            ? {
                borderRadius: 14,
                border: "1px solid #EF7B15",
                color: "#ef7b15",
                fontWeight: 600,
                backgroundColor: "rgba(239,123,21,0.04)",
              }
            : {
                borderRadius: 14,
                border: "1px solid #D8E0EE",
                color: "#1e293b",
                backgroundColor: "#FFFFFF",
              }
        }
      />
      <p className="text-[10px] text-slate-400 -mt-0.5">
        {isEdit
          ? "Enter para guardar · Shift+Enter nueva línea"
          : "Enter para guardar · Shift+Enter nueva línea · varias líneas = varias notas"
        }
      </p>
      <div className="flex justify-end">
        <button type="button" onClick={handleApply} style={btnApply} title="Guardar">✓</button>
      </div>
    </div>
  );
}

/* ───────────────────────── UnifiedNoteEditor ───────────────────────── */

function UnifiedNoteEditor({
  onSave,
  onClose,
}: {
  onSave: (text: string, important: boolean) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [important, setImportant] = useState(false);

  const handleApply = () => {
    const trimmed = text.trim();
    if (!trimmed) { onClose(); return; }
    onSave(trimmed, important);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
          <StickyNote size={11} />
          Agregar nota
        </div>
        <button type="button" onClick={onClose} style={btnClose} title="Cerrar">✕</button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Detalles, restricciones u observaciones..."
        rows={2}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleApply(); }
        }}
        className="w-full px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 resize-none placeholder:text-slate-300 focus:ring-[#802d62]"
        style={{ borderRadius: 14, border: "1px solid #D8E0EE", color: "#1e293b", backgroundColor: "#FFFFFF" }}
      />
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div
          onClick={() => setImportant(v => !v)}
          className="flex items-center gap-1.5"
        >
          <div
            className="w-8 h-4 rounded-full transition-colors relative flex-shrink-0"
            style={{ backgroundColor: important ? "#ef7b15" : "#cbd5e1" }}
          >
            <div
              className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform"
              style={{ left: 2, transform: important ? "translateX(16px)" : "translateX(0)" }}
            />
          </div>
          <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: important ? "#ef7b15" : "#64748b" }}>
            <Flag size={10} />
            Nota importante
          </span>
        </div>
      </label>
      <p className="text-[10px] text-slate-400 -mt-1">Enter para guardar · Shift+Enter nueva línea</p>
      <div className="flex justify-end">
        <button type="button" onClick={handleApply} style={btnApply} title="Guardar">✓</button>
      </div>
    </div>
  );
}

/* ───────────────────────── TicketsEditor (tours) ───────────────────────── */

function TicketsEditor({
  value,
  onSave,
  onClose,
}: {
  value?: TourTickets;
  onSave: (tickets: TourTickets | undefined) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState<string>(value?.label ?? "");
  const [adultPrice, setAdultPrice] = useState<number>(value?.adultPrice ?? 0);
  const [childPriceText, setChildPriceText] = useState<string>(
    value?.childPrice !== undefined ? String(value.childPrice) : "",
  );

  const handleApply = () => {
    const childPrice = childPriceText.trim() === "" ? undefined : Number(childPriceText);
    onSave({
      enabled: true,
      label: label.trim(),
      adultPrice: Number.isFinite(adultPrice) ? adultPrice : 0,
      childPrice:
        childPrice !== undefined && Number.isFinite(childPrice) && childPrice >= 0
          ? childPrice
          : undefined,
    });
  };

  const inputClass =
    "w-full px-2.5 py-2 rounded-md border border-slate-200 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

  return (
    <div className="space-y-3">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5">
        <Ticket className="w-3 h-3" />
        Entradas
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
            Etiqueta (opcional)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej: Museo del Canal"
            autoFocus
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
              Adulto
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={String(adultPrice)}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^0-9]/g, "");
                  setAdultPrice(sanitized === "" ? 0 : Number(sanitized));
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleApply(); }
                  else if (e.key === "Escape") { e.preventDefault(); onClose(); }
                }}
                placeholder="0"
                className={`${inputClass} pl-6 tabular-nums`}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
              Niño (opcional)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={childPriceText}
                onChange={(e) => setChildPriceText(e.target.value.replace(/[^0-9]/g, ""))}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleApply(); }
                  else if (e.key === "Escape") { e.preventDefault(); onClose(); }
                }}
                placeholder="—"
                className={`${inputClass} pl-6 tabular-nums`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-2 pt-1">
        {value?.enabled ? (
          <button
            type="button"
            onClick={() => { onSave(undefined); onClose(); }}
            className="px-3 py-1.5 text-xs font-medium rounded-md text-red-500 hover:bg-red-50"
          >
            Quitar entradas
          </button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={adultPrice === 0}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

