import { useRef, useState } from "react";
import {
  Upload,
  Download,
  LayoutTemplate,
  HardDrive,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import {
  exportarRespaldoCompleto,
  exportarRespaldoPlantillas,
  importarRespaldo,
  type ImportResult,
} from "@/lib/backup";

type Status = "idle" | "loading" | "success" | "error";

interface ActionState {
  status: Status;
  message: string | null;
}

const idle: ActionState = { status: "idle", message: null };

export default function Respaldos({ onImported }: { onImported?: () => void }) {
  const [importFull, setImportFull] = useState<ActionState>(idle);
  const [importPlt, setImportPlt] = useState<ActionState>(idle);

  const inputFullRef = useRef<HTMLInputElement>(null);
  const inputPltRef = useRef<HTMLInputElement>(null);

  function flash(
    set: (s: ActionState) => void,
    result: ImportResult,
  ) {
    if (result.ok) {
      set({ status: "success", message: "Respaldo restaurado correctamente" });
      onImported?.();
    } else {
      set({ status: "error", message: result.error });
    }
    window.setTimeout(() => set(idle), 3500);
  }

  async function handleImportFull(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportFull({ status: "loading", message: null });
    const result = await importarRespaldo(file);
    flash(setImportFull, result);
  }

  async function handleImportPlt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportPlt({ status: "loading", message: null });
    const result = await importarRespaldo(file);
    flash(setImportPlt, result);
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Respaldos</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Exporta e importa tu información sin necesidad de internet ni servidor.
        </p>
      </div>

      <section className="space-y-4">
        <SectionHeading
          icon={<HardDrive className="w-4 h-4" />}
          title="Respaldo completo"
          description="Incluye plantillas, descriptivos, observaciones rápidas, tarifas modificadas, agencias, logos y Seguimiento (cotizaciones, oportunidades, historial y recordatorios)."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ActionCard
            icon={<Upload className="w-5 h-5" />}
            label="Exportar respaldo"
            color="blue"
            onClick={exportarRespaldoCompleto}
          />

          <ActionCard
            icon={<Download className="w-5 h-5" />}
            label="Importar respaldo"
            color="slate"
            loading={importFull.status === "loading"}
            onClick={() => inputFullRef.current?.click()}
          />
        </div>

        <FeedbackBanner state={importFull} />

        <input
          ref={inputFullRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFull}
        />
      </section>

      <div className="border-t border-slate-100" />

      <section className="space-y-4">
        <SectionHeading
          icon={<LayoutTemplate className="w-4 h-4" />}
          title="Solo plantillas"
          description="Exporta o importa únicamente las plantillas y sus observaciones."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ActionCard
            icon={<Upload className="w-5 h-5" />}
            label="Exportar plantillas"
            color="purple"
            onClick={exportarRespaldoPlantillas}
          />

          <ActionCard
            icon={<Download className="w-5 h-5" />}
            label="Importar plantillas"
            color="slate"
            loading={importPlt.status === "loading"}
            onClick={() => inputPltRef.current?.click()}
          />
        </div>

        <FeedbackBanner state={importPlt} />

        <input
          ref={inputPltRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportPlt}
        />
      </section>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-600">Notas</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Los archivos se guardan localmente en tu dispositivo.</li>
          <li>Al importar se reemplaza la información existente.</li>
          <li>El tarifario principal (TARIFARIO.xlsx) no se incluye en el respaldo.</li>
        </ul>
      </div>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="font-bold text-slate-900 text-base leading-tight tracking-tight">{title}</p>
        <p className="text-sm text-slate-600 mt-0.5 leading-snug">{description}</p>
      </div>
    </div>
  );
}

const colorMap: Record<string, string> = {
  blue: "bg-[#802d62] hover:bg-[#6b2252] text-white",
  purple: "bg-[#802d62] hover:bg-[#6b2252] text-white",
  slate: "bg-[#802d62] hover:bg-[#6b2252] text-white",
};

function ActionCard({
  icon,
  label,
  color,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${colorMap[color] ?? colorMap.slate}`}
    >
      {loading ? (
        <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
      ) : (
        <span className="shrink-0">{icon}</span>
      )}
      {label}
    </button>
  );
}

function FeedbackBanner({ state }: { state: ActionState }) {
  if (state.status === "idle" || state.status === "loading") return null;

  const isOk = state.status === "success";
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${
        isOk
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-red-50 text-red-700 border border-red-200"
      }`}
    >
      {isOk ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 shrink-0" />
      )}
      {state.message}
    </div>
  );
}
