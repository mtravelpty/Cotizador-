import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Pencil,
  Trash2,
  Search,
  ListChecks,
  ChevronDown,
  Copy,
  FileDown,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  MessageSquare,
  X,
  Star,
  ExternalLink,
  MoreHorizontal,
  XCircle,
  RotateCcw,
  ChevronRight,
  CalendarClock,
} from "lucide-react";
import type {
  CotizacionGuardada,
  Opportunity,
  EstadoOportunidad,
  OppHistorialEntry,
} from "./Guardadas";
import { getOppUrgency, type UrgencyLevel } from "./Guardadas";
import { exportarCotizacionesExcel } from "@/lib/exportExcel";
import { loadAgenciasAsync, type Agencia } from "@/lib/agencias";
import OportunidadDetailPanel from "./OportunidadDetailPanel";
import { useAuth } from "@/lib/auth";

interface Props {
  items: CotizacionGuardada[];
  opportunities: Opportunity[];
  onView: (g: CotizacionGuardada) => void;
  onEdit: (g: CotizacionGuardada) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (g: CotizacionGuardada) => void;
  onUpdateCRM: (id: string, patch: Partial<CotizacionGuardada>) => void;
  onUpdateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
}

// ─── Configs ──────────────────────────────────────────────────────────────────

const ESTADO_OPP_OPTIONS: { value: EstadoOportunidad; label: string }[] = [
  { value: "nueva",      label: "Nueva"      },
  { value: "enviada",    label: "Enviada"    },
  { value: "seguimiento",label: "Seguimiento"},
  { value: "confirmada", label: "Confirmada" },
  { value: "perdida",    label: "Perdida"    },
];

const ESTADO_OPP_STYLES: Record<EstadoOportunidad, { bg: string; text: string; ring: string; dot: string }> = {
  nueva:       { bg: "bg-[#f9f0f5]", text: "text-[#802d62]",   ring: "ring-[#e8d5e0]",   dot: "bg-[#802d62]"  },
  enviada:     { bg: "bg-[#f3e8ef]",  text: "text-[#6b2252]",   ring: "ring-[#d4b0c4]",   dot: "bg-[#b78ca4]"  },
  seguimiento: { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-500"   },
  confirmada:  { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  perdida:     { bg: "bg-slate-100",  text: "text-slate-500",   ring: "ring-slate-200",   dot: "bg-slate-400"   },
  anulada:     { bg: "bg-slate-100",  text: "text-slate-400",   ring: "ring-slate-200",   dot: "bg-slate-300"   },
};

function oppSortKey(o: Opportunity): number {
  if (o.priorityManual) return 0;
  const u = getOppUrgency(o);
  const uMap: Record<UrgencyLevel, number> = { red: 1, yellow: 2, green: 3 };
  return uMap[u];
}

const URGENCY_META: Record<UrgencyLevel, { label: string; color: string; bg: string; dot: string }> = {
  red:    { label: "Urgente",              color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
  yellow: { label: "Requiere seguimiento", color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  green:  { label: "Al día",              color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
};

// ─── Border color by priority ──────────────────────────────────────────────────
// Priority: 1-Urgente · 2-Vencida · 3-Requiere seguimiento · 4-Prioritaria · 5-Nueva · 6-Al día
function getCardBorderColor(opp: Opportunity): string {
  const urgency = getOppUrgency(opp);
  if (urgency === "red")               return "#ef4444"; // 1. Urgente
  if (isRecordatorioActivo(opp))       return "#b91c1c"; // 2. Vencida / atrasada
  if (urgency === "yellow")            return "#e6ae33"; // 3. Requiere seguimiento
  if (opp.priorityManual)              return "#f2c94c"; // 4. Prioritaria
  if (opp.status === "nueva")          return "#0b63ff"; // 5. Nueva
  return "#03a04e";                                       // 6. Al día
}

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
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
}

function formatShortDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function fmtMoney(n?: number): string {
  if (!n || n === 0) return "";
  return `USD ${n.toLocaleString("es-ES", { maximumFractionDigits: 0 })}`;
}

function getInitials(name: string): string {
  if (!name?.trim()) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.trim().slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function isRecordatorioActivo(o: Opportunity): boolean {
  if (!o.recordatorio) return false;
  const d = new Date(o.recordatorio + "T23:59:59");
  return d <= new Date();
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, icon, iconStyle }: {
  label: string; value: number; color: string;
  icon: React.ReactNode; iconStyle?: React.CSSProperties;
}) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`} style={iconStyle}>{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-slate-900 leading-tight tabular-nums">{value}</div>
        <div className="text-xs font-medium text-slate-600 leading-tight mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Logo Avatar ──────────────────────────────────────────────────────────────

function LogoOrInitials({ agencia, initials, color, size = 36, radius }: {
  agencia?: Agencia; initials: string; color: string; size?: number; radius?: number;
}) {
  const br = radius ?? (size >= 44 ? 14 : 10);
  if (agencia?.logoUrl) {
    return (
      <div className="bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0" style={{ width: size, height: size, borderRadius: br }}>
        <img src={agencia.logoUrl} alt="" className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center font-bold text-white shrink-0" style={{ width: size, height: size, borderRadius: br, background: color, fontSize: size * 0.33 }}>
      {initials}
    </div>
  );
}

// ─── Menu item ────────────────────────────────────────────────────────────────

function MenuItem({ icon, label, onClick, danger = false }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium transition-colors ${danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"}`}>
      {icon}{label}
    </button>
  );
}

// ─── Opportunity Card ─────────────────────────────────────────────────────────

function OpportunityCard({ opp, agencia, allQuotes, onView, onEdit, onDuplicate, onOpenDetail, onUpdateOpportunity, onAnular }: {
  opp: Opportunity; agencia?: Agencia;
  allQuotes: CotizacionGuardada[];
  onView: () => void; onEdit: () => void; onDuplicate?: () => void;
  onOpenDetail: () => void;
  onUpdateOpportunity: (patch: Partial<Opportunity>) => void;
  onAnular: () => void;
}) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) {
      const MENU_HEIGHT = 260;
      const openUp = rect.bottom + 6 + MENU_HEIGHT > window.innerHeight;
      setMenuPos({ top: openUp ? rect.top - MENU_HEIGHT : rect.bottom + 6, right: window.innerWidth - rect.right });
      setMenuOpen(true);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuBtnRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  const urgency = getOppUrgency(opp);
  const uMeta = URGENCY_META[urgency];
  const sinActividad = daysSince(opp.lastUpdateAt);
  const initials = getInitials(opp.agencyName || opp.quoteName);
  const isClosedStatus = opp.status === "confirmada" || opp.status === "perdida";

  const addHistorial = (tipo: OppHistorialEntry["tipo"], detalle?: string): OppHistorialEntry[] =>
    [{ fecha: new Date().toISOString(), tipo, detalle, byUser: user?.nombre }, ...(opp.historial ?? [])].slice(0, 100);

  const borderColor = getCardBorderColor(opp);

  // Derive metadata from latest quote
  const latestQ = opp.quotes.length > 0
    ? allQuotes.find((q) => q.id === opp.quotes[0].id)
    : undefined;
  const pax = latestQ?.cliente?.pasajeros;
  const ninos = latestQ?.cliente?.ninos;
  const acoms = latestQ?.acomodaciones ?? [];
  const uniqueAcoms = Array.from(new Set(acoms));

  // Build metadata chips text
  const metaParts: string[] = [];
  if (pax != null && pax > 0) metaParts.push(`${pax} ADULTO${pax !== 1 ? "S" : ""}`);
  if (ninos != null && ninos > 0) metaParts.push(`${ninos} NIÑO${ninos !== 1 ? "S" : ""}`);
  if (uniqueAcoms.length > 0) metaParts.push(uniqueAcoms.join("/"));
  metaParts.push(`${opp.quotes.length} COTIZACIÓN${opp.quotes.length !== 1 ? "ES" : ""}`);

  // Line 2: agency • destination
  const line2Parts: string[] = [];
  if (opp.agencyName) line2Parts.push(opp.agencyName.toUpperCase());
  if (opp.destination) line2Parts.push(opp.destination.toUpperCase());
  const line2 = line2Parts.join(" • ");

  // Format last update date
  const lastUpdateFormatted = opp.lastUpdateAt
    ? new Date(opp.lastUpdateAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
    : "—";

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden transition-all duration-150 cursor-default"
      style={{
        borderLeft: `5px solid ${borderColor}`,
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
        minHeight: 110,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px 0 rgba(0,0,0,0.10), 0 2px 6px -1px rgba(0,0,0,0.07)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = ""; }}
    >
      {/* ── Single horizontal row ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 sm:py-0 sm:min-h-[110px]">

        {/* ── SECTION 2: Logo ──────────────────────────────────────────── */}
        <div className="shrink-0 self-start sm:self-center mt-1 sm:mt-0">
          <LogoOrInitials agencia={agencia} initials={initials} color="#802d62" size={56} radius={14} />
        </div>

        {/* ── SECTION 3: Main info ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Line 1: Quote name */}
          <div className="font-bold text-slate-900 truncate leading-tight tracking-wide" style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.01em" }}>
            {(opp.quoteName || "SIN NOMBRE").toUpperCase()}
          </div>
          {/* Line 2: Agency • Destination */}
          {line2 && (
            <div className="text-[11px] font-semibold text-slate-600 truncate mt-0.5 tracking-wide">{line2}</div>
          )}
          {/* Line 3: Metadata chips */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
            {pax != null && pax > 0 && (
              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-0.5">
                <span>👥</span>{pax} ADULTO{pax !== 1 ? "S" : ""}
              </span>
            )}
            {ninos != null && ninos > 0 && (
              <>
                <span className="text-slate-300 text-[10px]">•</span>
                <span className="text-[10px] font-semibold text-slate-500">{ninos} NIÑO{ninos !== 1 ? "S" : ""}</span>
              </>
            )}
            {uniqueAcoms.length > 0 && (
              <>
                <span className="text-slate-300 text-[10px]">•</span>
                <span className="text-[10px] font-semibold text-slate-500">{uniqueAcoms.join("/")}</span>
              </>
            )}
            <span className="text-slate-300 text-[10px]">•</span>
            <span className="text-[10px] font-semibold text-slate-500">{opp.quotes.length} COTIZACIÓN{opp.quotes.length !== 1 ? "ES" : ""}</span>
            {opp.priorityManual && (
              <>
                <span className="text-slate-300 text-[10px]">•</span>
                <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />PRIORIDAD</span>
              </>
            )}
            {opp.createdByName && (
              <>
                <span className="text-slate-300 text-[10px]">•</span>
                <span className="text-[10px] text-slate-400">Creada por: {opp.createdByName}</span>
              </>
            )}
            {opp.updatedByName && (
              <>
                <span className="text-slate-300 text-[10px]">•</span>
                <span className="text-[10px] text-slate-400">
                  Mod: {opp.updatedByName}{opp.updatedAt ? ` · ${new Date(opp.updatedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}` : ""}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── SECTION 4: Price ─────────────────────────────────────────── */}
        <div className="shrink-0 sm:w-36 flex flex-col justify-center gap-0.5">
          {opp.totalLatest != null && opp.totalLatest > 0 ? (
            <div className="font-bold tabular-nums leading-none" style={{ fontSize: 18, color: "#802d62", fontWeight: 700, letterSpacing: "-0.02em" }}>
              {fmtMoney(opp.totalLatest)}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">Sin valor</div>
          )}
          {opp.latestQuoteCode && (
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Última: {opp.latestQuoteCode}</div>
          )}
          <button
            type="button"
            onClick={onOpenDetail}
            className="text-[10px] font-bold text-left mt-0.5 hover:underline underline-offset-2 transition-colors"
            style={{ color: "#802d62" }}
          >
            VER COTIZACIONES ({opp.quotes.length})
          </button>
        </div>

        {/* ── SECTION 5: Status ────────────────────────────────────────── */}
        <div className="shrink-0 sm:w-44 flex flex-col justify-center gap-0.5">
          {!isClosedStatus ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: uMeta.dot }} />
                <span className="text-[11px] font-bold text-slate-700 tracking-wide uppercase">{uMeta.label}</span>
              </div>
              <div className="text-[10px] font-semibold" style={{ color: urgency === "red" ? "#dc2626" : "#64748b" }}>
                {sinActividad === 0
                  ? "ACTUALIZADO HOY"
                  : `${sinActividad} DÍA${sinActividad !== 1 ? "S" : ""} SIN ACTUALIZACIÓN`}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                ACTUALIZADO: {lastUpdateFormatted}
              </div>
              {opp.recordatorio && (
                <div className="text-[10px] text-[#b78ca4] flex items-center gap-1 mt-0.5">
                  <CalendarClock className="w-3 h-3 shrink-0" />REC. {formatShortDate(opp.recordatorio).toUpperCase()}
                </div>
              )}
            </>
          ) : (
            <>
              {opp.status === "confirmada" ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Confirmada</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Perdida</span>
                </div>
              )}
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                ACTUALIZADO: {lastUpdateFormatted}
              </div>
            </>
          )}
        </div>

        {/* ── SECTION 6: Actions ───────────────────────────────────────── */}
        <div className="shrink-0 flex items-center gap-2 self-start sm:self-center mt-1 sm:mt-0">
          <button
            type="button"
            onClick={onOpenDetail}
            className="h-9 px-4 rounded-xl text-white text-[12px] font-bold tracking-wide hover:opacity-90 active:scale-95 transition-all"
            style={{ background: "#802d62" }}
          >
            ABRIR
          </button>
          <button
            ref={menuBtnRef}
            type="button"
            onClick={openMenu}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors shrink-0"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Portal dropdown menu ──────────────────────────────────────── */}
      {menuOpen && menuPos && createPortal(
        <div ref={menuRef} className="fixed bg-white rounded-xl shadow-xl py-1 min-w-[210px] z-[9999]" style={{ top: menuPos.top, right: menuPos.right, border: "1px solid #e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)" }}>
          <MenuItem icon={<Pencil className="w-3.5 h-3.5" />} label="Editar cotización" onClick={() => { onEdit(); close(); }} />
          {onDuplicate && <MenuItem icon={<Copy className="w-3.5 h-3.5" />} label="Duplicar" onClick={() => { onDuplicate(); close(); }} />}
          <MenuItem icon={<ExternalLink className="w-3.5 h-3.5" />} label="Abrir detalle" onClick={() => { onOpenDetail(); close(); }} />
          <div className="h-px bg-slate-100 my-1" />
          <MenuItem
            icon={opp.priorityManual ? <Star className="w-3.5 h-3.5 text-amber-500" /> : <Star className="w-3.5 h-3.5" />}
            label={opp.priorityManual ? "Quitar prioridad" : "Marcar prioridad"}
            onClick={() => {
              const tipo: OppHistorialEntry["tipo"] = opp.priorityManual ? "prioridad_quitada" : "prioridad_activada";
              onUpdateOpportunity({ priorityManual: !opp.priorityManual, historial: addHistorial(tipo) });
              close();
            }}
          />
          <div className="h-px bg-slate-100 my-1" />
          <MenuItem icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />} label="Confirmar venta" onClick={() => { onUpdateOpportunity({ status: "confirmada", historial: addHistorial("venta_confirmada") }); close(); }} />
          <MenuItem icon={<XCircle className="w-3.5 h-3.5 text-slate-400" />} label="Marcar como perdida" onClick={() => { onUpdateOpportunity({ status: "perdida", historial: addHistorial("marcada_perdida") }); close(); }} />
          <div className="h-px bg-slate-100 my-1" />
          <MenuItem icon={<Trash2 className="w-3.5 h-3.5" />} label="Anular" onClick={() => { onAnular(); close(); }} danger />
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Anuladas / Finalizadas Views ─────────────────────────────────────────────

function AnuladasView({ opps, agenciasMap, onRestaurar }: {
  opps: Opportunity[];
  agenciasMap: Map<string, Agencia>;
  onRestaurar: (o: Opportunity) => void;
}) {
  if (opps.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
        <Trash2 className="w-10 h-10 mx-auto text-slate-200 mb-3" />
        <div className="text-sm font-medium text-slate-600">No hay oportunidades anuladas</div>
        <div className="text-xs text-slate-400 mt-1">Las oportunidades anuladas aparecen aquí para que puedas restaurarlas.</div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <div className="text-sm font-bold text-slate-900">Anuladas</div>
        <div className="text-xs text-slate-400 mt-0.5">{opps.length} oportunidad{opps.length !== 1 ? "es" : ""} · puedes restaurarlas</div>
      </div>
      <div className="divide-y divide-slate-50">
        {opps.map((o) => {
          const agencia = agenciasMap.get((o.agencyName || "").toLowerCase());
          const initials = getInitials(o.agencyName || o.quoteName);
          return (
            <div key={o.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
              <LogoOrInitials agencia={agencia} initials={initials} color="#94a3b8" size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-700 truncate">{o.quoteName}</div>
                <div className="text-xs text-slate-400 truncate">{o.agencyName}{o.agentName ? ` · ${o.agentName}` : ""}</div>
              </div>
              <button type="button" onClick={() => onRestaurar(o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:bg-pink-100" style={{ background: "#f9f0f5", color: "#802d62" }}>
                <RotateCcw className="w-3 h-3" />Restaurar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinalizadasView({ opps, agenciasMap, onOpenDetail }: {
  opps: Opportunity[];
  agenciasMap: Map<string, Agencia>;
  onOpenDetail: (o: Opportunity) => void;
}) {
  if (opps.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
        <CheckCircle2 className="w-10 h-10 mx-auto text-slate-200 mb-3" />
        <div className="text-sm font-medium text-slate-600">No hay oportunidades finalizadas</div>
        <div className="text-xs text-slate-400 mt-1">Confirmadas y perdidas aparecen aquí.</div>
      </div>
    );
  }
  const confirmadas = opps.filter((o) => o.status === "confirmada");
  const perdidas = opps.filter((o) => o.status === "perdida");
  return (
    <div className="space-y-4">
      {confirmadas.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <div className="text-sm font-bold text-slate-900">Confirmadas</div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{confirmadas.length}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {confirmadas.map((o) => {
              const agencia = agenciasMap.get((o.agencyName || "").toLowerCase());
              const initials = getInitials(o.agencyName || o.quoteName);
              return (
                <div key={o.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                  <LogoOrInitials agencia={agencia} initials={initials} color="#10b981" size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-700 truncate">{o.quoteName}</div>
                    <div className="text-xs text-slate-400 truncate">{o.agencyName}{o.agentName ? ` · ${o.agentName}` : ""}</div>
                  </div>
                  {o.totalLatest != null && o.totalLatest > 0 && (
                    <span className="text-sm font-bold text-emerald-700">{fmtMoney(o.totalLatest)}</span>
                  )}
                  <button type="button" onClick={() => onOpenDetail(o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: "#f9f0f5", color: "#802d62" }}>
                    <ExternalLink className="w-3 h-3" />Detalle
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {perdidas.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-slate-400" />
            <div className="text-sm font-bold text-slate-900">Perdidas</div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{perdidas.length}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {perdidas.map((o) => {
              const agencia = agenciasMap.get((o.agencyName || "").toLowerCase());
              const initials = getInitials(o.agencyName || o.quoteName);
              return (
                <div key={o.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                  <LogoOrInitials agencia={agencia} initials={initials} color="#94a3b8" size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-500 truncate">{o.quoteName}</div>
                    <div className="text-xs text-slate-400 truncate">{o.agencyName}{o.agentName ? ` · ${o.agentName}` : ""}</div>
                  </div>
                  <button type="button" onClick={() => onOpenDetail(o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">
                    <ExternalLink className="w-3 h-3" />Detalle
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabView = "activas" | "finalizadas" | "anuladas";
type VerPor = "urgencia" | "agencia" | "estado";

export default function Seguimiento({ items, opportunities, onView, onEdit, onDelete, onDuplicate, onUpdateCRM, onUpdateOpportunity }: Props) {
  const [tab, setTab] = useState<TabView>("activas");
  const [query, setQuery] = useState("");
  const [verPor, setVerPor] = useState<VerPor>("urgencia");
  const [filterEstado, setFilterEstado] = useState<EstadoOportunidad | "todas">("todas");
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [openOppId, setOpenOppId] = useState<string | null>(null);

  useEffect(() => { loadAgenciasAsync().then(setAgencias); }, []);

  const agenciasMap = useMemo(() => {
    const map = new Map<string, Agencia>();
    for (const a of agencias) map.set(a.nombre.toLowerCase(), a);
    return map;
  }, [agencias]);

  const openOpp = useMemo(
    () => openOppId ? opportunities.find((o) => o.id === openOppId) ?? null : null,
    [openOppId, opportunities],
  );

  const activeOpps = useMemo(() => opportunities.filter((o) => o.status !== "anulada" && o.status !== "confirmada" && o.status !== "perdida"), [opportunities]);
  const finalizadasOpps = useMemo(() => opportunities.filter((o) => o.status === "confirmada" || o.status === "perdida"), [opportunities]);
  const anuladasOpps = useMemo(() => opportunities.filter((o) => o.status === "anulada"), [opportunities]);

  // ─── Metrics ──────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      total: activeOpps.length,
      prioritarias: activeOpps.filter((o) => o.priorityManual).length,
      urgentes: activeOpps.filter((o) => getOppUrgency(o) === "red").length,
      requierenSeg: activeOpps.filter((o) => getOppUrgency(o) === "yellow").length,
      alDia: activeOpps.filter((o) => getOppUrgency(o) === "green").length,
      accionHoy: activeOpps.filter((o) => {
        if (!o.recordatorio) return false;
        const d = new Date(o.recordatorio + "T23:59:59");
        return d <= new Date();
      }).length,
    };
  }, [activeOpps]);

  // ─── Filtered + sorted list ───────────────────────────────────────────────

  const listOpps = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = activeOpps;

    if (q) {
      filtered = filtered.filter((o) =>
        [o.quoteName, o.agencyName, o.agentName, o.counterName, o.destination, o.latestQuoteCode]
          .join(" ").toLowerCase().includes(q)
      );
    }
    if (filterEstado !== "todas") {
      filtered = filtered.filter((o) => o.status === filterEstado);
    }

    return [...filtered].sort((a, b) => {
      const skA = oppSortKey(a);
      const skB = oppSortKey(b);
      if (skA !== skB) return skA - skB;
      return new Date(a.lastUpdateAt).getTime() - new Date(b.lastUpdateAt).getTime();
    });
  }, [activeOpps, query, filterEstado, verPor]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const onAnular = (o: Opportunity) => {
    const entry: OppHistorialEntry = { fecha: new Date().toISOString(), tipo: "anulada" };
    onUpdateOpportunity(o.id, { status: "anulada", historial: [entry, ...(o.historial ?? [])].slice(0, 100) });
  };

  const onRestaurar = (o: Opportunity) => {
    const entry: OppHistorialEntry = { fecha: new Date().toISOString(), tipo: "restaurada" };
    onUpdateOpportunity(o.id, { status: "nueva", historial: [entry, ...(o.historial ?? [])].slice(0, 100) });
  };

  const getLatestQuote = (o: Opportunity): CotizacionGuardada | undefined => {
    for (const qRef of o.quotes) {
      const found = items.find((g) => g.id === qRef.id);
      if (found) return found;
    }
    return undefined;
  };

  const handleUpdateOpp = (id: string, patch: Partial<Opportunity>) => {
    onUpdateOpportunity(id, patch);
    if (openOppId === id) {
      // keep panel open — openOpp will re-derive from updated opportunities
    }
  };

  const inputCls = "h-9 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400";
  const selectCls = `${inputCls} pr-8 appearance-none`;

  return (
    <div className="space-y-5">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-slate-900" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Seguimiento de oportunidades</h2>
          <p className="text-sm text-slate-500 mt-0.5">Administra y da seguimiento a tus oportunidades comerciales</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {items.length > 0 && (
            <button type="button" onClick={() => exportarCotizacionesExcel(items)} className="flex items-center gap-2 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
              <FileDown className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Tab toggle ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white rounded-xl ring-1 ring-slate-100 p-1 shadow-sm w-fit">
        <button type="button" onClick={() => setTab("activas")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "activas" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Activas
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === "activas" ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{activeOpps.length}</span>
        </button>
        <button type="button" onClick={() => setTab("finalizadas")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "finalizadas" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Finalizadas
          {finalizadasOpps.length > 0 && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === "finalizadas" ? "bg-white/20" : "bg-emerald-50 text-emerald-600"}`}>{finalizadasOpps.length}</span>}
        </button>
        <button type="button" onClick={() => setTab("anuladas")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "anuladas" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Anuladas
          {anuladasOpps.length > 0 && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === "anuladas" ? "bg-white/20" : "bg-red-50 text-red-500"}`}>{anuladasOpps.length}</span>}
        </button>
      </div>

      {tab === "anuladas" ? (
        <AnuladasView opps={anuladasOpps} agenciasMap={agenciasMap} onRestaurar={onRestaurar} />
      ) : tab === "finalizadas" ? (
        <FinalizadasView opps={finalizadasOpps} agenciasMap={agenciasMap} onOpenDetail={(o) => setOpenOppId(o.id)} />
      ) : (
        <>
          {/* ── Metrics bar ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Total oportunidades" value={metrics.total} color="bg-[#f9f0f5] text-[#802d62]" icon={<TrendingUp className="w-5 h-5" />} />
            <KpiCard label="Acción hoy" value={metrics.accionHoy} color="" iconStyle={{ backgroundColor: "#f9f0f5", color: "#802d62" }} icon={<CalendarClock className="w-5 h-5" />} />
            <KpiCard label="Prioritarias" value={metrics.prioritarias} color="" iconStyle={{ backgroundColor: "#fef9c3", color: "#ca8a04" }} icon={<Star className="w-5 h-5" />} />
            <KpiCard label="Urgentes" value={metrics.urgentes} color="" iconStyle={{ backgroundColor: "#fee2e2", color: "#dc2626" }} icon={<AlertTriangle className="w-5 h-5" />} />
            <KpiCard label="Requieren seguimiento" value={metrics.requierenSeg} color="" iconStyle={{ backgroundColor: "#fef3c7", color: "#d97706" }} icon={<Bell className="w-5 h-5" />} />
            <KpiCard label="Al día" value={metrics.alDia} color="bg-emerald-50 text-emerald-600" icon={<CheckCircle2 className="w-5 h-5" />} />
          </div>

          {/* ── Filter bar ───────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Ver por:</span>
              {([ ["urgencia", "Urgencia"], ["agencia", "Agencia"], ["estado", "Estado"] ] as [VerPor, string][]).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setVerPor(v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${verPor === v ? "text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`} style={verPor === v ? { background: "#802d62" } : {}}>
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-slate-200 hidden sm:block" />

            <div className="relative">
              <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value as EstadoOportunidad | "todas")} className={selectCls} style={{ minWidth: 130 }}>
                <option value="todas">Estado: Todos</option>
                {ESTADO_OPP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="flex-1 min-w-[160px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar oportunidades…" className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400" />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Vertical list ────────────────────────────────────────────────── */}
          {activeOpps.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
              <ListChecks className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <div className="text-sm text-slate-700 font-medium">No hay oportunidades aún</div>
              <div className="text-xs text-slate-500 mt-1">Guarda una cotización, crea un PDF o copia un correo para crear tu primera oportunidad aquí.</div>
            </div>
          ) : listOpps.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-10 text-center">
              <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <div className="text-sm text-slate-600 font-medium">Sin resultados</div>
              <div className="text-xs text-slate-400 mt-1">Prueba ajustando los filtros o la búsqueda.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {listOpps.map((o) => {
                const agencia = agenciasMap.get((o.agencyName || "").toLowerCase());
                const latestQuote = getLatestQuote(o);
                return (
                  <OpportunityCard
                    key={o.id} opp={o}
                    agencia={agencia}
                    allQuotes={items}
                    onView={() => { if (latestQuote) onView(latestQuote); }}
                    onEdit={() => { if (latestQuote) onEdit(latestQuote); }}
                    onDuplicate={onDuplicate && latestQuote ? () => onDuplicate!(latestQuote) : undefined}
                    onOpenDetail={() => setOpenOppId(o.id)}
                    onUpdateOpportunity={(patch) => handleUpdateOpp(o.id, patch)}
                    onAnular={() => onAnular(o)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Opportunity Detail Panel ───────────────────────────────────────── */}
      {openOpp && (
        <OportunidadDetailPanel
          opp={openOpp}
          allQuotes={items}
          onClose={() => setOpenOppId(null)}
          onSave={(patch) => handleUpdateOpp(openOpp.id, patch)}
          onView={(g) => { onView(g); setOpenOppId(null); }}
          onDuplicate={onDuplicate ? (g) => { onDuplicate!(g); setOpenOppId(null); } : undefined}
        />
      )}
    </div>
  );
}
