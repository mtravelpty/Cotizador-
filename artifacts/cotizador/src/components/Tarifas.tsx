import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Download,
  Hotel as HotelIcon,
  MapPin,
  Plus,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Bus,
  RefreshCw,
  Upload,
  Check,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  Search,
  ImagePlus,
} from "lucide-react";
import { compressImage } from "@/lib/image-utils";
import type { Hotel, Tour, Traslado } from "@/lib/types";
import type { CatalogInfo } from "@/lib/api";
import type { HotelLocal, TourLocal, TrasladoLocal } from "@/lib/tarifas";
import {
  duplicarHotel,
  duplicarTour,
  duplicarTraslado,
  exportarRespaldo,
  hotelFromApi,
  loadHotelesLS,
  loadHotelesLSAsync,
  loadToursLS,
  loadToursLSAsync,
  loadTrasladosLS,
  loadTrasladosLSAsync,
  newHotelLocal,
  newTourLocal,
  newTrasladoLocal,
  saveHotelesLS,
  saveToursLS,
  saveTrasladosLS,
  tourFromApi,
  trasladoFromApi,
} from "@/lib/tarifas";
import { fmt } from "@/lib/calc";

/* ─── Language detection helpers ─── */

type DetectedLang = "es" | "en" | "pt";

function detectFileLang(filename: string): DetectedLang | null {
  const n = filename.toLowerCase().replace(/[-\s]/g, "_");
  const base = n.replace(/\.(xlsx|xls)$/, "");
  if (/_en$|_en_|english/.test(base)) return "en";
  if (/_pt$|_pt_|portugu|brasil/.test(base)) return "pt";
  if (/_es$|_es_|espa[nñ]/.test(base)) return "es";
  return null;
}

const LANG_LABELS: Record<DetectedLang, string> = {
  es: "Español 🇪🇸",
  en: "English 🇺🇸",
  pt: "Português 🇧🇷",
};

/* ─── Constants ─── */

const ESTRELLAS_OPTS = ["★★★", "★★★★", "★★★★★"];
const UBICACION_OPTS = [
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
const DESAYUNO_OPTS = ["Incluido", "No incluido", "Sin régimen"];

/* ─── Shared form styles ─── */

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400";
const selectCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer";
const numCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 text-right font-mono";
const labelCls = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1";

/* ─── Modal wrapper ─── */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="font-semibold text-slate-900 text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

/* ─── Status pill ─── */

function StatusPill({ activo }: { activo: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${activo ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

/* ─── Row action buttons ─── */

function RowActions({ onEdit, onDuplicate, onToggle, activo }: { onEdit: () => void; onDuplicate: () => void; onToggle: () => void; activo: boolean }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={onToggle} title={activo ? "Desactivar" : "Activar"} className="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors">
        {activo ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
      </button>
      <button onClick={onDuplicate} title="Duplicar" className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
        <Copy className="w-4 h-4" />
      </button>
      <button onClick={onEdit} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors">
        Editar
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   HOTELES TAB
══════════════════════════════════════════════════════ */

function HotelesTab({
  apiHoteles, apiHotelesBrasil, importMercado, onChanged,
  importRef, newRef,
}: {
  apiHoteles: Hotel[]; apiHotelesBrasil?: Hotel[]; importMercado?: "general" | "brasil"; onChanged: () => void;
  importRef?: React.MutableRefObject<() => void>;
  newRef?: React.MutableRefObject<() => void>;
}) {
  const activeApiHoteles = importMercado === "brasil" ? (apiHotelesBrasil ?? []) : apiHoteles;
  const [items, setItems] = useState<HotelLocal[]>(() => loadHotelesLS());
  const [editing, setEditing] = useState<HotelLocal | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => { loadHotelesLSAsync().then(setItems); }, []);
  const filtered = query.trim()
    ? items.filter(h => `${h.nombre} ${h.codigo ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    : items;

  const persist = (next: HotelLocal[]) => { saveHotelesLS(next); setItems(next); onChanged(); };

  const handleSave = (h: HotelLocal) => {
    const exists = items.some(x => x.id === h.id);
    persist(exists ? items.map(x => x.id === h.id ? h : x) : [h, ...items]);
    setEditing(null);
  };
  const handleDelete = (id: string) => { if (!confirm("¿Eliminar este hotel?")) return; persist(items.filter(x => x.id !== id)); };
  const handleToggle = (id: string) => persist(items.map(x => x.id === id ? { ...x, activo: !x.activo, updatedAt: new Date().toISOString() } : x));
  const handleImport = () => {
    const existing = new Set(items.map(x => x.id));
    const toImport = activeApiHoteles.filter(h => !existing.has(h.id));
    if (!toImport.length) { alert("Todos los hoteles del tarifario ya están en la lista."); return; }
    if (!confirm(`¿Importar ${toImport.length} hoteles desde el tarifario?`)) return;
    persist([...toImport.map(hotelFromApi), ...items]);
  };

  if (importRef) importRef.current = handleImport;
  if (newRef) newRef.current = () => setEditing(newHotelLocal());

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState icon={<HotelIcon className="w-8 h-8 text-emerald-400" />} msg="Sin hoteles locales" onNew={() => setEditing(newHotelLocal())} newLabel="Crear hotel" />
      ) : (
        <>
        {items.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nombre o código…"
              className="w-full pl-9 pr-3 h-9 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#802d62]/20 focus:border-[#802d62]"
            />
          </div>
        )}
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <Th>Nombre</Th><Th>Categoría</Th><Th>Ubicación</Th><Th>Régimen</Th>
                <Th align="right" subtitle="Pax/Noche">DBL</Th><Th align="right" subtitle="Pax/Noche">SGL</Th><Th align="right" subtitle="Pax/Noche">TPL</Th>
                <Th>Estado</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => (
                <tr key={h.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${!h.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 max-w-[180px]">
                    <div className="font-medium text-slate-900 truncate">{h.nombre || <span className="italic text-slate-400">Sin nombre</span>}</div>
                    {h.codigo && (
                      <div className="text-[10px] font-mono mt-0.5 truncate text-slate-500">
                        {h.codigo}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{h.estrellas}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[130px] truncate">{h.ubicacion}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{h.desayuno}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(h.precios.DBL)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(h.precios.SGL)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(h.precios.TPL)}</td>
                  <td className="px-4 py-3"><StatusPill activo={h.activo} /></td>
                  <td className="px-4 py-3">
                    <RowActions onEdit={() => setEditing(h)} onDuplicate={() => persist([duplicarHotel(h), ...items])} onToggle={() => handleToggle(h.id)} activo={h.activo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {editing && (
        <Modal title={editing.createdAt === editing.updatedAt && !items.some(x => x.id === editing.id) ? "Nuevo hotel" : "Editar hotel"} onClose={() => setEditing(null)}>
          <HotelForm hotel={editing} onChange={setEditing} />
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {items.some(x => x.id === editing.id) && (
              <button onClick={() => { handleDelete(editing.id); setEditing(null); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 text-sm transition-colors">
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => handleSave({ ...editing, updatedAt: new Date().toISOString() })} title="Guardar" className="w-9 h-9 rounded-xl bg-[#802d62] hover:bg-[#6b2252] text-white flex items-center justify-center shadow-sm transition-colors">
              <Check className="w-4 h-4" />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function HotelForm({ hotel: h, onChange }: { hotel: HotelLocal; onChange: (h: HotelLocal) => void }) {
  const set = (patch: Partial<HotelLocal>) => onChange({ ...h, ...patch });
  const setP = (k: keyof typeof h.precios, v: number) => onChange({ ...h, precios: { ...h.precios, [k]: v } });
  const num = (val: string) => { const n = parseFloat(val); return isNaN(n) ? 0 : n; };
  const [urlInput, setUrlInput] = useState("");
  const [imgLoading, setImgLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImageUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    onChange({ ...h, imagenes: [...(h.imagenes ?? []), url] });
    setUrlInput("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setImgLoading(true);
    try {
      const dataUrls = await Promise.all(files.map(f => compressImage(f)));
      onChange({ ...h, imagenes: [...(h.imagenes ?? []), ...dataUrls] });
    } finally {
      setImgLoading(false);
      e.target.value = "";
    }
  };

  const removeImage = (i: number) => {
    onChange({ ...h, imagenes: (h.imagenes ?? []).filter((_, j) => j !== i) });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Nombre del hotel</label>
        <input value={h.nombre} onChange={e => set({ nombre: e.target.value })} placeholder="Ej: Hotel Marriott Panama" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Código</label>
        <input value={h.codigo ?? ""} onChange={e => set({ codigo: e.target.value })} placeholder="Ej: RGE-HOT-001" className={inputCls + " font-mono"} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Categoría / Estrellas</label>
          <select value={h.estrellas} onChange={e => set({ estrellas: e.target.value, categoria: e.target.value })} className={selectCls}>
            {ESTRELLAS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Régimen (desayuno)</label>
          <select value={h.desayuno} onChange={e => set({ desayuno: e.target.value })} className={selectCls}>
            {DESAYUNO_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Ubicación</label>
          <select value={h.ubicacion} onChange={e => set({ ubicacion: e.target.value })} className={selectCls}>
            {UBICACION_OPTS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tipo habitación</label>
          <input value={h.tipoHabitacion} onChange={e => set({ tipoHabitacion: e.target.value })} placeholder="Estándar" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Vigencia</label>
        <input value={h.vigencia} onChange={e => set({ vigencia: e.target.value })} placeholder="Ej: Ene–Dic 2026" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Tarifas (USD)</label>
        <div className="grid grid-cols-4 gap-2">
          {(["SGL", "DBL", "TPL", "CHD"] as const).map(k => (
            <div key={k}>
              <div className="text-[10px] text-center text-slate-500 mb-1 font-semibold">{k}</div>
              <input type="number" min={0} step={0.01} value={h.precios[k] || ""} onChange={e => setP(k, num(e.target.value))} placeholder="0" className={numCls} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600">Activo</label>
        <div onClick={() => set({ activo: !h.activo })} className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${h.activo ? "bg-emerald-500" : "bg-slate-300"}`}>
          <div className={`w-4 h-4 rounded-full bg-white mt-0.5 shadow transition-transform ${h.activo ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label className={labelCls}>Observaciones del hotel</label>
        <textarea
          value={h.observaciones ?? ""}
          onChange={e => set({ observaciones: e.target.value || undefined })}
          placeholder="Se copiarán automáticamente al agregar este hotel al cotizador…"
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400 resize-none"
        />
      </div>

      {/* Imágenes */}
      <div>
        <label className={labelCls}>Imágenes del hotel</label>
        <div className="space-y-2">
          {(h.imagenes ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(h.imagenes ?? []).map((img, i) => (
                <div key={i} className="relative group flex-shrink-0">
                  <img src={img} alt="" className="h-16 w-24 object-cover rounded-lg border border-slate-200" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); } }}
              placeholder="Pegar URL de imagen…"
              className={inputCls + " flex-1"}
            />
            <button
              type="button"
              onClick={addImageUrl}
              disabled={!urlInput.trim()}
              className="shrink-0 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 disabled:opacity-40 transition-colors"
            >
              Agregar
            </button>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imgLoading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {imgLoading ? "Procesando…" : "Subir desde archivo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TOURS TAB
══════════════════════════════════════════════════════ */

function ToursTab({
  apiTours, apiToursBrasil, importMercado, onChanged,
  importRef, newRef,
}: {
  apiTours: Tour[]; apiToursBrasil?: Tour[]; importMercado?: "general" | "brasil"; onChanged: () => void;
  importRef?: React.MutableRefObject<() => void>;
  newRef?: React.MutableRefObject<() => void>;
}) {
  const activeApiTours = importMercado === "brasil" ? (apiToursBrasil ?? []) : apiTours;
  const [items, setItems] = useState<TourLocal[]>(() => loadToursLS());
  const [editing, setEditing] = useState<TourLocal | null>(null);
  useEffect(() => { loadToursLSAsync().then(setItems); }, []);

  const persist = (next: TourLocal[]) => { saveToursLS(next); setItems(next); onChanged(); };

  const handleSave = (t: TourLocal) => {
    const exists = items.some(x => x.id === t.id);
    persist(exists ? items.map(x => x.id === t.id ? t : x) : [t, ...items]);
    setEditing(null);
  };
  const handleDelete = (id: string) => { if (!confirm("¿Eliminar este tour?")) return; persist(items.filter(x => x.id !== id)); };
  const handleToggle = (id: string) => persist(items.map(x => x.id === id ? { ...x, activo: !x.activo, updatedAt: new Date().toISOString() } : x));
  const handleImport = () => {
    const existing = new Set(items.map(x => x.id));
    const toImport = activeApiTours.filter(t => !existing.has(t.id));
    if (!toImport.length) { alert("Todos los tours del tarifario ya están en la lista."); return; }
    if (!confirm(`¿Importar ${toImport.length} tours desde el tarifario?`)) return;
    persist([...toImport.map(tourFromApi), ...items]);
  };

  if (importRef) importRef.current = handleImport;
  if (newRef) newRef.current = () => setEditing(newTourLocal());

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState icon={<MapPin className="w-8 h-8 text-purple-400" />} msg="Sin tours locales" onNew={() => setEditing(newTourLocal())} newLabel="Crear tour" />
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <Th>Código</Th><Th>Nombre</Th><Th>Tipo servicio</Th>
                <Th align="right">2-5 pax</Th><Th align="right">1 pax</Th>
                <Th>Estado</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {items.map(t => (
                <tr key={t.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${!t.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#802d62]">
                    {/^tour_\d+_\d+$/.test(t.id) ? "" : t.id}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate">{t.nombre || <span className="italic text-slate-400">Sin nombre</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.tipoServicio === "Privado" ? "bg-orange-50 text-orange-600" : "bg-[#f9f0f5] text-[#802d62]"}`}>
                      {t.tipoServicio ?? "Regular"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(t.precios.p2_5)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(t.precios.p1)}</td>
                  <td className="px-4 py-3"><StatusPill activo={t.activo} /></td>
                  <td className="px-4 py-3">
                    <RowActions onEdit={() => setEditing(t)} onDuplicate={() => persist([duplicarTour(t), ...items])} onToggle={() => handleToggle(t.id)} activo={t.activo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={!items.some(x => x.id === editing.id) ? "Nuevo tour" : "Editar tour"} onClose={() => setEditing(null)}>
          <TourForm tour={editing} onChange={setEditing} />
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {items.some(x => x.id === editing.id) && (
              <button onClick={() => { handleDelete(editing.id); setEditing(null); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 text-sm transition-colors">
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => handleSave({ ...editing, updatedAt: new Date().toISOString() })} title="Guardar" className="w-9 h-9 rounded-xl bg-[#802d62] hover:bg-[#6b2252] text-white flex items-center justify-center shadow-sm transition-colors">
              <Check className="w-4 h-4" />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TourForm({ tour: t, onChange }: { tour: TourLocal; onChange: (t: TourLocal) => void }) {
  const set = (patch: Partial<TourLocal>) => onChange({ ...t, ...patch });
  const setP = (k: keyof typeof t.precios, v: number) => {
    const precios = { ...t.precios, [k]: v };
    onChange({ ...t, precios, precio_por_persona: precios.p2_5 });
  };
  const num = (val: string) => { const n = parseFloat(val); return isNaN(n) ? 0 : n; };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
        El <strong>Código RGE</strong> vincula el tour con su descriptivo. Si editas un tour del tarifario, usa su código original (ej: RGE-020).
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Código RGE (ID)</label>
          <input value={t.id} onChange={e => set({ id: e.target.value.toUpperCase() })} placeholder="RGE-020" className={inputCls + " font-mono"} />
        </div>
        <div>
          <label className={labelCls}>Tipo servicio</label>
          <select value={t.tipoServicio ?? "Regular"} onChange={e => set({ tipoServicio: e.target.value as "Regular" | "Privado" })} className={selectCls}>
            <option value="Regular">Regular</option>
            <option value="Privado">Privado</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Nombre del tour</label>
        <input value={t.nombre} onChange={e => set({ nombre: e.target.value })} placeholder="Ej: City Tour & Canal de Panamá" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Categoría</label>
          <input value={t.categoria} onChange={e => set({ categoria: e.target.value })} placeholder="Ej: City Tour" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Horario</label>
          <input value={t.horario} onChange={e => set({ horario: e.target.value })} placeholder="Ej: Lun–Sab · 08:00am · 5h" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Tarifas (USD)</label>
        <div className="grid grid-cols-4 gap-2">
          {([["p1", "1 pax"], ["p2_5", "2–5 pax"], ["p6_10", "6–10 pax"], ["chd", "Niño"]] as const).map(([k, lbl]) => (
            <div key={k}>
              <div className="text-[10px] text-center text-slate-500 mb-1 font-semibold">{lbl}</div>
              <input type="number" min={0} step={0.01} value={t.precios[k] || ""} onChange={e => setP(k, num(e.target.value))} placeholder="0" className={numCls} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600">Activo</label>
        <div onClick={() => set({ activo: !t.activo })} className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${t.activo ? "bg-emerald-500" : "bg-slate-300"}`}>
          <div className={`w-4 h-4 rounded-full bg-white mt-0.5 shadow transition-transform ${t.activo ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TRASLADOS TAB
══════════════════════════════════════════════════════ */

function TrasladosTab({
  apiTraslados, apiTrasladosBrasil, importMercado, onChanged,
  importRef, newRef,
}: {
  apiTraslados: Traslado[]; apiTrasladosBrasil?: Traslado[]; importMercado?: "general" | "brasil"; onChanged: () => void;
  importRef?: React.MutableRefObject<() => void>;
  newRef?: React.MutableRefObject<() => void>;
}) {
  const activeApiTraslados = importMercado === "brasil" ? (apiTrasladosBrasil ?? []) : apiTraslados;
  const [items, setItems] = useState<TrasladoLocal[]>(() => loadTrasladosLS());
  const [editing, setEditing] = useState<TrasladoLocal | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => { loadTrasladosLSAsync().then(setItems); }, []);
  const filtered = query.trim()
    ? items.filter(t => `${t.nombre} ${t.codigo ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    : items;

  const persist = (next: TrasladoLocal[]) => { saveTrasladosLS(next); setItems(next); onChanged(); };

  const handleSave = (t: TrasladoLocal) => {
    const exists = items.some(x => x.id === t.id);
    persist(exists ? items.map(x => x.id === t.id ? t : x) : [t, ...items]);
    setEditing(null);
  };
  const handleDelete = (id: string) => { if (!confirm("¿Eliminar este traslado?")) return; persist(items.filter(x => x.id !== id)); };
  const handleToggle = (id: string) => persist(items.map(x => x.id === id ? { ...x, activo: !x.activo, updatedAt: new Date().toISOString() } : x));
  const handleImport = () => {
    const existing = new Set(items.map(x => x.id));
    const toImport = activeApiTraslados.filter(t => !existing.has(t.id));
    if (!toImport.length) { alert("Todos los traslados del tarifario ya están en la lista."); return; }
    if (!confirm(`¿Importar ${toImport.length} traslados desde el tarifario?`)) return;
    persist([...toImport.map(trasladoFromApi), ...items]);
  };

  if (importRef) importRef.current = handleImport;
  if (newRef) newRef.current = () => setEditing(newTrasladoLocal());

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState icon={<Bus className="w-8 h-8 text-orange-400" />} msg="Sin traslados locales" onNew={() => setEditing(newTrasladoLocal())} newLabel="Crear traslado" />
      ) : (
        <>
        {items.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nombre o código…"
              className="w-full pl-9 pr-3 h-9 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#802d62]/20 focus:border-[#802d62]"
            />
          </div>
        )}
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <Th>Ruta</Th><Th>Modalidad</Th>
                <Th align="right">2-5 pax</Th><Th align="right">1 pax</Th>
                <Th>Estado</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${!t.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 max-w-[220px]">
                    <div className="font-medium text-slate-900 truncate">{t.nombre || <span className="italic text-slate-400">Sin nombre</span>}</div>
                    {t.codigo && <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{t.codigo}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.tipo === "Privado" ? "bg-orange-50 text-orange-600" : "bg-[#f9f0f5] text-[#802d62]"}`}>
                      {t.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(t.precios.p2_5)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(t.precios.p1)}</td>
                  <td className="px-4 py-3"><StatusPill activo={t.activo} /></td>
                  <td className="px-4 py-3">
                    <RowActions onEdit={() => setEditing(t)} onDuplicate={() => persist([duplicarTraslado(t), ...items])} onToggle={() => handleToggle(t.id)} activo={t.activo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {editing && (
        <Modal title={!items.some(x => x.id === editing.id) ? "Nuevo traslado" : "Editar traslado"} onClose={() => setEditing(null)}>
          <TrasladoForm traslado={editing} onChange={setEditing} />
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {items.some(x => x.id === editing.id) && (
              <button onClick={() => { handleDelete(editing.id); setEditing(null); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 text-sm transition-colors">
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => handleSave({ ...editing, updatedAt: new Date().toISOString() })} title="Guardar" className="w-9 h-9 rounded-xl bg-[#802d62] hover:bg-[#6b2252] text-white flex items-center justify-center shadow-sm transition-colors">
              <Check className="w-4 h-4" />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TrasladoForm({ traslado: t, onChange }: { traslado: TrasladoLocal; onChange: (t: TrasladoLocal) => void }) {
  const set = (patch: Partial<TrasladoLocal>) => onChange({ ...t, ...patch });
  const setP = (k: keyof typeof t.precios, v: number) => {
    const precios = { ...t.precios, [k]: v };
    onChange({ ...t, precios, precio_por_persona: precios.p2_5 });
  };
  const num = (val: string) => { const n = parseFloat(val); return isNaN(n) ? 0 : n; };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Ruta origen</label>
          <input value={t.rutaOrigen ?? ""} onChange={e => set({ rutaOrigen: e.target.value, nombre: `${e.target.value} → ${t.rutaDestino ?? ""}`.trim() })} placeholder="Ej: Aeropuerto Tocumen" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Ruta destino</label>
          <input value={t.rutaDestino ?? ""} onChange={e => set({ rutaDestino: e.target.value, nombre: `${t.rutaOrigen ?? ""} → ${e.target.value}`.trim() })} placeholder="Ej: Hotel Centro" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Nombre / Descripción ruta</label>
        <input value={t.nombre} onChange={e => set({ nombre: e.target.value })} placeholder="Se genera automáticamente desde Origen → Destino" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Código</label>
        <input value={t.codigo ?? ""} onChange={e => set({ codigo: e.target.value })} placeholder="Ej: RGE-TRF-001" className={inputCls + " font-mono"} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Modalidad</label>
          <select value={t.tipo} onChange={e => set({ tipo: e.target.value as "Regular" | "Privado" })} className={selectCls}>
            <option value="Regular">Regular</option>
            <option value="Privado">Privado</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Categoría</label>
          <input value={t.categoria} onChange={e => set({ categoria: e.target.value })} placeholder="Ej: Aeropuerto" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Tarifas (USD)</label>
        <div className="grid grid-cols-4 gap-2">
          {([["p1", "1 pax"], ["p2_5", "2–5 pax"], ["p6_10", "6–10 pax"], ["chd", "Niño"]] as const).map(([k, lbl]) => (
            <div key={k}>
              <div className="text-[10px] text-center text-slate-500 mb-1 font-semibold">{lbl}</div>
              <input type="number" min={0} step={0.01} value={t.precios[k] || ""} onChange={e => setP(k, num(e.target.value))} placeholder="0" className={numCls} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600">Activo</label>
        <div onClick={() => set({ activo: !t.activo })} className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${t.activo ? "bg-emerald-500" : "bg-slate-300"}`}>
          <div className={`w-4 h-4 rounded-full bg-white mt-0.5 shadow transition-transform ${t.activo ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
      </div>
    </div>
  );
}

/* ─── Shared helpers ─── */

function Th({ children, align, subtitle }: { children?: React.ReactNode; align?: "right" | "left"; subtitle?: string }) {
  return (
    <th className={`px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 ${subtitle ? "whitespace-normal" : "whitespace-nowrap"} ${align === "right" ? "text-right" : "text-left"}`} style={subtitle ? { minWidth: 150 } : undefined}>
      {children}
      {subtitle && (
        <div className="text-slate-400 normal-case tracking-normal font-normal" style={{ fontSize: 10, lineHeight: 1.2, marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </th>
  );
}

function EmptyState({ icon, msg, onNew, newLabel }: { icon: React.ReactNode; msg: string; onNew: () => void; newLabel: string }) {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto">{icon}</div>
      <p className="text-sm font-medium text-slate-600">{msg}</p>
      <p className="text-xs text-slate-400">Los datos del tarifario Excel siguen disponibles en el cotizador para generar propuestas.</p>
      <button onClick={onNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors shadow-sm" style={{ backgroundColor: "#802d62" }} onMouseOver={e => (e.currentTarget.style.backgroundColor = "#6b2252")} onMouseOut={e => (e.currentTarget.style.backgroundColor = "#802d62")}>
        <Plus className="w-4 h-4" />{newLabel}
      </button>
    </div>
  );
}

/* ─── Language Card ─── */

type ReloadStatus = "idle" | "loading" | "success" | "error";

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} día${days !== 1 ? "s" : ""}`;
}

function statusIcon(s: ReloadStatus) {
  return s === "loading" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : s === "success" ? <Check className="w-3.5 h-3.5" /> : s === "error" ? <AlertCircle className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />;
}
function reloadBtnCls(s: ReloadStatus) {
  return s === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : s === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50";
}

interface LangCardProps {
  flag: string;
  lang: string;
  filename: string;
  loaded: boolean;
  counts?: { hoteles: number; tours: number; traslados: number } | null;
  loadedAt?: string | null;
  reloadStatus: ReloadStatus;
  onReload?: () => void;
  onUpload: () => void;
}

function LangCard({ flag, lang, filename, loaded, counts, loadedAt, reloadStatus, onReload, onUpload }: LangCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
      <div className="px-5 pt-5 pb-4 flex-1">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-2xl leading-none">{flag}</span>
          <div>
            <p className="text-sm font-bold text-slate-900">{lang}</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 ${loaded ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
              {loaded ? <><Check className="w-2.5 h-2.5" /> Cargado</> : "Sin archivo"}
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 truncate font-medium">{filename}</span>
          </div>

          {loaded && counts ? (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="text-center bg-slate-50 rounded-lg py-2">
                <div className="text-sm font-bold text-slate-800">{counts.hoteles}</div>
                <div className="text-[10px] text-slate-400 font-medium">Hoteles</div>
              </div>
              <div className="text-center bg-slate-50 rounded-lg py-2">
                <div className="text-sm font-bold text-slate-800">{counts.tours}</div>
                <div className="text-[10px] text-slate-400 font-medium">Tours</div>
              </div>
              <div className="text-center bg-slate-50 rounded-lg py-2">
                <div className="text-sm font-bold text-slate-800">{counts.traslados}</div>
                <div className="text-[10px] text-slate-400 font-medium">Traslados</div>
              </div>
            </div>
          ) : (
            <div className="py-2 text-xs text-slate-400">Sin archivo cargado</div>
          )}

          {loaded && loadedAt && (
            <p className="text-[11px] text-slate-400">Actualizado {formatRelativeTime(loadedAt)}</p>
          )}
        </div>
      </div>

      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex gap-2">
        {loaded && onReload ? (
          <button
            onClick={onReload}
            disabled={reloadStatus === "loading"}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${reloadBtnCls(reloadStatus)}`}
          >
            {statusIcon(reloadStatus)}
            {reloadStatus === "loading" ? "Actualizando..." : reloadStatus === "success" ? "Actualizado" : reloadStatus === "error" ? "Error" : "Recargar"}
          </button>
        ) : null}
        <button
          onClick={onUpload}
          disabled={reloadStatus === "loading"}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold bg-white hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          <Upload className="w-3.5 h-3.5" />
          {loaded ? "Reemplazar" : "Subir tarifario"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */

type TarifasTab = "hoteles" | "tours" | "traslados";

interface Props {
  apiHoteles: Hotel[];
  apiTours: Tour[];
  apiTraslados: Traslado[];
  apiHotelesBrasil?: Hotel[];
  apiToursBrasil?: Tour[];
  apiTrasladosBrasil?: Traslado[];
  onChanged: () => void;
  onUpload: (file: File) => Promise<void>;
  fileInfo?: CatalogInfo | null;
  onReload?: () => Promise<void>;
  fileInfoBrasil?: CatalogInfo | null;
  onReloadBrasil?: () => Promise<void>;
  onUploadBrasil?: (file: File) => Promise<void>;
  fileInfoEn?: CatalogInfo | null;
  onReloadEn?: () => Promise<void>;
  onUploadEn?: (file: File) => Promise<void>;
  fileInfoPt?: CatalogInfo | null;
  onReloadPt?: () => Promise<void>;
  onUploadPt?: (file: File) => Promise<void>;
}

const TABS: { key: TarifasTab; label: string; icon: React.ReactNode }[] = [
  { key: "hoteles",   label: "Hoteles",   icon: <HotelIcon className="w-3.5 h-3.5" /> },
  { key: "tours",     label: "Tours",     icon: <MapPin className="w-3.5 h-3.5" /> },
  { key: "traslados", label: "Traslados", icon: <Bus className="w-3.5 h-3.5" /> },
];

const TAB_LABELS: Record<TarifasTab, { singular: string; plural: string }> = {
  hoteles:   { singular: "hotel",    plural: "hoteles" },
  tours:     { singular: "tour",     plural: "tours" },
  traslados: { singular: "traslado", plural: "traslados" },
};

export default function Tarifas({
  apiHoteles, apiTours, apiTraslados,
  apiHotelesBrasil = [], apiToursBrasil = [], apiTrasladosBrasil = [],
  onChanged, onUpload, fileInfo, onReload,
  fileInfoBrasil, onReloadBrasil, onUploadBrasil,
  fileInfoEn, onReloadEn, onUploadEn,
  fileInfoPt, onReloadPt, onUploadPt,
}: Props) {
  const [tab, setTab] = useState<TarifasTab>("hoteles");
  const [importMercado, setImportMercado] = useState<"general" | "brasil">("general");
  const [reloadStatus, setReloadStatus] = useState<ReloadStatus>("idle");
  const [reloadStatusBrasil, setReloadStatusBrasil] = useState<ReloadStatus>("idle");
  const [reloadStatusEn, setReloadStatusEn] = useState<ReloadStatus>("idle");
  const [reloadStatusPt, setReloadStatusPt] = useState<ReloadStatus>("idle");
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    slot: DetectedLang;
    detectedLang: DetectedLang;
    handler: (f: File) => Promise<void>;
  } | null>(null);

  // Refs exposed by each tab so parent can trigger new/import
  const hotelImportRef = useRef<() => void>(() => {});
  const hotelNewRef = useRef<() => void>(() => {});
  const tourImportRef = useRef<() => void>(() => {});
  const tourNewRef = useRef<() => void>(() => {});
  const trasladoImportRef = useRef<() => void>(() => {});
  const trasladoNewRef = useRef<() => void>(() => {});

  const lsCounts = useMemo(() => ({
    hoteles: loadHotelesLS().length,
    tours: loadToursLS().length,
    traslados: loadTrasladosLS().length,
  }), []);

  // Active API count for the import bar
  const activeApiCount = useMemo(() => {
    const mercadoCounts = {
      hoteles:   importMercado === "brasil" ? apiHotelesBrasil.length : apiHoteles.length,
      tours:     importMercado === "brasil" ? apiToursBrasil.length   : apiTours.length,
      traslados: importMercado === "brasil" ? apiTrasladosBrasil.length : apiTraslados.length,
    };
    return mercadoCounts[tab];
  }, [tab, importMercado, apiHoteles, apiTours, apiTraslados, apiHotelesBrasil, apiToursBrasil, apiTrasladosBrasil]);

  const activeImportRef = tab === "hoteles" ? hotelImportRef : tab === "tours" ? tourImportRef : trasladoImportRef;
  const activeNewRef    = tab === "hoteles" ? hotelNewRef    : tab === "tours" ? tourNewRef    : trasladoNewRef;

  const openFilePicker = (slot: DetectedLang, handler: (f: File) => Promise<void>) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const detected = detectFileLang(file.name);
      if (detected !== null && detected !== slot) {
        setPendingUpload({ file, slot, detectedLang: detected, handler });
      } else {
        void handler(file);
      }
    };
    input.click();
  };

  const handleUploadClick = () => openFilePicker("es", onUpload);

  const makeReloadHandler = (reloader: (() => Promise<void>) | undefined, setStatus: (s: ReloadStatus) => void) => async () => {
    if (!reloader) return;
    setStatus("loading");
    try {
      await reloader();
      setStatus("success");
      window.setTimeout(() => setStatus("idle"), 2800);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 3500);
    }
  };

  const handleReload = makeReloadHandler(onReload, setReloadStatus);
  const handleReloadBrasil = makeReloadHandler(onReloadBrasil, setReloadStatusBrasil);
  const handleReloadEn = makeReloadHandler(onReloadEn, setReloadStatusEn);
  const handleReloadPt = makeReloadHandler(onReloadPt, setReloadStatusPt);

  const handleUploadEnClick = () => onUploadEn && openFilePicker("en", onUploadEn);
  const handleUploadPtClick = () => onUploadPt && openFilePicker("pt", onUploadPt);

  const handleUploadBrasilClick = () => {
    if (!onUploadBrasil) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async () => {
      if (input.files?.[0]) await onUploadBrasil(input.files[0]);
    };
    input.click();
  };

  return (
    <>
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tarifas</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Gestiona tus tarifarios y base de datos local de servicios.
          </p>
        </div>
        <button
          onClick={exportarRespaldo}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium transition-colors hover:bg-slate-50 shadow-sm"
          style={{ color: "#07152f" }}
        >
          <Download className="w-4 h-4 text-slate-400" />
          Exportar respaldo
        </button>
      </div>

      {/* ── TARIFARIOS POR IDIOMA ── */}
      <div>
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tarifarios por idioma</p>
          <p className="text-xs text-slate-400 mt-1">Gestiona y actualiza tus tarifarios Excel por idioma.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <LangCard
            flag="🇪🇸"
            lang="Español"
            filename={fileInfo?.filename ?? "TARIFARIO.xlsx"}
            loaded={true}
            counts={fileInfo?.counts}
            loadedAt={fileInfo?.loadedAt}
            reloadStatus={reloadStatus}
            onReload={onReload ? handleReload : undefined}
            onUpload={handleUploadClick}
          />
          <LangCard
            flag="🇺🇸"
            lang="English"
            filename={fileInfoEn?.filename ?? "TARIFARIO_EN.xlsx"}
            loaded={!!(fileInfoEn?.counts && fileInfoEn.counts.hoteles > 0)}
            counts={fileInfoEn?.counts}
            loadedAt={fileInfoEn?.loadedAt}
            reloadStatus={reloadStatusEn}
            onReload={onReloadEn ? handleReloadEn : undefined}
            onUpload={handleUploadEnClick}
          />
          <LangCard
            flag="🇧🇷"
            lang="Português"
            filename={fileInfoPt?.filename ?? "TARIFARIO_PT.xlsx"}
            loaded={!!(fileInfoPt?.counts && fileInfoPt.counts.hoteles > 0)}
            counts={fileInfoPt?.counts}
            loadedAt={fileInfoPt?.loadedAt}
            reloadStatus={reloadStatusPt}
            onReload={onReloadPt ? handleReloadPt : undefined}
            onUpload={handleUploadPtClick}
          />
        </div>
      </div>

      {/* ── GESTIÓN LOCAL ── */}
      <div>
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gestión local</p>
          <p className="text-xs text-slate-400 mt-1">Administra tu base de datos local e importa datos desde los tarifarios Excel.</p>
        </div>

        {/* Tab row + mercado toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {TABS.map(({ key, label, icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={active
                    ? { backgroundColor: "#802d62", color: "#fff", boxShadow: "0 1px 4px rgba(128,45,98,0.3)" }
                    : { color: "#64748b" }
                  }
                >
                  {icon}
                  {label}
                  {lsCounts[key] > 0 && (
                    <span
                      className="ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={active
                        ? { backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }
                        : { backgroundColor: "#f9f0f5", color: "#802d62" }
                      }
                    >
                      {lsCounts[key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Importar desde:</span>
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setImportMercado("general")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${importMercado === "general" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                General
              </button>
              <button
                onClick={() => setImportMercado("brasil")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${importMercado === "brasil" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                Brasil
              </button>
            </div>
          </div>
        </div>

        {/* Import bar + New button */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {activeApiCount > 0 && (
            <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  Importar {TAB_LABELS[tab].plural} desde {importMercado === "brasil" ? "Brasil" : "General"}
                  <span className="ml-1.5 text-xs font-normal text-slate-400">({activeApiCount} registros)</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Se agregarán solo los nuevos registros o se actualizarán los existentes.</p>
              </div>
              <button
                onClick={() => activeImportRef.current()}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors shadow-sm"
                style={{ backgroundColor: "#802d62" }}
                onMouseOver={e => (e.currentTarget.style.backgroundColor = "#003F96")}
                onMouseOut={e => (e.currentTarget.style.backgroundColor = "#802d62")}
              >
                <Download className="w-4 h-4" />
                Importar {TAB_LABELS[tab].plural}
              </button>
            </div>
          )}
          <button
            onClick={() => activeNewRef.current()}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors shadow-sm"
            style={{ backgroundColor: "#802d62" }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = "#003F96")}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = "#802d62")}
          >
            <Plus className="w-4 h-4" />
            Nuevo {TAB_LABELS[tab].singular}
          </button>
        </div>

        {/* Tab content */}
        {tab === "hoteles" && (
          <HotelesTab
            apiHoteles={apiHoteles} apiHotelesBrasil={apiHotelesBrasil}
            importMercado={importMercado} onChanged={onChanged}
            importRef={hotelImportRef} newRef={hotelNewRef}
          />
        )}
        {tab === "tours" && (
          <ToursTab
            apiTours={apiTours} apiToursBrasil={apiToursBrasil}
            importMercado={importMercado} onChanged={onChanged}
            importRef={tourImportRef} newRef={tourNewRef}
          />
        )}
        {tab === "traslados" && (
          <TrasladosTab
            apiTraslados={apiTraslados} apiTrasladosBrasil={apiTrasladosBrasil}
            importMercado={importMercado} onChanged={onChanged}
            importRef={trasladoImportRef} newRef={trasladoNewRef}
          />
        )}
      </div>
    </div>

    {/* Wrong-language upload warning modal */}
    {pendingUpload && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          <div className="flex items-start gap-4 p-6 border-b border-amber-100 bg-amber-50">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Posible idioma incorrecto</h3>
              <p className="text-sm text-slate-600 mt-1">
                El archivo <span className="font-medium text-slate-900">"{pendingUpload.file.name}"</span> parece ser un tarifario en{" "}
                <span className="font-semibold text-amber-700">{LANG_LABELS[pendingUpload.detectedLang]}</span>, pero se está cargando en el slot de{" "}
                <span className="font-semibold text-slate-800">{LANG_LABELS[pendingUpload.slot]}</span>.
              </p>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500 mb-5">
              Si el archivo es correcto, haz clic en <strong>Cargar de todas formas</strong>. De lo contrario, cancela y selecciona el archivo adecuado.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingUpload(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const { file, handler } = pendingUpload;
                  setPendingUpload(null);
                  await handler(file);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors"
              >
                Cargar de todas formas
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
