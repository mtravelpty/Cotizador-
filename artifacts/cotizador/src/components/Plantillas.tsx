import { useState, useEffect } from "react";
import {
  Building2,
  Bus,
  Copy,
  Edit3,
  LayoutTemplate,
  MapPin,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import type { Hotel, Tour, Traslado } from "@/lib/types";
import type { Plantilla, PlantillaBlockTipo, PlantillaLoadResult } from "@/lib/plantillas";
import {
  buildServiciosFromPlantilla,
  duplicarPlantilla,
  loadPlantillas,
  loadPlantillasAsync,
  newPlantilla,
  savePlantillas,
} from "@/lib/plantillas";
import PlantillaEditor from "@/components/PlantillaEditor";

interface Props {
  hoteles: Hotel[];
  tours: Tour[];
  traslados: Traslado[];
  onUsarPlantilla: (result: PlantillaLoadResult) => void;
}

type EditorMode = { tipo: "nuevo" } | { tipo: "editar"; plantilla: Plantilla };

const BLOCK_TYPE_LABELS: Record<PlantillaBlockTipo, string> = {
  titulo: "Título",
  nota: "Nota",
  texto: "Texto",
  hotel: "Hotel",
  tour: "Tour",
  traslado: "Traslado",
  vuelo: "Vuelo",
  catamaran: "Catamarán",
  observaciones: "Observaciones",
  observacionesGenerales: "Observaciones",
  manual: "Ítem manual",
};

function plantillaResumen(p: Plantilla) {
  const counts: Partial<Record<PlantillaBlockTipo, number>> = {};
  for (const b of p.bloques) {
    counts[b.tipo] = (counts[b.tipo] ?? 0) + 1;
  }
  const obsCount = (counts.observaciones ?? 0) + (counts.observacionesGenerales ?? 0);
  const parts: string[] = [];
  if (counts.hotel) parts.push(`${counts.hotel} hotel${counts.hotel !== 1 ? "es" : ""}`);
  if (counts.tour) parts.push(`${counts.tour} tour${counts.tour !== 1 ? "s" : ""}`);
  if (counts.traslado) parts.push(`${counts.traslado} traslado${counts.traslado !== 1 ? "s" : ""}`);
  if (counts.vuelo) parts.push(`${counts.vuelo} vuelo${counts.vuelo !== 1 ? "s" : ""}`);
  if (counts.catamaran) parts.push(`${counts.catamaran} catamarán`);
  if (obsCount) parts.push("observaciones");
  return parts.length > 0 ? parts.join(" · ") : "Sin bloques";
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-PA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function Plantillas({
  hoteles,
  tours,
  traslados,
  onUsarPlantilla,
}: Props) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  useEffect(() => { loadPlantillasAsync().then(setPlantillas); }, []);
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [usandoId, setUsandoId] = useState<string | null>(null);

  const persistir = (items: Plantilla[]) => {
    savePlantillas(items);
    setPlantillas(items);
  };

  const handleSave = (p: Plantilla) => {
    if (editor?.tipo === "editar") {
      persistir(plantillas.map((x) => (x.id === p.id ? p : x)));
    } else {
      persistir([p, ...plantillas]);
    }
    setEditor(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    persistir(plantillas.filter((x) => x.id !== id));
  };

  const handleDuplicate = (p: Plantilla) => {
    const copia = duplicarPlantilla(p);
    persistir([copia, ...plantillas]);
  };

  const handleUsar = (p: Plantilla) => {
    const result = buildServiciosFromPlantilla(p, hoteles, tours, traslados);
    const { servicios, observaciones, noEncontrados } = result;

    const summaryParts: string[] = [];
    if (servicios.length > 0)
      summaryParts.push(`${servicios.length} servicio${servicios.length !== 1 ? "s" : ""}`);
    if (observaciones.length > 0)
      summaryParts.push(`${observaciones.length} observación${observaciones.length !== 1 ? "es" : ""}`);

    let msg = `¿Cargar la plantilla "${p.nombre}"?`;
    if (summaryParts.length === 0) {
      msg += "\n\nEsta plantilla no tiene servicios ni observaciones para cargar.";
    } else {
      msg += `\n\nSe cargarán: ${summaryParts.join(" · ")}.`;
    }
    if (noEncontrados.length > 0) {
      msg +=
        `\n\nNo encontrados en tarifario (se cargan como ítem manual con precio $0):\n` +
        noEncontrados
          .slice(0, 6)
          .map((x) => `• [${x.tipo}] ${x.nombre}`)
          .join("\n") +
        (noEncontrados.length > 6 ? `\n• … y ${noEncontrados.length - 6} más` : "");
    }

    if (!confirm(msg)) return;
    setUsandoId(p.id);
    window.setTimeout(() => setUsandoId(null), 800);
    onUsarPlantilla(result);
  };

  if (editor !== null) {
    const plantillaInicial =
      editor.tipo === "editar" ? editor.plantilla : newPlantilla("");
    return (
      <PlantillaEditor
        plantilla={plantillaInicial}
        hoteles={hoteles}
        tours={tours}
        traslados={traslados}
        onSave={handleSave}
        onCancel={() => setEditor(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Plantillas de cotización
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Estructuras reutilizables con hoteles, tours y traslados
          </p>
        </div>
        <button
          onClick={() => setEditor({ tipo: "nuevo" })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors shadow-sm"
          style={{ backgroundColor: "#802d62" }}
          onMouseOver={e => (e.currentTarget.style.backgroundColor = "#6b2252")}
          onMouseOut={e => (e.currentTarget.style.backgroundColor = "#802d62")}
        >
          <Plus className="w-4 h-4" />
          Nueva plantilla
        </button>
      </div>

      {plantillas.length === 0 ? (
        <EmptyState onNew={() => setEditor({ tipo: "nuevo" })} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plantillas.map((p) => (
            <PlantillaCard
              key={p.id}
              plantilla={p}
              resumen={plantillaResumen(p)}
              usando={usandoId === p.id}
              onUsar={() => handleUsar(p)}
              onEdit={() => setEditor({ tipo: "editar", plantilla: p })}
              onDuplicate={() => handleDuplicate(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlantillaCard({
  plantilla,
  resumen,
  usando,
  onUsar,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  plantilla: Plantilla;
  resumen: string;
  usando: boolean;
  onUsar: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const hotelBlocks = plantilla.bloques.filter(
    (b) => b.tipo === "hotel" && b.hotelId,
  );
  const tourBlocks = plantilla.bloques.filter(
    (b) => b.tipo === "tour" && b.tourId,
  );
  const trasladoBlocks = plantilla.bloques.filter(
    (b) => b.tipo === "traslado" && b.trasladoId,
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 leading-tight">
                {plantilla.nombre}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {formatDate(plantilla.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-4">{resumen}</p>

        {plantilla.bloques.length > 0 && (
          <div className="space-y-1 mb-4 max-h-36 overflow-y-auto">
            {plantilla.bloques.map((b) => (
              <BlockPreviewRow key={b.id} block={b} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            {hotelBlocks.length > 0 && (
              <Pill icon={<Building2 className="w-3 h-3" />} cls="bg-emerald-50 text-emerald-600">
                {hotelBlocks.length}
              </Pill>
            )}
            {tourBlocks.length > 0 && (
              <Pill icon={<MapPin className="w-3 h-3" />} cls="bg-purple-50 text-purple-600">
                {tourBlocks.length}
              </Pill>
            )}
            {trasladoBlocks.length > 0 && (
              <Pill icon={<Bus className="w-3 h-3" />} cls="bg-orange-50 text-orange-600">
                {trasladoBlocks.length}
              </Pill>
            )}
          </div>
          <div className="flex-1" />
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Duplicar"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            onClick={onUsar}
            disabled={usando}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all ${
              usando
                ? "bg-emerald-500 scale-95"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            {usando ? "¡Listo!" : "Usar plantilla"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BlockPreviewRow({ block }: { block: import("@/lib/plantillas").PlantillaBlock }) {
  if (block.tipo === "titulo") {
    return (
      <div className="text-[11px] font-semibold text-slate-700 px-2 py-0.5 flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-[#b78ca4] shrink-0" />
        {block.texto || "(sin texto)"}
      </div>
    );
  }
  if (block.tipo === "nota") {
    return (
      <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
        {block.texto || "(sin texto)"}
      </div>
    );
  }
  if (block.tipo === "texto") {
    return (
      <div className="text-[11px] text-slate-500 px-2 py-0.5 flex items-center gap-1.5 italic">
        <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
        {block.texto || "(sin texto)"}
      </div>
    );
  }
  if (block.tipo === "hotel") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5">
        <Building2 className="w-3 h-3 text-emerald-500 shrink-0" />
        <span className="text-[11px] text-slate-700 truncate">
          {block.hotelNombre || <span className="italic text-slate-400">Sin hotel</span>}
        </span>
      </div>
    );
  }
  if (block.tipo === "tour") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5">
        <MapPin className="w-3 h-3 text-purple-500 shrink-0" />
        <span className="text-[11px] text-slate-700 truncate">
          {block.tourNombre || <span className="italic text-slate-400">Sin tour</span>}
        </span>
      </div>
    );
  }
  if (block.tipo === "traslado") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5">
        <Bus className="w-3 h-3 text-orange-500 shrink-0" />
        <span className="text-[11px] text-slate-700 truncate">
          {block.trasladoNombre || <span className="italic text-slate-400">Sin traslado</span>}
        </span>
      </div>
    );
  }
  return null;
}

function Pill({
  icon,
  cls,
  children,
}: {
  icon: React.ReactNode;
  cls: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}
    >
      {icon}
      {children}
    </span>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
        <LayoutTemplate className="w-8 h-8 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-slate-700 text-base">
          Sin plantillas todavía
        </p>
        <p className="text-sm text-slate-400 mt-1">
          Crea plantillas reutilizables para circuitos multi-destino
        </p>
      </div>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors shadow-sm"
        style={{ backgroundColor: "#802d62" }}
        onMouseOver={e => (e.currentTarget.style.backgroundColor = "#6b2252")}
        onMouseOut={e => (e.currentTarget.style.backgroundColor = "#802d62")}
      >
        <Plus className="w-4 h-4" />
        Crear primera plantilla
      </button>
      <div className="grid grid-cols-3 gap-3 mt-6 max-w-sm mx-auto text-xs text-slate-500">
        {[
          { icon: <Building2 className="w-4 h-4 text-emerald-500" />, label: "Hoteles" },
          { icon: <MapPin className="w-4 h-4 text-purple-500" />, label: "Tours" },
          { icon: <Bus className="w-4 h-4 text-orange-500" />, label: "Traslados" },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 p-3 bg-slate-50 rounded-lg"
          >
            {icon}
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
