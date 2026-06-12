import {
  Settings2,
  Map,
  Clock,
  BookOpen,
  Tag,
  Package,
  Users,
  Check,
  Globe,
  ChevronDown,
  Bus,
} from "lucide-react";
import type { ModoCotizacion, PresentationMode, QuotingMode } from "./Guardadas";
import { type Idioma, IDIOMA_LABELS } from "@/lib/i18n";
import { useRef, useState } from "react";

interface Props {
  modo: ModoCotizacion;
  onModoChange: (m: ModoCotizacion) => void;
  presentationMode: PresentationMode;
  onPresentationModeChange: (m: PresentationMode) => void;
  quotingMode: QuotingMode;
  onQuotingModeChange: (m: QuotingMode) => void;
  incluirItinerario: boolean;
  onToggleItinerario: () => void;
  incluirDescriptivos: boolean;
  onToggleDescriptivos: () => void;
  incluirDescriptivoCompleto: boolean;
  onToggleDescriptivoCompleto: () => void;
  personalizarTraslados: boolean;
  onTogglePersonalizarTraslados: () => void;
  idioma: Idioma;
  onIdiomaChange: (i: Idioma) => void;
}

export default function ConfiguracionPanel({
  modo,
  onModoChange,
  presentationMode,
  onPresentationModeChange,
  quotingMode,
  onQuotingModeChange,
  incluirItinerario,
  onToggleItinerario,
  incluirDescriptivos,
  onToggleDescriptivos,
  incluirDescriptivoCompleto,
  onToggleDescriptivoCompleto,
  personalizarTraslados,
  onTogglePersonalizarTraslados,
  idioma,
  onIdiomaChange,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <Settings2 className="w-4 h-4 flex-shrink-0" style={{ color: "#b78ca4" }} />
        <h3 className="font-bold leading-tight" style={{ fontSize: 20, color: "#07152f" }}>
          Configuración de cotización
        </h3>
      </div>

      <div className="p-5 space-y-5">
        {/* ── Formato de cotización ───────────────────────────── */}
        <section>
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
            Formato de cotización
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* Tarifario → Individual + Tarifas + Detallada */}
            <ModeCard
              active={quotingMode === "individual" && modo === "tarifas"}
              icon={<Tag className="w-4 h-4" />}
              title="Tarifario"
              onClick={() => {
                onQuotingModeChange("individual");
                onModoChange("tarifas");
                onPresentationModeChange("detailed");
              }}
            />
            {/* Grupo → Grupo + Totales + Detallada */}
            <ModeCard
              active={quotingMode === "grupo"}
              icon={<Users className="w-4 h-4" />}
              title="Grupo"
              onClick={() => {
                onQuotingModeChange("grupo");
                onModoChange("calculo");
                onPresentationModeChange("detailed");
              }}
            />
            {/* Paquete → Individual + Totales + Paquete */}
            <ModeCard
              active={quotingMode === "individual" && modo === "calculo" && presentationMode === "package"}
              icon={<Package className="w-4 h-4" />}
              title="Paquete"
              onClick={() => {
                onQuotingModeChange("individual");
                onModoChange("calculo");
                onPresentationModeChange("package");
              }}
            />
          </div>
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
            Idioma
          </div>
          <IdiomaSelector idioma={idioma} onChange={onIdiomaChange} />
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
            Opciones
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            <Toggle
              checked={incluirDescriptivos}
              onChange={onToggleDescriptivos}
              icon={<Clock className="w-4 h-4" />}
              label="Incluir horarios"
            />
            <Toggle
              checked={incluirItinerario}
              onChange={onToggleItinerario}
              icon={<Map className="w-4 h-4" />}
              label="Incluir itinerario"
            />
            <Toggle
              checked={incluirDescriptivoCompleto}
              onChange={onToggleDescriptivoCompleto}
              icon={<BookOpen className="w-4 h-4" />}
              label="Incluir descriptivo"
            />
            <Toggle
              checked={personalizarTraslados}
              onChange={onTogglePersonalizarTraslados}
              icon={<Bus className="w-4 h-4" />}
              label="Personalizar traslados"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

const IDIOMAS: Idioma[] = ["es", "en", "pt"];

function IdiomaSelector({ idioma, onChange }: { idioma: Idioma; onChange: (i: Idioma) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all text-sm"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(0,67,187,0.1)", color: "#0043BB" }}
        >
          <Globe className="w-4 h-4" />
        </div>
        <span className="flex-1 text-left font-semibold text-slate-800">
          {IDIOMA_LABELS[idioma]}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
          onMouseLeave={() => setOpen(false)}
        >
          {IDIOMAS.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                onChange(lang);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                lang === idioma
                  ? "bg-[#0043BB]/5 text-[#0043BB] font-semibold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {lang === idioma && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              {lang !== idioma && <span className="w-3.5 h-3.5 flex-shrink-0" />}
              {IDIOMA_LABELS[lang]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeCard({
  active,
  icon,
  title,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
        active
          ? "border-[#0043BB] bg-[#0043BB]/5 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
      data-testid={`mode-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
        style={active ? { backgroundColor: "rgba(0,67,187,0.12)", color: "#0043BB" } : { backgroundColor: "#f1f5f9", color: "#64748b" }}
      >
        {icon}
      </div>
      <div
        className="text-xs font-semibold leading-tight text-center"
        style={{ color: active ? "#0043BB" : "#1e293b" }}
      >
        {title}
      </div>
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  icon,
  label,
  help,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  label: string;
  help?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-3 px-3 py-3 transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:bg-slate-50"
      }`}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
        style={checked && !disabled ? { backgroundColor: "rgba(0,67,187,0.1)", color: "#0043BB" } : { backgroundColor: "#f1f5f9", color: "#64748b" }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 leading-tight">
          {label}
        </div>
        {help && (
          <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
            {help}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange()}
        disabled={disabled}
        className={`relative w-10 h-6 rounded-full flex-shrink-0 transition-colors ${disabled ? "cursor-not-allowed" : ""}`}
        style={{ backgroundColor: checked && !disabled ? "#0047c7" : "#cbd5e1" }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    </label>
  );
}
