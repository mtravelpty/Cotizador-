import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DAYS_ES = ["LU","MA","MI","JU","VI","SÁ","DO"];

const CLR_SELECTED  = "#802d62";
const CLR_RANGE_BG  = "rgba(128,45,98,0.10)";
const CLR_TEXT      = "#041941";
const CLR_ACCENT    = "#E6AE33";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayISO() {
  const t = new Date();
  return toISO(t.getFullYear(), t.getMonth(), t.getDate());
}
function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}
export function nightsBetween(inicio: string, fin: string): number {
  if (!inicio || !fin) return 0;
  const a = new Date(inicio + "T00:00:00");
  const b = new Date(fin + "T00:00:00");
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  fechaInicio: string;
  fechaFin: string;
  onSelect: (inicio: string, fin: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InlineRangePicker({ fechaInicio, fechaFin, onSelect }: Props) {
  const today = todayISO();

  const getInitialView = () => {
    const ref = fechaInicio || today;
    const p = parseISO(ref);
    return { year: p.y, month: p.m };
  };

  const [viewYear, setViewYear]   = useState(() => getInitialView().year);
  const [viewMonth, setViewMonth] = useState(() => getInitialView().month);
  const [selecting, setSelecting] = useState<"inicio" | "fin">("inicio");
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (iso: string) => {
    if (selecting === "inicio") {
      const keepFin = fechaFin && fechaFin > iso ? fechaFin : "";
      onSelect(iso, keepFin);
      setSelecting("fin");
    } else {
      if (!fechaInicio || iso > fechaInicio) {
        onSelect(fechaInicio, iso);
        setSelecting("inicio");
      } else if (iso === fechaInicio) {
        const next = new Date(iso + "T00:00:00");
        next.setDate(next.getDate() + 1);
        const nextISO = toISO(next.getFullYear(), next.getMonth(), next.getDate());
        onSelect(iso, nextISO);
        setSelecting("inicio");
      } else {
        onSelect(iso, "");
        setSelecting("fin");
      }
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = (() => {
    const d = new Date(viewYear, viewMonth, 1).getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const activeEnd = selecting === "fin" && hoverDate ? hoverDate : fechaFin;
  const hasRange  = !!(fechaInicio && activeEnd && activeEnd > fechaInicio);

  return (
    <div style={{ userSelect: "none" }}>
      {/* ── Month navigation ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button type="button" onClick={prevMonth} style={navBtn}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, color: CLR_TEXT, letterSpacing: "0.02em" }}>
          {MONTHS_ES[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth} style={navBtn}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* ── Day-of-week headers ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
        {DAYS_ES.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 8, fontWeight: 700, color: "#94a3b8", paddingBottom: 4, letterSpacing: "0.07em" }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Day cells ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`e${i}`} style={{ height: 32 }} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const iso = toISO(viewYear, viewMonth, day);

          const isStart   = iso === fechaInicio;
          const isEnd     = iso === activeEnd;
          const inRange   = hasRange && iso > fechaInicio && iso < activeEnd;
          const isToday   = iso === today;
          const isSelected = isStart || isEnd;

          const showBandFull  = inRange;
          const showBandRight = isStart && hasRange;
          const showBandLeft  = isEnd && hasRange && fechaInicio < iso;
          const showHoverBand = selecting === "fin" && hoverDate && fechaInicio &&
            iso > fechaInicio && iso <= hoverDate && !isSelected;

          return (
            <div
              key={iso}
              style={{ position: "relative", height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {showBandFull && (
                <div style={{ position: "absolute", inset: "3px 0", background: CLR_RANGE_BG }} />
              )}
              {showHoverBand && !showBandFull && (
                <div style={{ position: "absolute", inset: "3px 0", background: "rgba(128,45,98,0.06)" }} />
              )}
              {showBandRight && (
                <div style={{ position: "absolute", top: 3, bottom: 3, left: "50%", right: 0, background: CLR_RANGE_BG }} />
              )}
              {showBandLeft && (
                <div style={{ position: "absolute", top: 3, bottom: 3, left: 0, right: "50%", background: CLR_RANGE_BG }} />
              )}
              <button
                type="button"
                onClick={() => handleDayClick(iso)}
                onMouseEnter={() => selecting === "fin" && setHoverDate(iso)}
                onMouseLeave={() => selecting === "fin" && setHoverDate(null)}
                style={{
                  position:       "relative",
                  zIndex:         1,
                  width:          28,
                  height:         28,
                  borderRadius:   "50%",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  fontSize:       11,
                  fontWeight:     isSelected ? 700 : 400,
                  color:          isSelected ? "#fff" : isToday ? CLR_ACCENT : CLR_TEXT,
                  background:     isSelected ? CLR_SELECTED : "transparent",
                  border:         isToday && !isSelected ? `1.5px solid ${CLR_ACCENT}` : "1.5px solid transparent",
                  cursor:         "pointer",
                  outline:        "none",
                  transition:     "background 0.1s, color 0.1s",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Selecting indicator chips ── */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #f1f5f9", display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
        <Chip active={selecting === "inicio"} label="Llegada" value={fechaInicio} onClick={() => setSelecting("inicio")} />
        <span style={{ color: "#cbd5e1", fontSize: 11 }}>→</span>
        <Chip active={selecting === "fin"} label="Salida" value={fechaFin} onClick={() => { if (fechaInicio) setSelecting("fin"); }} />
        {fechaInicio && fechaFin && fechaFin > fechaInicio && (
          <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 600, color: "#64748b", background: "#f1f5f9", borderRadius: 10, padding: "2px 7px" }}>
            {nightsBetween(fechaInicio, fechaFin)}n
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ active, label, value, onClick }: { active: boolean; label: string; value: string; onClick?: () => void }) {
  let display = label;
  if (value) {
    const [, m, d] = value.split("-").map(Number);
    const MES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    display = `${String(d).padStart(2, "0")} ${MES[m - 1]}`;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding:      "2px 9px",
        borderRadius: 20,
        fontSize:     10,
        fontWeight:   600,
        background:   active ? "rgba(128,45,98,0.08)" : "#f8fafc",
        color:        active ? CLR_SELECTED : "#94a3b8",
        border:       active ? "1px solid rgba(128,45,98,0.25)" : "1px solid #e2e8f0",
        cursor:       "pointer",
        outline:      "none",
      }}
    >
      {display}
    </button>
  );
}

// ─── Nav button style ─────────────────────────────────────────────────────────

const navBtn: React.CSSProperties = {
  width:          24,
  height:         24,
  borderRadius:   6,
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  background:     "#f8fafc",
  border:         "1px solid #e2e8f0",
  cursor:         "pointer",
  color:          CLR_TEXT,
  outline:        "none",
};
