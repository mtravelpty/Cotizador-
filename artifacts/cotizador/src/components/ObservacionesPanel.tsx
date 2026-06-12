import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, List, Check } from "lucide-react";
import { loadObservaciones } from "@/lib/observaciones";
import type { ServicioSeleccionado } from "@/lib/types";

interface Props {
  servicios: ServicioSeleccionado[];
  seleccionadas: string[];
  onSeleccionadasChange: (ids: string[]) => void;
  manual: string;
  onManualChange: (text: string) => void;
}

export default function ObservacionesPanel({
  manual,
  onManualChange,
}: Props) {
  const PRIORITY_IDS = ["precios_netos_pp", "sujeto_disponibilidad", "suplemento_sgl", "suplemento_vuelo_nocturno"];
  const allActive = useMemo(() => loadObservaciones().filter((o) => o.activo), []);
  const catalog = useMemo(() => {
    const priority = allActive.filter((o) => PRIORITY_IDS.includes(o.id));
    const rest = allActive.filter((o) => !PRIORITY_IDS.includes(o.id));
    return { priority, rest };
  }, [allActive]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const insertClause = (text: string) => {
    // Deduplicate: don't add if already present as a line
    const existingLines = manual
      .split("\n")
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean);
    if (existingLines.includes(text.trim().toLowerCase())) {
      setOpen(false);
      return;
    }
    // Append as a new line
    const newText = manual.trimEnd() ? `${manual.trimEnd()}\n${text}` : text;
    onManualChange(newText);
    setOpen(false);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(newText.length, newText.length);
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 leading-tight">
              Observaciones generales
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Añade condiciones y notas importantes para el cliente
            </p>
          </div>
        </div>
        {manual.trim().length > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
            <Check className="w-3 h-3" />
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        {/* Textarea wrapper — button floats in top-right corner */}
        <div className="relative">
          {/* Insert clause button + dropdown */}
          <div ref={dropdownRef} className="absolute top-2.5 right-2.5 z-10">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                open
                  ? "bg-primary/10 text-primary"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700"
              }`}
            >
              <List className="w-3.5 h-3.5 shrink-0" />
              Observaciones rápidas
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-xl shadow-xl ring-1 ring-slate-200 py-1.5 overflow-hidden">
                <div className="px-3 pb-1.5 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Cláusulas predefinidas
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {catalog.priority.map((obs) => (
                    <button
                      key={obs.id}
                      type="button"
                      onClick={() => insertClause(obs.texto)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors leading-relaxed"
                    >
                      {obs.texto}
                    </button>
                  ))}
                  {catalog.rest.length > 0 && (
                    <>
                      <div className="px-3 pt-2 pb-1 border-t border-slate-100 mt-1">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                          Otras cláusulas
                        </span>
                      </div>
                      {catalog.rest.map((obs) => (
                        <button
                          key={obs.id}
                          type="button"
                          onClick={() => insertClause(obs.texto)}
                          className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors leading-relaxed"
                        >
                          {obs.texto}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={manual}
            onChange={(e) => onManualChange(e.target.value.toUpperCase())}
            placeholder="Escribe observaciones, condiciones o notas para el cliente…"
            rows={3}
            className="w-full px-3 pt-10 pb-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 resize-none transition-colors leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
