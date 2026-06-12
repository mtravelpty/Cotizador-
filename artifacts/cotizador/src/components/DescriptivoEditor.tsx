import { useState } from "react";
import { ArrowLeft, Plus, Save, Trash2, Eye, Edit3, Languages, Loader2 } from "lucide-react";
import type { DescriptivoLocal } from "@/lib/descriptivos";
import { buildDescriptivoPreviewHtml } from "@/lib/descriptivos";

const CATEGORIAS = [
  "Tour","City Tour","Traslado","Excursión","Hotel","Crucero","Aventura","Cultural","Gastronómico","Otro",
];

interface Props {
  descriptivo: DescriptivoLocal;
  onSave: (d: DescriptivoLocal) => void;
  onCancel: () => void;
}

type Tab = "editar" | "preview";
type LangTab = "es" | "en" | "pt";

const LANG_LABELS: Record<LangTab, string> = { es: "ES", en: "EN", pt: "PT" };

async function myMemoryTranslate(text: string, from: string, to: string): Promise<string> {
  if (!text.trim()) return "";
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Translation failed");
  const data = await res.json();
  return data?.responseData?.translatedText ?? text;
}

async function translateAll(d: DescriptivoLocal, to: LangTab): Promise<Partial<DescriptivoLocal>> {
  const lang = to === "en" ? "en-GB" : "pt-BR";
  const [titulo, notaImportante, ...rest] = await Promise.all([
    myMemoryTranslate(d.titulo, "es", lang),
    myMemoryTranslate(d.notaImportante ?? "", "es", lang),
    ...d.parrafos.map((p) => myMemoryTranslate(p, "es", lang)),
    ...d.incluyeItems.map((p) => myMemoryTranslate(p, "es", lang)),
    ...d.observacionesItems.map((p) => myMemoryTranslate(p, "es", lang)),
    ...d.recomendacionesItems.map((p) => myMemoryTranslate(p, "es", lang)),
  ]);
  const nParrafos = d.parrafos.length;
  const nIncluye = d.incluyeItems.length;
  const nObs = d.observacionesItems.length;
  const parrafos = rest.slice(0, nParrafos);
  const incluye = rest.slice(nParrafos, nParrafos + nIncluye);
  const obsItems = rest.slice(nParrafos + nIncluye, nParrafos + nIncluye + nObs);
  const recItems = rest.slice(nParrafos + nIncluye + nObs);

  if (to === "en") {
    return {
      titulo_en: titulo,
      parrafos_en: parrafos,
      incluyeItems_en: incluye,
      observacionesItems_en: obsItems,
      recomendacionesItems_en: recItems,
      notaImportante_en: notaImportante,
    };
  }
  return {
    titulo_pt: titulo,
    parrafos_pt: parrafos,
    incluyeItems_pt: incluye,
    observacionesItems_pt: obsItems,
    recomendacionesItems_pt: recItems,
    notaImportante_pt: notaImportante,
  };
}

function LineListEditor({
  label, items, placeholder, onChange, accentCls,
}: {
  label: string; items: string[]; placeholder: string;
  onChange: (items: string[]) => void; accentCls: string;
}) {
  const update = (idx: number, val: string) => { const n = [...items]; n[idx] = val; onChange(n); };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, ""]);

  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</label>
      <div className={`border-l-4 ${accentCls} pl-3 space-y-1.5`}>
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => update(idx, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400"
            />
            <button type="button" onClick={() => remove(idx)} className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button type="button" onClick={add} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors mt-1">
          <Plus className="w-3.5 h-3.5" />
          Agregar línea
        </button>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400";

export default function DescriptivoEditor({ descriptivo, onSave, onCancel }: Props) {
  const [d, setD] = useState<DescriptivoLocal>({ ...descriptivo });
  const [tab, setTab] = useState<Tab>("editar");
  const [langTab, setLangTab] = useState<LangTab>("es");
  const [translating, setTranslating] = useState<false | "en" | "pt">(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const patch = (p: Partial<DescriptivoLocal>) => setD((prev) => ({ ...prev, ...p }));

  const handleSave = () => {
    if (!d.codigo.trim()) { alert("El código es obligatorio."); return; }
    if (!d.titulo.trim()) { alert("El título es obligatorio."); return; }
    onSave({ ...d, updatedAt: new Date().toISOString() });
  };

  const handleTranslate = async (to: "en" | "pt") => {
    if (translating) return;
    setTranslating(to);
    setTranslateError(null);
    try {
      const translated = await translateAll(d, to);
      patch(translated);
    } catch {
      setTranslateError("Error al traducir. Verifica la conexión.");
    } finally {
      setTranslating(false);
    }
  };

  const renderLangFields = () => {
    if (langTab === "es") {
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Párrafos descriptivos</label>
            <div className="border-l-4 border-slate-200 pl-3 space-y-1.5">
              {d.parrafos.map((p, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <textarea
                    value={p}
                    onChange={(e) => { const n = [...d.parrafos]; n[idx] = e.target.value; patch({ parrafos: n }); }}
                    placeholder="Párrafo de descripción..."
                    rows={2}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400 resize-none"
                  />
                  <button type="button" onClick={() => patch({ parrafos: d.parrafos.filter((_, i) => i !== idx) })} className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors mt-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => patch({ parrafos: [...d.parrafos, ""] })} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors mt-1">
                <Plus className="w-3.5 h-3.5" />Agregar párrafo
              </button>
            </div>
          </div>
          <LineListEditor label="Incluye" items={d.incluyeItems} placeholder="Ej: Transporte, guía certificado..." onChange={(items) => patch({ incluyeItems: items })} accentCls="border-emerald-400" />
          <LineListEditor label="Observaciones" items={d.observacionesItems} placeholder="Ej: Reservar con anticipación..." onChange={(items) => patch({ observacionesItems: items })} accentCls="border-orange-400" />
          <LineListEditor label="Recomendaciones" items={d.recomendacionesItems} placeholder="Ej: Usar ropa cómoda..." onChange={(items) => patch({ recomendacionesItems: items })} accentCls="border-[#b78ca4]" />
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Nota importante</label>
            <div className="border-l-4 border-red-400 pl-3">
              <textarea value={d.notaImportante ?? ""} onChange={(e) => patch({ notaImportante: e.target.value })} placeholder="Nota crítica para el cliente..." rows={2} className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400 resize-none" />
            </div>
          </div>
        </div>
      );
    }

    const isEn = langTab === "en";
    const tituloKey = isEn ? "titulo_en" : "titulo_pt" as const;
    const parrafosKey = isEn ? "parrafos_en" : "parrafos_pt" as const;
    const incluyeKey = isEn ? "incluyeItems_en" : "incluyeItems_pt" as const;
    const obsKey = isEn ? "observacionesItems_en" : "observacionesItems_pt" as const;
    const recKey = isEn ? "recomendacionesItems_en" : "recomendacionesItems_pt" as const;
    const notaKey = isEn ? "notaImportante_en" : "notaImportante_pt" as const;
    const langLabel = isEn ? "English" : "Português";
    const parrafosVal = (d[parrafosKey] ?? []) as string[];
    const incluyeVal = (d[incluyeKey] ?? []) as string[];
    const obsVal = (d[obsKey] ?? []) as string[];
    const recVal = (d[recKey] ?? []) as string[];

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Versión <strong>{langLabel}</strong> del descriptivo. Deja vacío para usar el español por defecto.
          </p>
          <button
            type="button"
            onClick={() => handleTranslate(langTab)}
            disabled={translating !== false}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-60" style={{ backgroundColor: "#802d62" }} onMouseEnter={(e)=>(e.currentTarget as HTMLButtonElement).style.backgroundColor="#6b2252"} onMouseLeave={(e)=>(e.currentTarget as HTMLButtonElement).style.backgroundColor="#802d62"}
          >
            {translating === langTab ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Traduciendo…</>
            ) : (
              <><Languages className="w-3.5 h-3.5" />Auto-traducir desde ES</>
            )}
          </button>
        </div>
        {translateError && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{translateError}</div>
        )}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Título ({langLabel})</label>
          <input value={d[tituloKey] ?? ""} onChange={(e) => patch({ [tituloKey]: e.target.value })} placeholder={`Título en ${langLabel}…`} className={inputCls + " font-medium"} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Párrafos ({langLabel})</label>
          <div className="border-l-4 border-slate-200 pl-3 space-y-1.5">
            {parrafosVal.map((p, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <textarea
                  value={p}
                  onChange={(e) => { const n = [...parrafosVal]; n[idx] = e.target.value; patch({ [parrafosKey]: n }); }}
                  placeholder="Paragraph..."
                  rows={2}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400 resize-none"
                />
                <button type="button" onClick={() => patch({ [parrafosKey]: parrafosVal.filter((_, i) => i !== idx) })} className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors mt-0.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => patch({ [parrafosKey]: [...parrafosVal, ""] })} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors mt-1">
              <Plus className="w-3.5 h-3.5" />Agregar párrafo
            </button>
          </div>
        </div>
        <LineListEditor label={`Incluye (${langLabel})`} items={incluyeVal} placeholder="Includes..." onChange={(items) => patch({ [incluyeKey]: items })} accentCls="border-emerald-400" />
        <LineListEditor label={`Observaciones (${langLabel})`} items={obsVal} placeholder="Notes..." onChange={(items) => patch({ [obsKey]: items })} accentCls="border-orange-400" />
        <LineListEditor label={`Recomendaciones (${langLabel})`} items={recVal} placeholder="Recommendations..." onChange={(items) => patch({ [recKey]: items })} accentCls="border-[#b78ca4]" />
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Nota importante ({langLabel})</label>
          <div className="border-l-4 border-red-400 pl-3">
            <textarea value={d[notaKey] ?? ""} onChange={(e) => patch({ [notaKey]: e.target.value })} placeholder="Important note..." rows={2} className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400 resize-none" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div className="flex-1" />
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs text-slate-500">Activo</span>
          <div onClick={() => patch({ activo: !d.activo })} className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${d.activo ? "bg-emerald-500" : "bg-slate-300"}`}>
            <div className={`w-4 h-4 rounded-full bg-white mt-0.5 shadow transition-transform ${d.activo ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
        </label>
        <button type="button" onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
          <Save className="w-4 h-4" />Guardar descriptivo
        </button>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button type="button" onClick={() => setTab("editar")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "editar" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
          <Edit3 className="w-3.5 h-3.5" />Editar
        </button>
        <button type="button" onClick={() => setTab("preview")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "preview" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
          <Eye className="w-3.5 h-3.5" />Vista previa
        </button>
      </div>

      {tab === "editar" ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Datos generales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Código del servicio <span className="text-red-500">*</span></label>
                <input value={d.codigo} onChange={(e) => patch({ codigo: e.target.value.toUpperCase() })} placeholder="Ej: RGE-020" className={inputCls + " font-mono"} />
                <p className="text-[10px] text-slate-400 mt-1">Debe coincidir exactamente con el código del tour en el tarifario</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Categoría</label>
                <select value={d.categoria ?? ""} onChange={(e) => patch({ categoria: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer">
                  <option value="">— Sin categoría —</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Título (ES) <span className="text-red-500">*</span></label>
                <input value={d.titulo} onChange={(e) => patch({ titulo: e.target.value })} placeholder="Ej: City Tour & Canal de Panamá" className={inputCls + " font-medium"} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Horario</label>
                <input value={d.horario ?? ""} onChange={(e) => patch({ horario: e.target.value })} placeholder="Ej: Lunes a Sábado · 08:00am · 5 horas" className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Duración</label>
                <input value={d.duracion ?? ""} onChange={(e) => patch({ duracion: e.target.value })} placeholder="Ej: Medio día (5 horas)" className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cuerpo del descriptivo</h3>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                {(["es", "en", "pt"] as LangTab[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLangTab(lang)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${langTab === lang ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {LANG_LABELS[lang]}
                  </button>
                ))}
              </div>
            </div>
            {renderLangFields()}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-medium">Vista previa idéntica al PDF y correo</div>
          <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: buildDescriptivoPreviewHtml(d) }} />
        </div>
      )}
    </div>
  );
}
