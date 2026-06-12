import { Map } from "lucide-react";
import type { Cliente, ServicioSeleccionado } from "@/lib/types";
import { addDays } from "@/lib/calc";
import { formatTrasladoNombre } from "@/lib/utils";
import { useEffect, useRef } from "react";

const ARROW = "→";

/** Format a transfer name showing only the relevant leg for arrival/departure.
 *  - Round-trip (3+ segments): "A → B → C"
 *      mode="llegada"  → "A → B"
 *      mode="salida"   → "B → C"
 *  - One-way / single leg: returned as-is.
 */
function formatTrasladoTramo(
  name: string,
  mode: "llegada" | "salida",
): string {
  const clean = formatTrasladoNombre(name);
  const segs = clean
    .split(ARROW)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segs.length < 3) return clean;
  if (mode === "llegada") return `${segs[0]} ${ARROW} ${segs[1]}`;
  return `${segs[segs.length - 2]} ${ARROW} ${segs[segs.length - 1]}`;
}

function formatFechaDMY(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

interface Props {
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  hotelPrincipal?: string;
  incluirDescriptivos: boolean;
  actividadesOverride?: Record<number, string>;
  onActividadesOverrideChange?: (next: Record<number, string>) => void;
}

export interface ItinerarioDia {
  dia: number;
  fecha: string;
  actividad: string;
  hotel: string;
  descripcion?: string;
  /** Tour-day only: schedule label "{days} · {time} · {duration}". */
  horario?: string;
  /** Whether this day's activity is a tour (vs llegada/salida/día libre). */
  esTour?: boolean;
}

export function buildItinerario(
  cliente: Cliente,
  servicios: ServicioSeleccionado[],
): ItinerarioDia[] {
  const noches = Math.max(0, cliente.noches || 0);
  const dias = noches + 1;
  const traslados = servicios.filter((s) => s.tipo === "traslado");
  const tours = servicios.filter((s) => s.tipo === "tour");
  const hoteles = servicios.filter((s) => s.tipo === "hotel");
  const hotelDefault = hoteles[0]?.nombre || "—";

  const out: ItinerarioDia[] = [];
  let tourIdx = 0;

  for (let i = 0; i < dias; i++) {
    const fecha = cliente.fechaInicio ? addDays(cliente.fechaInicio, i) : "";
    let actividad = "";
    let hotel = hotelDefault;
    let descripcion = "";
    let horario: string | undefined;
    let esTour = false;

    if (i === 0) {
      const t = traslados[0];
      const tramo = t
        ? `Traslado ${formatTrasladoTramo(t.nombre, "llegada")}`
        : "Traslado al hotel";
      actividad = `Llegada · ${tramo}`;
      descripcion = tramo;
    } else if (i === dias - 1) {
      const t = traslados[traslados.length - 1];
      const tramo = t
        ? `Traslado ${formatTrasladoTramo(t.nombre, "salida")}`
        : "Traslado al aeropuerto";
      actividad = `Salida · ${tramo}`;
      descripcion = tramo;
      hotel = "—";
    } else {
      const tour = tours[tourIdx++];
      actividad = tour ? tour.nombre : "Día libre";
      descripcion = tour ? tour.nombre : "Día libre para actividades a su elección";
      if (tour) {
        esTour = true;
        horario = tour.horario?.trim() || undefined;
      }
    }

    out.push({ dia: i + 1, fecha, actividad, hotel, descripcion, horario, esTour });
  }
  return out;
}

interface ActividadCellProps {
  dia: number;
  value: string;
  editable: boolean;
  onCommit: (next: string) => void;
}

function ActividadCell({ dia, value, editable, onCommit }: ActividadCellProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (document.activeElement === ref.current) return;
    if (ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  if (!editable) {
    return (
      <div className="text-slate-900 font-medium">{value}</div>
    );
  }

  return (
    <div
      ref={ref}
      role="textbox"
      aria-label={`Editar actividad del día ${dia}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      className="text-slate-900 font-medium outline-none focus:ring-2 focus:ring-primary/40 rounded px-1 -mx-1 cursor-text"
      onBlur={(e) => {
        const next = e.currentTarget.textContent ?? "";
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLDivElement).blur();
        }
      }}
    >
      {value}
    </div>
  );
}

export default function Itinerario({
  cliente,
  servicios,
  incluirDescriptivos,
  actividadesOverride,
  onActividadesOverrideChange,
}: Props) {
  const itinerario = buildItinerario(cliente, servicios);
  const overrides = actividadesOverride ?? {};
  const editable = typeof onActividadesOverrideChange === "function";

  const commit = (dia: number, next: string) => {
    if (!onActividadesOverrideChange) return;
    const trimmed = next.trim();
    const original = itinerario.find((x) => x.dia === dia)?.actividad ?? "";
    const copy = { ...overrides };
    if (!trimmed || trimmed === original) {
      delete copy[dia];
    } else {
      copy[dia] = trimmed;
    }
    onActividadesOverrideChange(copy);
  };

  return (
    <div className="card-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Map className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Itinerario</h2>
          <p className="text-xs text-slate-500">
            Vista previa del día a día generado automáticamente
            {editable ? " · Click en la actividad para editar" : ""}
          </p>
        </div>
      </div>

      {itinerario.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-500">
          Define noches o fechas para generar el itinerario.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="text-left py-2 px-2 w-16">Día</th>
                <th className="text-left py-2 px-2 w-28">Fecha</th>
                <th className="text-left py-2 px-2">Actividad</th>
              </tr>
            </thead>
            <tbody>
              {itinerario.map((d) => {
                const value = overrides[d.dia] ?? d.actividad;
                return (
                  <tr
                    key={d.dia}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-3 px-2">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {d.dia}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-slate-700 text-xs">
                      {d.fecha ? formatFechaDMY(d.fecha) : "—"}
                    </td>
                    <td className="py-3 px-2">
                      <ActividadCell
                        dia={d.dia}
                        value={value}
                        editable={editable}
                        onCommit={(next) => commit(d.dia, next)}
                      />
                      {incluirDescriptivos && d.esTour && d.horario && (
                        <div className="text-xs text-slate-500 mt-1.5">
                          Horario: {d.horario}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
