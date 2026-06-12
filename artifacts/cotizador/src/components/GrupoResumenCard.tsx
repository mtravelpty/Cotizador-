import type { Acomodacion, CotizacionResult } from "@/lib/types";
import { fmt } from "@/lib/calc";
import { Users } from "lucide-react";

const ROOM_PAX: Partial<Record<Acomodacion, number>> = {
  SGL: 1,
  DBL: 2,
  TPL: 3,
  QDL: 4,
};
const ROOM_ACOMS: Acomodacion[] = ["SGL", "DBL", "TPL", "QDL"];

function roomPax(a: Acomodacion): number {
  return ROOM_PAX[a] ?? 1;
}

/** Total adult pax from room distribution (SGL/DBL/TPL/QDL only). */
export function calcAdultosPax(
  hab: Partial<Record<Acomodacion, number>>,
): number {
  return ROOM_ACOMS.reduce((s, a) => s + (hab[a] ?? 0) * roomPax(a), 0);
}

/** Total grupo cost: SGL/DBL/TPL/QDL rooms + ninos × CHD rate. */
export function calcGrupoTotal(
  acoms: Acomodacion[],
  hab: Partial<Record<Acomodacion, number>>,
  totales: Partial<Record<Acomodacion, number>>,
  ninos: number,
): number {
  const roomTotal = ROOM_ACOMS.filter((a) => acoms.includes(a)).reduce(
    (s, a) => s + (totales[a] ?? 0) * (hab[a] ?? 0) * roomPax(a),
    0,
  );
  const chdRate = totales["CHD" as Acomodacion] ?? 0;
  return roomTotal + ninos * chdRate;
}

const ACOM_COLORS: Partial<Record<Acomodacion, { bg: string; text: string; border: string; btn: string; btnBorder: string }>> = {
  SGL: { bg: "#f9f0f5", text: "#802d62", border: "#d4a8c0", btn: "#f0e0ea", btnBorder: "#d4a8c0" },
  DBL: { bg: "#fff8e1", text: "#9a6a00", border: "#e6ae33", btn: "#fef3c7", btnBorder: "#e6ae33" },
  TPL: { bg: "#f9f0f5", text: "#802d62", border: "#d4a8c0", btn: "#f0e0ea", btnBorder: "#d4a8c0" },
  QDL: { bg: "#fff8e1", text: "#9a6a00", border: "#e6ae33", btn: "#fef3c7", btnBorder: "#e6ae33" },
};

interface Props {
  acomodaciones: Acomodacion[];
  result: CotizacionResult;
  habitaciones: Partial<Record<Acomodacion, number>>;
  onHabitacionesChange: (next: Partial<Record<Acomodacion, number>>) => void;
  ninos: number;
}

export default function GrupoResumenCard({
  acomodaciones,
  result,
  habitaciones,
  onHabitacionesChange,
  ninos,
}: Props) {
  const roomAcoms = ROOM_ACOMS.filter((a) => acomodaciones.includes(a));
  const adultosPax = calcAdultosPax(habitaciones);
  const totalPax = adultosPax + ninos;
  const totalGrupo = calcGrupoTotal(
    acomodaciones,
    habitaciones,
    result.totalesPorAcomodacion,
    ninos,
  );

  const setHab = (a: Acomodacion, val: number) =>
    onHabitacionesChange({ ...habitaciones, [a]: Math.max(0, val) });

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      {/* Header — clean card style */}
      <div className="px-5 pt-4 pb-3 flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "rgba(128,45,98,0.08)" }}
        >
          <Users className="w-4 h-4" style={{ color: "#802d62" }} />
        </div>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#07152f",
            }}
          >
            Distribución del Grupo
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
            Configure la distribución de habitaciones para su grupo
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #f1f5f9" }} />

      {/* Room controls — all 4 in one row */}
      <div className="px-4 py-4">
        {roomAcoms.length === 0 ? (
          <p className="text-[12px] text-slate-400 italic text-center py-2">
            Activa SGL, DBL, TPL o QDL en la barra de acomodaciones.
          </p>
        ) : (
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${roomAcoms.length}, 1fr)` }}
          >
            {roomAcoms.map((a) => {
              const count = habitaciones[a] ?? 0;
              const pax = count * roomPax(a);
              const colors = ACOM_COLORS[a] ?? {
                bg: "#f8fafc",
                text: "#475569",
                border: "#e2e8f0",
                btn: "#f1f5f9",
                btnBorder: "#e2e8f0",
              };
              return (
                <div
                  key={a}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-2"
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {/* Badge */}
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                    style={{
                      background: "rgba(255,255,255,0.7)",
                      color: colors.text,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {a}
                  </span>

                  {/* Counter */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setHab(a, count - 1)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold transition-all select-none"
                      style={{
                        background: colors.btn,
                        color: colors.text,
                        border: `1px solid ${colors.btnBorder}`,
                      }}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={count}
                      onChange={(e) =>
                        setHab(a, parseInt(e.target.value) || 0)
                      }
                      className="w-8 text-center text-sm font-extrabold focus:outline-none bg-transparent"
                      style={{ color: colors.text }}
                    />
                    <button
                      type="button"
                      onClick={() => setHab(a, count + 1)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold transition-all select-none"
                      style={{
                        background: colors.btn,
                        color: colors.text,
                        border: `1px solid ${colors.btnBorder}`,
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Pax count */}
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: colors.text, opacity: 0.75 }}
                  >
                    {pax} {pax === 1 ? "pasajero" : "pasajeros"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Summary — 2 cards side by side */}
      <div
        className="px-4 pb-4 grid grid-cols-2 gap-2"
        style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}
      >
        <div
          className="rounded-xl px-4 py-3 flex flex-col gap-0.5"
          style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "#94a3b8" }}
          >
            Total Pasajeros
          </span>
          <span
            className="text-2xl font-extrabold leading-none"
            style={{ color: "#0043BB" }}
          >
            {totalPax}
          </span>
        </div>

        <div
          className="rounded-xl px-4 py-3 flex flex-col gap-0.5"
          style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "#94a3b8" }}
          >
            Total del Grupo
          </span>
          <span
            className="text-lg font-extrabold leading-none"
            style={{ color: "#07152f" }}
          >
            USD {fmt(totalGrupo)}
          </span>
        </div>
      </div>
    </div>
  );
}
