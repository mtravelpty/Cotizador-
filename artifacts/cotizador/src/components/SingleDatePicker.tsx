import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.min.css";
import { CalendarDays, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  error?: boolean;
  allowPast?: boolean;
  disabled?: boolean;
  minDate?: string;
}

function fmtDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SingleDatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  error = false,
  allowPast = true,
  disabled = false,
  minDate,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!inputRef.current) return;

    fpRef.current = flatpickr(inputRef.current, {
      mode: "single",
      dateFormat: "Y-m-d",
      minDate: minDate ?? (allowPast ? undefined : "today"),
      disableMobile: true,
      defaultDate: value || undefined,
      onChange(selectedDates) {
        const [d] = selectedDates;
        onChangeRef.current(d ? toISO(d) : "");
      },
      onReady(_d, _s, fp) {
        fp.calendarContainer.classList.add("rge-fp-calendar", "rge-fp-single");
      },
    });

    return () => {
      fpRef.current?.destroy();
      fpRef.current = null;
    };
  }, []);

  // Sync value from outside
  useEffect(() => {
    if (!fpRef.current) return;
    const current = fpRef.current.selectedDates[0];
    const currentISO = current ? toISO(current) : "";
    if (currentISO !== value) {
      fpRef.current.setDate(value || [], false);
    }
  }, [value]);

  // Update minDate dynamically (e.g. checkout follows checkin)
  useEffect(() => {
    if (!fpRef.current) return;
    const newMin = minDate ?? (allowPast ? undefined : "today");
    fpRef.current.set("minDate", newMin);
  }, [minDate, allowPast]);

  const ringCls = error
    ? "ring-2 ring-red-300 border-red-400"
    : "border-slate-200 focus-within:ring-2 focus-within:ring-[#802d62]/30 focus-within:border-[#802d62]";

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    fpRef.current?.clear();
    onChange("");
  };

  return (
    <div
      className={`relative flex items-center h-10 rounded-xl border bg-white cursor-pointer transition-all ${ringCls} ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
      onClick={() => !disabled && fpRef.current?.open()}
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
          onClick={clear}
          className="p-1.5 mr-1 text-slate-400 hover:text-slate-700 flex-shrink-0 rounded-lg hover:bg-slate-100"
          aria-label="Limpiar fecha"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="w-2 mr-2" />
      )}
      <input
        ref={inputRef}
        type="text"
        readOnly
        disabled={disabled}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        aria-label={placeholder}
      />
    </div>
  );
}
