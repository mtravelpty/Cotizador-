import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  X,
  Check,
  AlarmClock,
  AlertTriangle,
  ExternalLink,
  Clock,
  CheckCircle2,
  CalendarClock,
  ChevronRight,
} from "lucide-react";
import type { CotizacionGuardada, Opportunity, OppHistorialEntry } from "./Guardadas";
import { getOppUrgency } from "./Guardadas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtMoney(n?: number): string {
  if (!n || n === 0) return "";
  return `${n.toLocaleString("es-ES", { maximumFractionDigits: 0 })} US$`;
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const days = daysSince(iso);
  if (days === 0) return "hoy";
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}

// ─── Alert types ──────────────────────────────────────────────────────────────

type AlertKind =
  | "recordatorio_hoy"
  | "recordatorio_vencido"
  | "opp_roja"
  | "vence_manana"
  | "vence_pronto";

interface BellAlert {
  kind: AlertKind;
  key: string;
  label: string;
  sublabel?: string;
  priority: number;
  // one of these will be set
  opp?: Opportunity;
  quote?: CotizacionGuardada;
}

// ─── Build alerts ─────────────────────────────────────────────────────────────

function buildAlerts(
  opportunities: Opportunity[],
  items: CotizacionGuardada[],
): BellAlert[] {
  const alerts: BellAlert[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Opportunity-based alerts ────────────────────────────────────────────────
  for (const o of opportunities) {
    if (o.status === "confirmada" || o.status === "perdida" || o.status === "anulada") continue;

    // Recordatorios
    if (o.recordatorio) {
      const recDate = new Date(o.recordatorio + "T00:00:00");
      if (recDate <= today) {
        const isToday = recDate.getTime() === today.getTime();
        alerts.push({
          kind: isToday ? "recordatorio_hoy" : "recordatorio_vencido",
          key: `opp-rec-${o.id}`,
          opp: o,
          label: isToday ? "Recordatorio para hoy" : `Recordatorio vencido`,
          sublabel: o.proximaAccion || relativeTime(o.lastUpdateAt),
          priority: isToday ? 2000 : 1700,
        });
        continue; // don't also add as roja
      }
    }

    // Red urgency only (not yellow/green)
    const urgency = getOppUrgency(o);
    if (urgency === "red") {
      const days = daysSince(o.lastUpdateAt);
      alerts.push({
        kind: "opp_roja",
        key: `opp-red-${o.id}`,
        opp: o,
        label: `Sin actividad hace ${days} días`,
        sublabel: o.proximaAccion,
        priority: 1000 + Math.min(days, 30) * 10,
      });
    }
    // Green → NOT shown
  }

  // ── Quote-based vigencia alerts ─────────────────────────────────────────────
  for (const g of items) {
    const estado = g.estadoCRM ?? "nueva";
    if (estado === "confirmada" || estado === "perdida") continue;

    const diasHastaVigencia = daysUntil(g.cliente.vigencia);
    const valor = g.valorCotizacion ?? 0;

    if (diasHastaVigencia === 1) {
      alerts.push({
        kind: "vence_manana",
        key: `q-vence-${g.id}`,
        quote: g,
        label: "Cotización vence mañana",
        sublabel: relativeTime(g.ultimoSeguimiento ?? g.fechaCreacion),
        priority: 1500 + valor,
      });
    } else if (diasHastaVigencia !== null && diasHastaVigencia >= 2 && diasHastaVigencia <= 5) {
      alerts.push({
        kind: "vence_pronto",
        key: `q-vencep-${g.id}`,
        quote: g,
        label: `Cotización vence en ${diasHastaVigencia} días`,
        sublabel: relativeTime(g.ultimoSeguimiento ?? g.fechaCreacion),
        priority: 800 + (5 - diasHastaVigencia) * 200 + (valor > 1500 ? 30 : 0),
      });
    }
  }

  return alerts.sort((a, b) => b.priority - a.priority);
}

// ─── Portal Panel ─────────────────────────────────────────────────────────────

interface PanelPosition {
  top: number;
  right: number;
}

function NotificationPanel({
  open,
  anchorRef,
  onClose,
  children,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<PanelPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const updatePos = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 12, right: window.innerWidth - rect.right });
  }, [anchorRef]);

  useEffect(() => {
    if (open) {
      updatePos();
      setMounted(true);
      requestAnimationFrame(() => { requestAnimationFrame(() => setVisible(true)); });
      return undefined;
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      const panel = document.getElementById("notification-panel-portal");
      if (panel && panel.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  if (!mounted || !pos) return null;

  return createPortal(
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "transparent" }} onMouseDown={onClose} />
      <div
        id="notification-panel-portal"
        style={{
          position: "fixed", top: pos.top, right: pos.right, zIndex: 9999,
          width: "min(440px, calc(100vw - 24px))", maxHeight: "min(560px, 90vh)",
          display: "flex", flexDirection: "column",
          background: "#ffffff", borderRadius: 24,
          boxShadow: "0 20px 60px rgba(128,45,98,0.18), 0 4px 16px rgba(128,45,98,0.08)",
          border: "1px solid rgba(128,45,98,0.07)", overflow: "hidden",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.98)",
          transition: "opacity 0.2s ease, transform 0.2s ease",
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

// ─── Alert Item ───────────────────────────────────────────────────────────────

const KIND_CONFIG: Record<AlertKind, { icon: React.ReactNode; color: string; dot: string; bg: string }> = {
  recordatorio_hoy:     { icon: <CalendarClock className="w-4 h-4" style={{ color: "#802d62" }} />,   color: "#802d62", dot: "#802d62", bg: "#f9f0f5" },
  recordatorio_vencido: { icon: <AlarmClock className="w-4 h-4 text-amber-500" />,     color: "#92400e", dot: "#f59e0b", bg: "#fffbeb" },
  opp_roja:             { icon: <AlertTriangle className="w-4 h-4 text-red-500" />,     color: "#991b1b", dot: "#ef4444", bg: "#fef2f2" },
  vence_manana:         { icon: <CalendarClock className="w-4 h-4 text-red-500" />,    color: "#991b1b", dot: "#ef4444", bg: "#fef2f2" },
  vence_pronto:         { icon: <CalendarClock className="w-4 h-4 text-amber-500" />,  color: "#92400e", dot: "#f59e0b", bg: "#fffbeb" },
};

function AlertItem({ alert, isRead, onGoToSeguimiento, onAtenderOpp, onPosponerOpp, onViewQuote, onUpdateCRMQuote }: {
  alert: BellAlert;
  isRead: boolean;
  onGoToSeguimiento: () => void;
  onAtenderOpp: (o: Opportunity) => void;
  onPosponerOpp: (o: Opportunity) => void;
  onViewQuote: (g: CotizacionGuardada) => void;
  onUpdateCRMQuote: (id: string, patch: Partial<CotizacionGuardada>) => void;
}) {
  const cfg = KIND_CONFIG[alert.kind];
  const title = alert.opp
    ? alert.opp.quoteName || alert.opp.agencyName || "(sin nombre)"
    : alert.quote?.cliente.nombre || "(sin nombre)";
  const valor = alert.opp?.totalLatest ?? alert.quote?.valorCotizacion;
  const code = alert.opp?.latestQuoteCode ?? alert.quote?.numeroCotizacion;

  const isOppAlert = !!alert.opp;
  const isQuoteAlert = !!alert.quote;

  return (
    <div className="px-4 py-3 hover:bg-slate-50/70 transition-colors relative">
      {!isRead && (
        <span className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      )}
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900 truncate">{title}</span>
            {valor != null && valor > 0 && (
              <span className="text-[11px] font-bold shrink-0" style={{ color: "#041941" }}>{fmtMoney(valor)}</span>
            )}
          </div>
          {code && (
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{code}</div>
          )}
          {alert.sublabel && (
            <div className="text-[11px] text-slate-400 mt-0.5">{alert.sublabel}</div>
          )}
          <div className="text-[11px] font-semibold mt-0.5" style={{ color: cfg.color }}>{alert.label}</div>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {isOppAlert && (
              <>
                <button type="button" onClick={onGoToSeguimiento}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold hover:opacity-90"
                  style={{ background: "#802d62" }}>
                  <ExternalLink className="w-3 h-3" />Abrir
                </button>
                <button type="button" onClick={() => onAtenderOpp(alert.opp!)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold ring-1 ring-emerald-200">
                  <Check className="w-3 h-3" />Atendida
                </button>
                {alert.kind !== "opp_roja" && (
                  <button type="button" onClick={() => onPosponerOpp(alert.opp!)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                    style={{ background: "rgba(230,174,51,0.08)", color: "#92400e", border: "1px solid rgba(230,174,51,0.35)" }}>
                    <AlarmClock className="w-3 h-3" />Posponer
                  </button>
                )}
              </>
            )}
            {isQuoteAlert && (
              <>
                <button type="button" onClick={() => onViewQuote(alert.quote!)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold hover:opacity-90"
                  style={{ background: "#802d62" }}>
                  <ExternalLink className="w-3 h-3" />Ver
                </button>
                <button type="button" onClick={() => {
                  onUpdateCRMQuote(alert.quote!.id, { ultimoSeguimiento: new Date().toISOString() });
                }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold ring-1 ring-emerald-200">
                  <Check className="w-3 h-3" />Atendida
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  items: CotizacionGuardada[];
  opportunities: Opportunity[];
  onView: (g: CotizacionGuardada) => void;
  onUpdateCRM: (id: string, patch: Partial<CotizacionGuardada>) => void;
  onUpdateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
  onGoToSeguimiento?: () => void;
}

export default function NotificationBell({
  items = [],
  opportunities = [],
  onView,
  onUpdateCRM,
  onUpdateOpportunity,
  onGoToSeguimiento,
}: Props) {
  const [open, setOpen] = useState(false);
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set());
  const bellRef = useRef<HTMLButtonElement>(null);

  const allAlerts = buildAlerts(opportunities, items);
  const totalBadge = allAlerts.length;
  const visible = allAlerts.slice(0, 6);
  const hasMore = allAlerts.length > 6;

  useEffect(() => {
    if (open && visible.length > 0) {
      setReadKeys((prev) => new Set([...prev, ...visible.map((a) => a.key)]));
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const atenderOpp = (o: Opportunity) => {
    const entry: OppHistorialEntry = { fecha: new Date().toISOString(), tipo: "marcada_atendida" };
    onUpdateOpportunity(o.id, {
      historial: [entry, ...(o.historial ?? [])].slice(0, 100),
    });
  };

  const posponerOpp = (o: Opportunity) => {
    const entry: OppHistorialEntry = { fecha: new Date().toISOString(), tipo: "recordatorio_pospuesto", detalle: "+1 día" };
    onUpdateOpportunity(o.id, {
      recordatorio: addDays(1),
      historial: [entry, ...(o.historial ?? [])].slice(0, 100),
    });
  };

  const handleGoToSeguimiento = () => {
    close();
    onGoToSeguimiento?.();
  };

  return (
    <>
      <button
        ref={bellRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        aria-label={`Notificaciones${totalBadge > 0 ? ` (${totalBadge})` : ""}`}
      >
        <Bell
          className="w-5 h-5"
          style={{ color: "#E6AE33", fill: totalBadge > 0 ? "rgba(230,174,51,0.18)" : "none" }}
        />
        {totalBadge > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm"
            style={{ background: "#E6AE33" }}
          >
            {totalBadge > 99 ? "99+" : totalBadge}
          </span>
        )}
      </button>

      <NotificationPanel open={open} anchorRef={bellRef} onClose={close}>
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div>
            <div className="text-sm font-bold text-slate-900">Notificaciones</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Recordatorios, urgentes y vigencias próximas</div>
          </div>
          <button type="button" onClick={close}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 ml-2 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alert list */}
        <div className="overflow-y-auto flex-1">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1" style={{ background: "rgba(16,185,129,0.1)" }}>
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="text-sm font-semibold text-slate-800">✓ Todo al día</div>
              <div className="text-xs text-slate-400">No tienes alertas pendientes.</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {visible.map((alert) => (
                <AlertItem
                  key={alert.key}
                  alert={alert}
                  isRead={readKeys.has(alert.key)}
                  onGoToSeguimiento={handleGoToSeguimiento}
                  onAtenderOpp={atenderOpp}
                  onPosponerOpp={posponerOpp}
                  onViewQuote={(g) => { onView(g); close(); }}
                  onUpdateCRMQuote={onUpdateCRM}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-2.5 shrink-0">
          <button type="button" onClick={handleGoToSeguimiento}
            className="flex items-center justify-center gap-1 text-xs font-semibold w-full py-0.5 transition-colors hover:opacity-80"
            style={{ color: "#802d62" }}>
            {hasMore ? `Ver todas en Seguimiento (${allAlerts.length - 6} más)` : "Ver todas en Seguimiento"}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </NotificationPanel>
    </>
  );
}
