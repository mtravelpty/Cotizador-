import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Copy,
  Download,
  Edit3,
  Plus,
  Search,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { Descriptivo } from "@/lib/types";
import type { DescriptivoLocal } from "@/lib/descriptivos";
import {
  duplicarDescriptivo,
  fromDescriptivo,
  loadDescriptivosLS,
  loadDescriptivosLSAsync,
  newDescriptivoLocal,
  saveDescriptivosLS,
} from "@/lib/descriptivos";
import DescriptivoEditor from "@/components/DescriptivoEditor";

interface Props {
  apiDescriptivos: Descriptivo[];
  onChanged: () => void;
}

const CATEGORIAS_FILTER = ["Todos", "Tour", "City Tour", "Traslado", "Excursión", "Hotel", "Crucero", "Aventura", "Cultural", "Gastronómico", "Otro"];

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

export default function Descriptivos({ apiDescriptivos, onChanged }: Props) {
  const [items, setItems] = useState<DescriptivoLocal[]>(() => loadDescriptivosLS());
  const [editing, setEditing] = useState<DescriptivoLocal | null>(null);
  useEffect(() => { loadDescriptivosLSAsync().then(setItems); }, []);
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState<"todos" | "activo" | "inactivo">("todos");

  const persist = (next: DescriptivoLocal[]) => {
    setItems(next);
    onChanged();
    void saveDescriptivosLS(next);
  };

  const handleSave = (d: DescriptivoLocal) => {
    const exists = items.some((x) => x.id === d.id);
    if (exists) {
      persist(items.map((x) => (x.id === d.id ? d : x)));
    } else {
      persist([d, ...items]);
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este descriptivo?")) return;
    persist(items.filter((x) => x.id !== id));
  };

  const handleDuplicate = (d: DescriptivoLocal) => {
    persist([duplicarDescriptivo(d), ...items]);
  };

  const handleToggleActive = (id: string) => {
    persist(items.map((x) => (x.id === id ? { ...x, activo: !x.activo, updatedAt: new Date().toISOString() } : x)));
  };

  const handleImportFromApi = () => {
    if (apiDescriptivos.length === 0) {
      alert("No hay descriptivos del tarifario para importar.");
      return;
    }
    const existingCodes = new Set(items.map((x) => x.codigo.trim().toUpperCase()));
    const toImport = apiDescriptivos.filter(
      (d) => !existingCodes.has((d.codigo ?? "").trim().toUpperCase()),
    );
    if (toImport.length === 0) {
      alert("Todos los descriptivos del tarifario ya están en la biblioteca.");
      return;
    }
    if (!confirm(`¿Importar ${toImport.length} descriptivo${toImport.length !== 1 ? "s" : ""} desde el tarifario?`)) return;
    persist([...toImport.map(fromDescriptivo), ...items]);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((d) => {
      if (q && !d.titulo.toLowerCase().includes(q) && !d.codigo.toLowerCase().includes(q) && !(d.categoria ?? "").toLowerCase().includes(q)) return false;
      if (filterCat !== "Todos" && d.categoria !== filterCat) return false;
      if (filterStatus === "activo" && !d.activo) return false;
      if (filterStatus === "inactivo" && d.activo) return false;
      return true;
    });
  }, [items, query, filterCat, filterStatus]);

  if (editing !== null) {
    return (
      <DescriptivoEditor
        descriptivo={editing}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Biblioteca de descriptivos
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Crea y gestiona los descriptivos turísticos vinculados por código al tarifario
          </p>
        </div>
        <div className="flex items-center gap-2">
          {apiDescriptivos.length > 0 && (
            <button
              onClick={handleImportFromApi}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
              title={`Importar descriptivos del tarifario (${apiDescriptivos.length})`}
            >
              <Download className="w-4 h-4" />
              Importar del tarifario
            </button>
          )}
          <button
            onClick={() => setEditing(newDescriptivoLocal())}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors shadow-sm"
            style={{ backgroundColor: "#802d62" }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = "#6b2252")}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = "#802d62")}
          >
            <Plus className="w-4 h-4" />
            Nuevo descriptivo
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código, título o categoría..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
        >
          {CATEGORIAS_FILTER.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        {items.length > 0 && (
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {filtered.length} de {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          onNew={() => setEditing(newDescriptivoLocal())}
          onImport={apiDescriptivos.length > 0 ? handleImportFromApi : undefined}
          apiCount={apiDescriptivos.length}
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm bg-white border border-slate-200 rounded-2xl">
          Sin resultados para los filtros actuales
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => (
            <DescriptivoRow
              key={d.id}
              d={d}
              onEdit={() => setEditing(d)}
              onDuplicate={() => handleDuplicate(d)}
              onDelete={() => handleDelete(d.id)}
              onToggle={() => handleToggleActive(d.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DescriptivoRow({
  d,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
}: {
  d: DescriptivoLocal;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const parCount = d.parrafos.filter(Boolean).length;
  const incluyeCount = d.incluyeItems.filter(Boolean).length;
  const obsCount = d.observacionesItems.filter(Boolean).length;

  return (
    <div
      className={`bg-white border rounded-xl shadow-sm transition-all hover:shadow-md ${
        d.activo ? "border-slate-200" : "border-slate-100 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              {d.codigo || "—"}
            </span>
            {d.categoria && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                {d.categoria}
              </span>
            )}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                d.activo
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {d.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
          <div className="font-medium text-slate-900 text-sm mt-0.5 truncate">
            {d.titulo || <span className="italic text-slate-400">(sin título)</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {d.horario && (
              <span className="text-[10px] text-slate-400 truncate max-w-40">
                {d.horario}
              </span>
            )}
            {parCount > 0 && (
              <span className="text-[10px] text-slate-400">{parCount} párrafo{parCount !== 1 ? "s" : ""}</span>
            )}
            {incluyeCount > 0 && (
              <span className="text-[10px] text-emerald-600">{incluyeCount} incluye</span>
            )}
            {obsCount > 0 && (
              <span className="text-[10px] text-orange-500">{obsCount} obs.</span>
            )}
            <span className="text-[10px] text-slate-300">
              Editado: {formatDate(d.updatedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggle}
            title={d.activo ? "Desactivar" : "Activar"}
            className="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            {d.activo ? (
              <ToggleRight className="w-5 h-5 text-emerald-500" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={onDuplicate}
            title="Duplicar"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            title="Eliminar"
            className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors ml-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onNew,
  onImport,
  apiCount,
}: {
  onNew: () => void;
  onImport?: () => void;
  apiCount: number;
}) {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
        <BookOpen className="w-8 h-8 text-amber-500" />
      </div>
      <div>
        <p className="font-semibold text-slate-700 text-base">Sin descriptivos todavía</p>
        <p className="text-sm text-slate-400 mt-1">
          Crea descriptivos turísticos vinculados a tus servicios por código
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={onNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors shadow-sm"
          style={{ backgroundColor: "#802d62" }}
          onMouseOver={e => (e.currentTarget.style.backgroundColor = "#6b2252")}
          onMouseOut={e => (e.currentTarget.style.backgroundColor = "#802d62")}
        >
          <Plus className="w-4 h-4" />
          Crear descriptivo
        </button>
        {onImport && apiCount > 0 && (
          <button
            onClick={onImport}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Importar {apiCount} del tarifario
          </button>
        )}
      </div>
    </div>
  );
}
