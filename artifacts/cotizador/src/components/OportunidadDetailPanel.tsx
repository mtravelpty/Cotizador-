import { useState } from "react";
import {
  X, ExternalLink, Copy, CheckCircle2, XCircle, Trash2, RotateCcw,
  Star, Clock, Bell, AlertTriangle, Save, AlarmClock, Check,
  FileText, Mail, TrendingUp, MessageSquare, History, Ban,
  Users, MapPin, DollarSign, Calendar, Edit2, ChevronDown,
} from "lucide-react";
import type {
  Opportunity, CotizacionGuardada, OppActividadTipo, OppHistorialEntry,
} from "./Guardadas";
import { getOppUrgency } from "./Guardadas";
import SingleDatePicker from "./SingleDatePicker";
import { useAuth } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "resumen" | "cotizaciones" | "seguimiento" | "historial";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" }) +
    " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(n?: number): string {
  if (!n || n === 0) return "—";
  return `USD ${n.toLocaleString("es-ES", { maximumFractionDigits: 0 })}`;
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── Urgency meta ─────────────────────────────────────────────────────────────

const URGENCY_META = {
  red:    { label: "Urgente",              color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
  yellow: { label: "Requiere seguimiento", color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  green:  { label: "Al día",              color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
};

// ─── Status styles ────────────────────────────────────────────────────────────

const ESTADO_STYLES: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  nueva:       { bg: "bg-[#f9f0f5]", text: "text-[#802d62]",   ring: "ring-[#e8d5e0]",   dot: "bg-[#802d62]"  },
  enviada:     { bg: "bg-[#f3e8ef]",  text: "text-[#6b2252]",   ring: "ring-[#d4b0c4]",   dot: "bg-[#b78ca4]"  },
  seguimiento: { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-500"   },
  confirmada:  { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  perdida:     { bg: "bg-slate-100",  text: "text-slate-500",   ring: "ring-slate-200",   dot: "bg-slate-400"   },
  anulada:     { bg: "bg-red-50",     text: "text-red-400",     ring: "ring-red-200",     dot: "bg-red-300"     },
};

const ESTADO_LABELS: Record<string, string> = {
  nueva: "Nueva", enviada: "Enviada", seguimiento: "Seguimiento",
  confirmada: "Confirmada", perdida: "Perdida", anulada: "Anulada",
};

// ─── Historial icons ──────────────────────────────────────────────────────────

const HISTORIAL_CONFIG: Record<OppActividadTipo, { label: string; icon: React.ReactNode; color: string }> = {
  oportunidad_creada:    { label: "Oportunidad creada",       icon: <TrendingUp className="w-3.5 h-3.5" />,   color: "text-[#802d62]"  },
  cotizacion_agregada:   { label: "Cotización agregada",      icon: <FileText className="w-3.5 h-3.5" />,     color: "text-[#b78ca4]"  },
  cotizacion_modificada: { label: "Cotización modificada",    icon: <Edit2 className="w-3.5 h-3.5" />,        color: "text-violet-500"  },
  pdf_generado:          { label: "PDF generado",             icon: <FileText className="w-3.5 h-3.5" />,     color: "text-slate-500"   },
  correo_generado:      { label: "Correo generado",          icon: <Mail className="w-3.5 h-3.5" />,         color: "text-slate-500"   },
  prioridad_activada:   { label: "Prioridad activada",       icon: <Star className="w-3.5 h-3.5" />,         color: "text-amber-500"   },
  prioridad_quitada:    { label: "Prioridad quitada",        icon: <Star className="w-3.5 h-3.5" />,         color: "text-slate-400"   },
  nota_agregada:        { label: "Nota interna guardada",    icon: <MessageSquare className="w-3.5 h-3.5" />,color: "text-slate-500"   },
  recordatorio_creado:  { label: "Recordatorio creado",      icon: <Bell className="w-3.5 h-3.5" />,         color: "text-[#b78ca4]"  },
  recordatorio_pospuesto:{ label: "Recordatorio pospuesto", icon: <AlarmClock className="w-3.5 h-3.5" />,   color: "text-amber-400"   },
  marcada_atendida:     { label: "Marcada como atendida",    icon: <Check className="w-3.5 h-3.5" />,        color: "text-emerald-500" },
  estado_cambiado:      { label: "Estado cambiado",          icon: <History className="w-3.5 h-3.5" />,      color: "text-slate-500"   },
  venta_confirmada:     { label: "Venta confirmada",         icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-emerald-600" },
  marcada_perdida:      { label: "Marcada como perdida",     icon: <XCircle className="w-3.5 h-3.5" />,      color: "text-slate-400"   },
  anulada:              { label: "Anulada",                  icon: <Ban className="w-3.5 h-3.5" />,          color: "text-red-400"     },
  restaurada:           { label: "Restaurada",               icon: <RotateCcw className="w-3.5 h-3.5" />,    color: "text-[#b78ca4]"  },
};

// ─── Resumen Tab ──────────────────────────────────────────────────────────────

function ResumenTab({ opp, latestQuote }: { opp: Opportunity; latestQuote?: CotizacionGuardada }) {
  const urgency = getOppUrgency(opp);
  const uMeta = URGENCY_META[urgency];
  const estadoStyle = ESTADO_STYLES[opp.status] ?? ESTADO_STYLES.nueva;
  const sinActividad = daysSince(opp.lastUpdateAt);
  const isClosed = opp.status === "confirmada" || opp.status === "perdida" || opp.status === "anulada";

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-36 shrink-0 mt-0.5">{label}</div>
      <div className="text-sm text-slate-800 flex-1">{value ?? <span className="text-slate-400">—</span>}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-4">
        {row("Cotización", <span className="font-semibold">{opp.quoteName || "—"}</span>)}
        {row("Agencia", opp.agencyName || "—")}
        {row("Agente", opp.agentName || "—")}
        {row("Counter", opp.counterName || "—")}
        {row("Destino", opp.destination || "—")}
        {latestQuote && row("Pasajeros", `${latestQuote.cliente.pasajeros ?? "—"} pax${latestQuote.cliente.ninos ? ` + ${latestQuote.cliente.ninos} niños` : ""}`)}
        {latestQuote && row("Acomodación", latestQuote.acomodaciones.join(" / "))}
        {row("Total más reciente", opp.totalLatest ? <span className="font-bold text-[#802d62]">{fmtMoney(opp.totalLatest)}</span> : <span className="text-slate-400">Sin valor</span>)}
        {row("Código", <span className="font-mono text-slate-500">{opp.latestQuoteCode || "—"}</span>)}
        {row("Estado", (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${estadoStyle.bg} ${estadoStyle.text} ${estadoStyle.ring}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${estadoStyle.dot}`} />
            {ESTADO_LABELS[opp.status] ?? opp.status}
          </span>
        ))}
        {row("Semáforo", isClosed ? <span className="text-slate-400 text-xs">Cerrada</span> : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: uMeta.bg, color: uMeta.color }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: uMeta.dot }} />
              {uMeta.label}
            </span>
            <span className="text-xs text-slate-400">{sinActividad === 0 ? "Actualizado hoy" : `${sinActividad} día${sinActividad !== 1 ? "s" : ""} sin actualización`}</span>
          </div>
        ))}
        {row("Última actualización", formatDate(opp.lastUpdateAt))}
        {row("Creada", formatDate(opp.createdAt))}
        {opp.createdByName && row("Creada por", <span className="font-medium text-slate-700">{opp.createdByName}</span>)}
        {opp.updatedByName && row(
          "Última modificación",
          <span className="font-medium text-slate-700">
            {opp.updatedByName}{opp.updatedAt ? <span className="font-normal text-slate-400"> · {formatDateTime(opp.updatedAt)}</span> : null}
          </span>
        )}
        {opp.recordatorio && row("Recordatorio", formatDate(opp.recordatorio))}
        {opp.proximaAccion && row("Próxima acción", opp.proximaAccion)}
        {opp.notaInterna && row("Nota interna", <span className="text-slate-600 italic">{opp.notaInterna}</span>)}
      </div>
    </div>
  );
}

// ─── Cotizaciones Tab ─────────────────────────────────────────────────────────

function CotizacionesTab({ opp, allQuotes, onView, onDuplicate }: {
  opp: Opportunity;
  allQuotes: CotizacionGuardada[];
  onView: (g: CotizacionGuardada) => void;
  onDuplicate?: (g: CotizacionGuardada) => void;
}) {
  if (opp.quotes.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
        <FileText className="w-10 h-10 mx-auto text-slate-200 mb-3" />
        <div className="text-sm text-slate-500 font-medium">Sin cotizaciones</div>
        <div className="text-xs text-slate-400 mt-1">Guarda o exporta una cotización para que aparezca aquí.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-bold text-slate-800">{opp.quotes.length} cotización{opp.quotes.length !== 1 ? "es" : ""}</span>
      </div>
      <div className="divide-y divide-slate-50">
        {opp.quotes.map((qRef, i) => {
          const full = allQuotes.find((g) => g.id === qRef.id);
          return (
            <div key={qRef.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800 font-mono">{qRef.numeroCotizacion}</span>
                  {i === 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f9f0f5] text-[#802d62] ring-1 ring-[#e8d5e0]">Última</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px] text-slate-400">{formatDate(qRef.fechaCreacion)}</span>
                  {qRef.total != null && qRef.total > 0 && (
                    <span className="text-[11px] font-bold text-slate-600">· {fmtMoney(qRef.total)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {full ? (
                  <>
                    <button type="button" onClick={() => onView(full)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white hover:opacity-90 transition-opacity"
                      style={{ background: "#802d62" }}>
                      <ExternalLink className="w-3 h-3" />Abrir
                    </button>
                    {onDuplicate && (
                      <button type="button" onClick={() => onDuplicate(full)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                        <Copy className="w-3 h-3" />Duplicar
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No disponible</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Seguimiento Tab ──────────────────────────────────────────────────────────

function SeguimientoTab({ opp, onQuickAction, onSaveForm }: {
  opp: Opportunity;
  onQuickAction: (patch: Partial<Opportunity>, historialEntry: OppHistorialEntry) => void;
  onSaveForm: (patch: Partial<Opportunity>, entries: OppHistorialEntry[]) => void;
}) {
  const { user } = useAuth();
  const [proximaAccion, setProximaAccion] = useState(opp.proximaAccion ?? "");
  const [recordatorio, setRecordatorio] = useState(opp.recordatorio?.slice(0, 10) ?? "");
  const [priorityManual, setPriorityManual] = useState(opp.priorityManual);
  const [notaInterna, setNotaInterna] = useState(opp.notaInterna ?? "");

  const now = () => new Date().toISOString();

  const handleSave = () => {
    const entries: OppHistorialEntry[] = [];
    if (notaInterna.trim() !== (opp.notaInterna ?? "").trim()) {
      entries.push({ fecha: now(), tipo: "nota_agregada", byUser: user?.nombre });
    }
    if (recordatorio !== (opp.recordatorio?.slice(0, 10) ?? "")) {
      entries.push({ fecha: now(), tipo: recordatorio ? "recordatorio_creado" : "estado_cambiado", detalle: recordatorio || "Recordatorio eliminado", byUser: user?.nombre });
    }
    if (priorityManual !== opp.priorityManual) {
      entries.push({ fecha: now(), tipo: priorityManual ? "prioridad_activada" : "prioridad_quitada", byUser: user?.nombre });
    }
    onSaveForm({
      proximaAccion: proximaAccion.trim() || undefined,
      recordatorio: recordatorio || undefined,
      priorityManual,
      notaInterna: notaInterna.trim() || undefined,
    }, entries);
  };

  const quickBtn = (
    label: string,
    icon: React.ReactNode,
    cls: string,
    onClick: () => void,
  ) => (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${cls}`}>
      {icon}{label}
    </button>
  );

  const isClosed = opp.status === "confirmada" || opp.status === "perdida" || opp.status === "anulada";

  return (
    <div className="space-y-4">
      {/* Form fields */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Próxima acción</label>
          <input type="text" value={proximaAccion} onChange={(e) => setProximaAccion(e.target.value)}
            placeholder="Ej: Llamar al cliente, reenviar propuesta…"
            className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Fecha de recordatorio</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {[{ label: "Mañana", days: 1 }, { label: "En 3 días", days: 3 }, { label: "En 1 semana", days: 7 }].map(({ label, days }) => {
              const target = addDays(days);
              const active = recordatorio === target;
              return (
                <button key={days} type="button" onClick={() => setRecordatorio(active ? "" : target)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ring-1 ${active ? "bg-primary/10 text-primary ring-primary/30" : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"}`}>
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SingleDatePicker
                value={recordatorio}
                onChange={setRecordatorio}
                placeholder="Seleccionar fecha"
                allowPast={false}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className={`relative w-10 h-6 rounded-full transition-colors ${priorityManual ? "bg-amber-500" : "bg-slate-200"}`}
              onClick={() => setPriorityManual((v) => !v)}>
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${priorityManual ? "translate-x-4" : ""}`} />
            </div>
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Star className={`w-4 h-4 ${priorityManual ? "fill-amber-500 text-amber-500" : "text-slate-400"}`} />
              Prioridad manual
            </span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nota interna</label>
          <textarea value={notaInterna} onChange={(e) => setNotaInterna(e.target.value)}
            placeholder="Ej: Cliente interesado en habitación superior, pendiente confirmar vuelo…"
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 resize-none" />
        </div>

        <button type="button" onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold">
          <Save className="w-3.5 h-3.5" />Guardar cambios
        </button>
      </div>

      {/* Quick actions */}
      {!isClosed && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Acciones rápidas</div>
          <div className="flex flex-wrap gap-2">
            {quickBtn("Marcar atendida", <Check className="w-4 h-4" />,
              "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100",
              () => onQuickAction({ }, { fecha: now(), tipo: "marcada_atendida", byUser: user?.nombre })
            )}
            {quickBtn("Posponer 1 día", <AlarmClock className="w-4 h-4" />,
              "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100",
              () => onQuickAction({ recordatorio: addDays(1) }, { fecha: now(), tipo: "recordatorio_pospuesto", detalle: "+1 día", byUser: user?.nombre })
            )}
            {quickBtn("Posponer 3 días", <AlarmClock className="w-4 h-4" />,
              "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100",
              () => onQuickAction({ recordatorio: addDays(3) }, { fecha: now(), tipo: "recordatorio_pospuesto", detalle: "+3 días", byUser: user?.nombre })
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {quickBtn("Confirmar venta", <CheckCircle2 className="w-4 h-4" />,
              "bg-emerald-600 text-white hover:bg-emerald-700",
              () => onQuickAction({ status: "confirmada" }, { fecha: now(), tipo: "venta_confirmada", byUser: user?.nombre })
            )}
            {quickBtn("Marcar perdida", <XCircle className="w-4 h-4" />,
              "bg-slate-100 text-slate-600 hover:bg-slate-200",
              () => onQuickAction({ status: "perdida" }, { fecha: now(), tipo: "marcada_perdida", byUser: user?.nombre })
            )}
            {quickBtn("Anular", <Ban className="w-4 h-4" />,
              "bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100",
              () => onQuickAction({ status: "anulada" }, { fecha: now(), tipo: "anulada", byUser: user?.nombre })
            )}
          </div>
        </div>
      )}

      {isClosed && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Acciones</div>
          {opp.status === "anulada" && quickBtn("Restaurar", <RotateCcw className="w-4 h-4" />,
            "bg-[#f9f0f5] text-[#802d62] ring-1 ring-[#e8d5e0] hover:bg-[#f0e4ea]",
            () => onQuickAction({ status: "nueva" }, { fecha: now(), tipo: "restaurada", byUser: user?.nombre })
          )}
          {opp.status !== "anulada" && (
            <div className="flex flex-wrap gap-2">
              {quickBtn("Anular", <Trash2 className="w-4 h-4" />,
                "bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100",
                () => onQuickAction({ status: "anulada" }, { fecha: now(), tipo: "anulada", byUser: user?.nombre })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Historial Tab ────────────────────────────────────────────────────────────

function HistorialTab({ opp }: { opp: Opportunity }) {
  const historial = opp.historial ?? [];
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  if (historial.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
        <History className="w-10 h-10 mx-auto text-slate-200 mb-3" />
        <div className="text-sm text-slate-500 font-medium">Sin historial</div>
        <div className="text-xs text-slate-400 mt-1">Las acciones quedan registradas aquí automáticamente.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <History className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-bold text-slate-800">{historial.length} evento{historial.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-slate-50 max-h-[420px] overflow-y-auto">
        {historial.map((entry, i) => {
          const cfg = entry.tipo ? HISTORIAL_CONFIG[entry.tipo] : null;
          const isModification = entry.tipo === "cotizacion_modificada";
          const hasCambios = isModification && entry.cambios && entry.cambios.length > 0;
          const isExpanded = expanded.has(i);

          return (
            <div key={i} className="px-4 py-3 hover:bg-slate-50/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 shrink-0 ${cfg?.color ?? "text-slate-400"}`}>
                  {cfg?.icon ?? <Clock className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[12px] font-semibold text-slate-700">
                      {cfg?.label ?? entry.detalle ?? "Evento"}
                    </span>
                    {hasCambios && (
                      <span className="text-[10px] font-medium text-violet-400">
                        · {entry.cambios!.length} cambio{entry.cambios!.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {entry.detalle && cfg && !isModification && (
                    <div className="text-[11px] text-slate-400 mt-0.5">{entry.detalle}</div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(entry.fecha)}</div>
                  {entry.byUser && (
                    <div className="text-[10px] text-[#b78ca4] mt-0.5">por {entry.byUser}</div>
                  )}

                  {hasCambios && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggle(i)}
                        className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-violet-500 hover:text-violet-700 transition-colors"
                      >
                        <ChevronDown
                          className="w-3 h-3 transition-transform"
                          style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                        />
                        {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                      </button>

                      {isExpanded && (
                        <ul className="mt-2 space-y-1 pl-1 border-l-2 border-violet-100 ml-0.5">
                          {entry.cambios!.map((c, j) => (
                            <li key={j} className="text-[11px] text-slate-600 pl-2 leading-snug">
                              {c}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface Props {
  opp: Opportunity;
  allQuotes: CotizacionGuardada[];
  onClose: () => void;
  onSave: (patch: Partial<Opportunity>) => void;
  onView: (g: CotizacionGuardada) => void;
  onDuplicate?: (g: CotizacionGuardada) => void;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "resumen",      label: "Resumen",      icon: <TrendingUp className="w-3.5 h-3.5" />     },
  { id: "cotizaciones", label: "Cotizaciones",  icon: <FileText className="w-3.5 h-3.5" />       },
  { id: "seguimiento",  label: "Seguimiento",   icon: <Bell className="w-3.5 h-3.5" />           },
  { id: "historial",    label: "Historial",     icon: <History className="w-3.5 h-3.5" />        },
];

export default function OportunidadDetailPanel({ opp, allQuotes, onClose, onSave, onView, onDuplicate }: Props) {
  const [tab, setTab] = useState<Tab>("resumen");

  const latestQuote = opp.quotes.reduce<CotizacionGuardada | undefined>((found, qRef) => {
    if (found) return found;
    return allQuotes.find((g) => g.id === qRef.id);
  }, undefined);

  const addHistorial = (entry: OppHistorialEntry): OppHistorialEntry[] =>
    [entry, ...(opp.historial ?? [])].slice(0, 100);

  const handleQuickAction = (patch: Partial<Opportunity>, entry: OppHistorialEntry) => {
    onSave({ ...patch, historial: addHistorial(entry) });
  };

  const handleSaveForm = (patch: Partial<Opportunity>, entries: OppHistorialEntry[]) => {
    const merged = [...entries, ...(opp.historial ?? [])].slice(0, 100);
    onSave({ ...patch, historial: merged });
  };

  const urgency = getOppUrgency(opp);
  const uMeta = URGENCY_META[urgency];
  const isClosed = opp.status === "confirmada" || opp.status === "perdida" || opp.status === "anulada";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#f5eef3] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 bg-white border-b border-slate-100 rounded-t-2xl shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="font-bold text-slate-900 truncate" style={{ fontSize: 16 }}>
              {opp.quoteName || "Sin nombre"}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {[opp.agencyName, opp.agentName, opp.counterName].filter(Boolean).join(" · ")}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${(ESTADO_STYLES[opp.status] ?? ESTADO_STYLES.nueva).bg} ${(ESTADO_STYLES[opp.status] ?? ESTADO_STYLES.nueva).text} ${(ESTADO_STYLES[opp.status] ?? ESTADO_STYLES.nueva).ring}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${(ESTADO_STYLES[opp.status] ?? ESTADO_STYLES.nueva).dot}`} />
                {ESTADO_LABELS[opp.status] ?? opp.status}
              </span>
              {!isClosed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: uMeta.bg, color: uMeta.color }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: uMeta.dot }} />
                  {uMeta.label}
                </span>
              )}
              {opp.priorityManual && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-300">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />PRIORIDAD
                </span>
              )}
              {opp.totalLatest != null && opp.totalLatest > 0 && (
                <span className="text-sm font-bold" style={{ color: "#802d62" }}>{fmtMoney(opp.totalLatest)}</span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white border-b border-slate-100 shrink-0 px-5 gap-0">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? "border-[#802d62] text-[#802d62]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t.icon}{t.label}
              {t.id === "cotizaciones" && opp.quotes.length > 0 && (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{opp.quotes.length}</span>
              )}
              {t.id === "historial" && (opp.historial?.length ?? 0) > 0 && (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{opp.historial!.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {tab === "resumen"      && <ResumenTab opp={opp} latestQuote={latestQuote} />}
          {tab === "cotizaciones" && <CotizacionesTab opp={opp} allQuotes={allQuotes} onView={onView} onDuplicate={onDuplicate} />}
          {tab === "seguimiento"  && <SeguimientoTab opp={opp} onQuickAction={handleQuickAction} onSaveForm={handleSaveForm} />}
          {tab === "historial"    && <HistorialTab opp={opp} />}
        </div>
      </div>
    </div>
  );
}
