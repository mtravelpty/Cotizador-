import { useEffect, useRef, useState } from "react";
import {
  AlignLeft,
  ArrowLeft,
  Building2,
  Bus,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  MapPin,
  Plane,
  Plus,
  Save,
  Ship,
  Sparkles,
  StickyNote,
  Trash2,
  Type,
  X,
} from "lucide-react";
import type { Hotel, Tour, Traslado } from "@/lib/types";
import type { Plantilla, PlantillaBlock, PlantillaBlockTipo } from "@/lib/plantillas";
import { newBlock } from "@/lib/plantillas";

interface CatalogItem {
  id: string;
  nombre: string;
}

function CatalogPicker<T extends CatalogItem>({
  items,
  selectedId,
  selectedNombre,
  placeholder,
  onSelect,
}: {
  items: T[];
  selectedId?: string;
  selectedNombre?: string;
  placeholder: string;
  onSelect: (item: T | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const filtered =
    query.length >= 1
      ? items
          .filter((i) => i.nombre.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 10)
      : [];

  if (selectedId && selectedNombre && !open) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-sm">
        <span className="flex-1 text-slate-900 font-medium truncate">
          {selectedNombre}
        </span>
        <button
          type="button"
          onClick={() => { onSelect(null); setQuery(""); }}
          className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
          aria-label="Quitar selección"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onSelect(item); setQuery(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-slate-900 hover:bg-primary/5 transition-colors truncate border-b border-slate-50 last:border-0"
            >
              {item.nombre}
            </button>
          ))}
        </div>
      )}
      {open && query.length >= 1 && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl px-3 py-2 text-sm text-slate-400">
          Sin resultados para "{query}"
        </div>
      )}
    </div>
  );
}

const BLOCK_META: Record<
  PlantillaBlockTipo,
  { label: string; badgeCls: string; icon: React.ReactNode }
> = {
  titulo: {
    label: "Título",
    badgeCls: "bg-[#f9f0f5] text-[#802d62]",
    icon: <Type className="w-3 h-3" />,
  },
  nota: {
    label: "Nota",
    badgeCls: "bg-amber-100 text-amber-700",
    icon: <StickyNote className="w-3 h-3" />,
  },
  texto: {
    label: "Texto",
    badgeCls: "bg-slate-100 text-slate-600",
    icon: <AlignLeft className="w-3 h-3" />,
  },
  hotel: {
    label: "Hotel",
    badgeCls: "bg-emerald-100 text-emerald-700",
    icon: <Building2 className="w-3 h-3" />,
  },
  tour: {
    label: "Tour",
    badgeCls: "bg-purple-100 text-purple-700",
    icon: <MapPin className="w-3 h-3" />,
  },
  traslado: {
    label: "Traslado",
    badgeCls: "bg-orange-100 text-orange-700",
    icon: <Bus className="w-3 h-3" />,
  },
  vuelo: {
    label: "Vuelo",
    badgeCls: "bg-[#f3e8ef] text-[#6b2252]",
    icon: <Plane className="w-3 h-3" />,
  },
  catamaran: {
    label: "Catamarán",
    badgeCls: "bg-[#fdf4f9] text-[#802d62]",
    icon: <Ship className="w-3 h-3" />,
  },
  observaciones: {
    label: "Observaciones",
    badgeCls: "bg-violet-100 text-violet-700",
    icon: <ClipboardList className="w-3 h-3" />,
  },
  observacionesGenerales: {
    label: "Observaciones",
    badgeCls: "bg-violet-100 text-violet-700",
    icon: <ClipboardList className="w-3 h-3" />,
  },
  manual: {
    label: "Ítem personalizado",
    badgeCls: "bg-pink-100 text-pink-700",
    icon: <Sparkles className="w-3 h-3" />,
  },
};

const ADD_BLOCK_TYPES: PlantillaBlockTipo[] = [
  "hotel",
  "tour",
  "traslado",
  "vuelo",
  "catamaran",
  "observacionesGenerales",
];

interface BlockEditorProps {
  block: PlantillaBlock;
  isFirst: boolean;
  isLast: boolean;
  hoteles: Hotel[];
  tours: Tour[];
  traslados: Traslado[];
  onChange: (patch: Partial<PlantillaBlock>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function BlockEditor({
  block,
  isFirst,
  isLast,
  hoteles,
  tours,
  traslados,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: BlockEditorProps) {
  const meta = BLOCK_META[block.tipo];

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400";
  const textareaCls =
    "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400 resize-none";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 rounded-t-xl">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.badgeCls}`}
        >
          {meta.icon}
          {meta.label}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5">
          <IconBtn
            title="Subir"
            disabled={isFirst}
            onClick={onMoveUp}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn
            title="Bajar"
            disabled={isLast}
            onClick={onMoveDown}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn title="Duplicar" onClick={onDuplicate}>
            <Copy className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn title="Eliminar" onClick={onDelete} danger>
            <Trash2 className="w-3.5 h-3.5" />
          </IconBtn>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {block.tipo === "titulo" && (
          <input
            value={block.texto ?? ""}
            onChange={(e) => onChange({ texto: e.target.value })}
            placeholder="Ej: Hoteles en Ciudad de Panamá"
            className={inputCls + " font-semibold text-base"}
          />
        )}

        {block.tipo === "nota" && (
          <textarea
            value={block.texto ?? ""}
            onChange={(e) => onChange({ texto: e.target.value })}
            placeholder="Ej: Tarifas netas por persona por noche. Incluye desayuno diario."
            rows={2}
            className={textareaCls}
          />
        )}

        {block.tipo === "texto" && (
          <textarea
            value={block.texto ?? ""}
            onChange={(e) => onChange({ texto: e.target.value })}
            placeholder="Texto libre..."
            rows={3}
            className={textareaCls}
          />
        )}

        {block.tipo === "hotel" && (
          <>
            <CatalogPicker
              items={hoteles}
              selectedId={block.hotelId}
              selectedNombre={block.hotelNombre}
              placeholder="Buscar hotel..."
              onSelect={(h) =>
                onChange(
                  h
                    ? { hotelId: h.id, hotelNombre: h.nombre }
                    : { hotelId: undefined, hotelNombre: undefined },
                )
              }
            />
            <textarea
              value={block.hotelNotas ?? ""}
              onChange={(e) => onChange({ hotelNotas: e.target.value })}
              placeholder="Notas opcionales (ej: incluye desayuno, vista al mar...)"
              rows={2}
              className={textareaCls}
            />
          </>
        )}

        {block.tipo === "tour" && (
          <CatalogPicker
            items={tours}
            selectedId={block.tourId}
            selectedNombre={block.tourNombre}
            placeholder="Buscar tour..."
            onSelect={(t) =>
              onChange(
                t
                  ? { tourId: t.id, tourNombre: t.nombre }
                  : { tourId: undefined, tourNombre: undefined },
              )
            }
          />
        )}

        {block.tipo === "traslado" && (
          <CatalogPicker
            items={traslados}
            selectedId={block.trasladoId}
            selectedNombre={block.trasladoNombre}
            placeholder="Buscar traslado..."
            onSelect={(tr) =>
              onChange(
                tr
                  ? { trasladoId: tr.id, trasladoNombre: tr.nombre }
                  : { trasladoId: undefined, trasladoNombre: undefined },
              )
            }
          />
        )}

        {block.tipo === "vuelo" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={block.vueloOrigen ?? ""}
                onChange={(e) => onChange({ vueloOrigen: e.target.value })}
                placeholder="Origen (ej: PTY)"
                className={inputCls}
              />
              <input
                value={block.vueloDestino ?? ""}
                onChange={(e) => onChange({ vueloDestino: e.target.value })}
                placeholder="Destino (ej: MIA)"
                className={inputCls}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={block.vueloIdaVuelta ?? false}
                onChange={(e) => onChange({ vueloIdaVuelta: e.target.checked })}
                className="rounded border-slate-300 text-primary focus:ring-primary/40"
              />
              Ida y vuelta
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Precio adulto p/p</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={block.vueloPrecio ?? ""}
                  onChange={(e) => onChange({ vueloPrecio: e.target.value === "" ? undefined : Number(e.target.value) })}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Precio niño p/p</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={block.vueloPrecioChd ?? ""}
                  onChange={(e) => onChange({ vueloPrecioChd: e.target.value === "" ? undefined : Number(e.target.value) })}
                  placeholder="Igual que adulto"
                  className={inputCls}
                />
              </div>
            </div>
            <textarea
              value={block.vueloNotas ?? ""}
              onChange={(e) => onChange({ vueloNotas: e.target.value })}
              placeholder="Notas opcionales (ej: incluye equipaje de mano...)"
              rows={2}
              className={textareaCls}
            />
          </>
        )}

        {block.tipo === "catamaran" && (
          <CatalogPicker
            items={tours}
            selectedId={block.catamaranId}
            selectedNombre={block.catamaranNombre}
            placeholder="Buscar catamarán..."
            onSelect={(t) =>
              onChange(
                t
                  ? { catamaranId: t.id, catamaranNombre: t.nombre }
                  : { catamaranId: undefined, catamaranNombre: undefined },
              )
            }
          />
        )}

        {(block.tipo === "observaciones" || block.tipo === "observacionesGenerales") && (
          <>
            <p className="text-[11px] text-slate-400 -mb-1">Una observación por línea. Se agregarán a la sección de observaciones de la cotización al usar la plantilla.</p>
            <textarea
              value={block.texto ?? ""}
              onChange={(e) => onChange({ texto: e.target.value })}
              placeholder={"Tarifas sujetas a disponibilidad\nNo incluye entradas a parques\nDocumentación requerida: pasaporte vigente"}
              rows={4}
              className={textareaCls}
            />
          </>
        )}

        {block.tipo === "manual" && (
          <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-pink-50 border border-pink-100">
            <Sparkles className="w-4 h-4 text-pink-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{block.manualNombre ?? "Ítem sin nombre"}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {block.manualTipo && <span className="capitalize">{block.manualTipo}</span>}
                {block.manualPrecios && (() => {
                  const p = block.manualPrecios;
                  const precio = p.p1 ?? p.SGL ?? p.DBL ?? 0;
                  return precio > 0 ? <span> · USD {precio.toLocaleString("es-ES")}</span> : null;
                })()}
                {block.manualNotas && <span> · {block.manualNotas}</span>}
              </div>
              <p className="text-[10px] text-pink-400 mt-1">Ítem personalizado — los precios se restauran automáticamente al cargar la plantilla</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  plantilla: Plantilla;
  hoteles: Hotel[];
  tours: Tour[];
  traslados: Traslado[];
  onSave: (p: Plantilla) => void;
  onCancel: () => void;
}

export default function PlantillaEditor({
  plantilla,
  hoteles,
  tours,
  traslados,
  onSave,
  onCancel,
}: Props) {
  const [nombre, setNombre] = useState(plantilla.nombre);
  const [bloques, setBloques] = useState<PlantillaBlock[]>(plantilla.bloques);
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addOpen) return;
    const onClick = (e: MouseEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node))
        setAddOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [addOpen]);

  const updateBlock = (idx: number, patch: Partial<PlantillaBlock>) => {
    setBloques((prev) =>
      prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    );
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    setBloques((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const duplicateBlock = (idx: number) => {
    setBloques((prev) => {
      const b = { ...prev[idx], id: `blk_${Date.now()}_${Math.random().toString(36).slice(2)}` };
      const next = [...prev];
      next.splice(idx + 1, 0, b);
      return next;
    });
  };

  const deleteBlock = (idx: number) => {
    setBloques((prev) => prev.filter((_, i) => i !== idx));
  };

  const addBlockOfType = (tipo: PlantillaBlockTipo) => {
    setBloques((prev) => [...prev, newBlock(tipo)]);
    setAddOpen(false);
  };

  const handleSave = () => {
    if (!nombre.trim()) return;
    onSave({
      ...plantilla,
      nombre: nombre.trim(),
      bloques,
      updatedAt: new Date().toISOString(),
    });
  };

  const hotelCount = bloques.filter((b) => b.tipo === "hotel" && b.hotelId).length;
  const tourCount = bloques.filter((b) => b.tipo === "tour" && b.tourId).length;
  const trasladoCount = bloques.filter((b) => b.tipo === "traslado" && b.trasladoId).length;
  const vueloCount = bloques.filter((b) => b.tipo === "vuelo" && (b.vueloOrigen || b.vueloDestino)).length;
  const catamaranCount = bloques.filter((b) => b.tipo === "catamaran" && b.catamaranId).length;
  const manualCount = bloques.filter((b) => b.tipo === "manual" && b.manualNombre).length;
  const obsCount = bloques.filter(
    (b) => (b.tipo === "observaciones" || b.tipo === "observacionesGenerales") && b.texto?.trim(),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {hotelCount > 0 && <span>{hotelCount} hotel{hotelCount !== 1 ? "es" : ""}</span>}
          {tourCount > 0 && <span>· {tourCount} tour{tourCount !== 1 ? "s" : ""}</span>}
          {trasladoCount > 0 && <span>· {trasladoCount} traslado{trasladoCount !== 1 ? "s" : ""}</span>}
          {vueloCount > 0 && <span>· {vueloCount} vuelo{vueloCount !== 1 ? "s" : ""}</span>}
          {catamaranCount > 0 && <span>· {catamaranCount} catamarán</span>}
          {manualCount > 0 && <span>· {manualCount} personalizado{manualCount !== 1 ? "s" : ""}</span>}
          {obsCount > 0 && <span>· {obsCount} obs</span>}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!nombre.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Guardar plantilla
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Nombre de la plantilla
        </label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Ciudad + Contadora + Bocas"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        {bloques.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm bg-white border border-dashed border-slate-200 rounded-xl">
            Sin bloques. Agrega uno con el botón de abajo.
          </div>
        )}
        {bloques.map((blk, idx) => (
          <BlockEditor
            key={blk.id}
            block={blk}
            isFirst={idx === 0}
            isLast={idx === bloques.length - 1}
            hoteles={hoteles}
            tours={tours}
            traslados={traslados}
            onChange={(patch) => updateBlock(idx, patch)}
            onMoveUp={() => moveBlock(idx, -1)}
            onMoveDown={() => moveBlock(idx, 1)}
            onDuplicate={() => duplicateBlock(idx)}
            onDelete={() => deleteBlock(idx)}
          />
        ))}
      </div>

      <div ref={addRef} className="relative">
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Agregar bloque
        </button>
        {addOpen && (
          <div className="absolute z-20 mt-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl p-3 grid grid-cols-3 gap-2">
            {ADD_BLOCK_TYPES.map((tipo) => {
              const meta = BLOCK_META[tipo];
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => addBlockOfType(tipo)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.badgeCls}`}
                  >
                    {meta.icon}
                  </span>
                  <span className="text-xs font-medium">{meta.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        danger
          ? "hover:bg-red-50 hover:text-red-500 text-slate-400"
          : "hover:bg-slate-200 text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}
