import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, X, ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const MONTHS_SHORT = [
  "ENE","FEB","MAR","ABR","MAY","JUN",
  "JUL","AGO","SEP","OCT","NOV","DIC",
];
const DAYS_ES = ["LU","MA","MI","JU","VI","SÁ","DO"];

const CLR_SELECTED = "#802d62";
const CLR_TEXT     = "#041941";
const CLR_ACCENT   = "#E6AE33";
const CAL_WIDTH    = 300;
const YEAR_START   = 2023;
const YEAR_END     = 2031;

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayISO(): string {
  const t = new Date();
  return toISO(t.getFullYear(), t.getMonth(), t.getDate());
}
function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}
function fmtDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

interface Props {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  error?: boolean;
  allowPast?: boolean;
  disabled?: boolean;
  minDate?: string;
}

export default function PremiumSingleDatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  error = false,
  allowPast = true,
  disabled = false,
  minDate,
}: Props) {
  const today = todayISO();
  const effectiveMin = minDate ?? (allowPast ? undefined : today);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker]   = useState(false);

  const triggerRef  = useRef<HTMLDivElement>(null);
  const calRef      = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  const getInitialView = useCallback(() => {
    const ref = value || today;
    const p = parseISO(ref);
    return { year: p.y, month: p.m };
  }, [value, today]);

  const [viewYear, setViewYear]   = useState(() => getInitialView().year);
  const [viewMonth, setViewMonth] = useState(() => getInitialView().month);

  useEffect(() => {
    if (!open) return;
    const { year, month } = getInitialView();
    setViewYear(year);
    setViewMonth(month);
    setShowMonthPicker(false);
    setShowYearPicker(false);
  }, [open, getInitialView]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      let left = rect.left;
      let top  = rect.bottom + 6;
      if (left + CAL_WIDTH > window.innerWidth - 8) left = window.innerWidth - CAL_WIDTH - 8;
      if (left < 8) left = 8;
      setPos({ top, left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!calRef.current?.contains(t) && !triggerRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (showYearPicker && yearListRef.current) {
      const el = yearListRef.current.querySelector("[data-selected='true']") as HTMLElement | null;
      if (el) el.scrollIntoView({ block: "center" });
    }
  }, [showYearPicker]);

  const prevMonth = () => {
    setShowMonthPicker(false); setShowYearPicker(false);
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    setShowMonthPicker(false); setShowYearPicker(false);
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (iso: string) => {
    if (effectiveMin && iso < effectiveMin) return;
    onChange(iso);
    setOpen(false);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow    = (() => {
    const d = new Date(viewYear, viewMonth, 1).getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const ringCls = error
    ? "ring-2 ring-red-300 border-red-400"
    : open
      ? "ring-2 ring-[#802d62]/30 border-[#802d62]"
      : "border-slate-200 hover:border-slate-300";

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative flex items-center h-10 rounded-xl border bg-white cursor-pointer transition-all ${ringCls} ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
        onClick={() => !disabled && setOpen(v => !v)}
      >
        <div className="flex items-center gap-2 pl-3 flex-1 min-w-0">
          <CalendarDays className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className={`text-sm font-medium truncate ${value ? "text-slate-900" : "text-slate-400"}`}>
            {value ? fmtDisplay(value) : placeholder}
          </span>
        </div>
        {value ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="p-1.5 mr-1 text-slate-400 hover:text-slate-700 flex-shrink-0 rounded-lg hover:bg-slate-100"
            aria-label="Limpiar fecha"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="w-2 mr-2" />
        )}
      </div>

      {open && pos && createPortal(
        <div
          ref={calRef}
          style={{
            position:     "fixed",
            top:          pos.top,
            left:         pos.left,
            width:        CAL_WIDTH,
            zIndex:       9999,
            background:   "#fff",
            borderRadius: 20,
            boxShadow:    "0 24px 64px rgba(0,30,90,0.20), 0 4px 16px rgba(0,0,0,0.08)",
            border:       "1px solid rgba(128,45,98,0.14)",
            padding:      "16px 14px 18px",
            userSelect:   "none",
            animation:    "psdp-fadein 0.12s ease",
          }}
        >
          {/* Month navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button type="button" onClick={prevMonth} style={navBtn}>
              <ChevronLeft size={15} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {/* Month picker */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowYearPicker(false); setShowMonthPicker(v => !v); }}
                  style={{ fontSize: 13, fontWeight: 700, color: CLR_TEXT, letterSpacing: "0.02em", background: showMonthPicker ? "rgba(128,45,98,0.08)" : "transparent", border: "1.5px solid " + (showMonthPicker ? "rgba(128,45,98,0.25)" : "transparent"), borderRadius: 8, padding: "2px 6px", cursor: "pointer", outline: "none", transition: "background 0.15s" }}
                >
                  {MONTHS_ES[viewMonth]}
                </button>
                {showMonthPicker && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{ position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,30,90,0.18), 0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(128,45,98,0.14)", padding: "8px", zIndex: 10001, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, width: 174, animation: "psdp-fadein 0.12s ease" }}
                  >
                    {MONTHS_SHORT.map((m, i) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setViewMonth(i); setShowMonthPicker(false); }}
                        style={{ fontSize: 11, fontWeight: i === viewMonth ? 700 : 500, color: i === viewMonth ? "#fff" : CLR_TEXT, background: i === viewMonth ? CLR_SELECTED : "transparent", border: "1.5px solid " + (i === viewMonth ? CLR_SELECTED : "transparent"), borderRadius: 7, padding: "5px 0", cursor: "pointer", outline: "none", textAlign: "center" }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Year picker */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowMonthPicker(false); setShowYearPicker(v => !v); }}
                  style={{ fontSize: 13, fontWeight: 700, color: CLR_TEXT, letterSpacing: "0.02em", background: showYearPicker ? "rgba(128,45,98,0.08)" : "transparent", border: "1.5px solid " + (showYearPicker ? "rgba(128,45,98,0.25)" : "transparent"), borderRadius: 8, padding: "2px 6px", cursor: "pointer", outline: "none", transition: "background 0.15s" }}
                >
                  {viewYear}
                </button>
                {showYearPicker && (
                  <div
                    ref={yearListRef}
                    onClick={e => e.stopPropagation()}
                    style={{ position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,30,90,0.18)", border: "1px solid rgba(128,45,98,0.14)", padding: "6px 4px", zIndex: 10001, width: 90, maxHeight: 160, overflowY: "auto", animation: "psdp-fadein 0.12s ease" }}
                  >
                    {Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i).map(yr => (
                      <button
                        key={yr}
                        type="button"
                        data-selected={yr === viewYear ? "true" : "false"}
                        onClick={() => { setViewYear(yr); setShowYearPicker(false); }}
                        style={{ display: "block", width: "100%", fontSize: 12, fontWeight: yr === viewYear ? 700 : 500, color: yr === viewYear ? "#fff" : CLR_TEXT, background: yr === viewYear ? CLR_SELECTED : "transparent", border: "none", borderRadius: 7, padding: "5px 0", cursor: "pointer", outline: "none", textAlign: "center" }}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button type="button" onClick={nextMonth} style={navBtn}>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
            {DAYS_ES.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "#94a3b8", paddingBottom: 6, letterSpacing: "0.07em" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`e${i}`} style={{ height: 36 }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const iso = toISO(viewYear, viewMonth, day);
              const isSelected = iso === value;
              const isToday    = iso === today;
              const isDisabled = !!(effectiveMin && iso < effectiveMin);

              return (
                <div key={iso} style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => !isDisabled && handleDayClick(iso)}
                    disabled={isDisabled}
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12,
                      fontWeight: isSelected ? 700 : 400,
                      color:  isDisabled ? "#d1d5db" : isSelected ? "#fff" : isToday ? CLR_ACCENT : CLR_TEXT,
                      background: isSelected ? CLR_SELECTED : "transparent",
                      border: isToday && !isSelected ? `1.5px solid ${CLR_ACCENT}` : "1.5px solid transparent",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      outline: "none",
                      transition: "background 0.1s, color 0.1s",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Selected date chip */}
          {value && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "center" }}>
              <div style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(128,45,98,0.08)", color: CLR_SELECTED, border: "1px solid rgba(128,45,98,0.25)" }}>
                {fmtDisplay(value)}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      <style>{`
        @keyframes psdp-fadein {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

const navBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "#f8fafc", border: "1px solid #e2e8f0",
  cursor: "pointer", color: CLR_TEXT, outline: "none",
};
