import type {
  Acomodacion,
  Cliente,
  CotizacionResult,
  ServicioSeleccionado,
  Tier,
} from "./types";

export function pickTier(pasajeros: number): Tier {
  if (pasajeros <= 1) return "p1";
  if (pasajeros <= 5) return "p2_5";
  return "p6_10";
}

export function tierLabel(t: Tier): string {
  if (t === "p1") return "1 pax";
  if (t === "p2_5") return "2-5 pax";
  return "6-10 pax";
}

export function priceForTier(
  precios: { p1?: number; p2_5?: number; p6_10?: number },
  tier: Tier,
): number {
  return precios[tier] ?? 0;
}

export function diffNoches(start: string, end: string): number {
  if (!start || !end) return 0;
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function addDays(iso: string, days: number): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function fmt(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const EMPTY_ACOM = (): Record<Acomodacion, number> => ({
  SGL: 0,
  DBL: 0,
  TPL: 0,
  QDL: 0,
  CHD: 0,
});

const GRUPO_ROOM_PAX: Partial<Record<string, number>> = { SGL: 1, DBL: 2, TPL: 3, QDL: 4 };
const rpGrupo = (a: string) => GRUPO_ROOM_PAX[a] ?? 1;

export interface GrupoSubtotales {
  hoteleria: number;
  traslados: number;
  tours: number;
  vuelos: number;
  extras: number;
  total: number;
}

/**
 * Calcula el total del grupo correctamente a partir de los servicios individuales.
 *
 * Reglas:
 *   Hotel    → tarifa_por_persona × noches × (habitaciones × pax_por_hab)
 *   No-hotel → unitAplicado × totalPaxAdultos + chdUnit × ninos
 *
 * NO usa totalesPorAcomodacion porque ese campo ya fue multiplicado
 * por globalPax en calcularLocal y volver a multiplicar causaría doble conteo.
 */
export function calcGrupoTotalFromResult(
  result: CotizacionResult,
  habitacionesPorAcomodacion: Partial<Record<Acomodacion, number>>,
  ninos: number,
): GrupoSubtotales {
  const ROOM_ACOMS: Acomodacion[] = ["SGL", "DBL", "TPL", "QDL"];

  const groupAdultPax = ROOM_ACOMS.reduce(
    (s, a) => s + (habitacionesPorAcomodacion[a] ?? 0) * rpGrupo(a),
    0,
  );

  const subs: GrupoSubtotales = { hoteleria: 0, traslados: 0, tours: 0, vuelos: 0, extras: 0, total: 0 };

  for (const svc of result.servicios) {
    if (svc.tipo === "hotel") {
      const hotelNoches = svc.noches ?? 0;
      let svcCost = 0;
      for (const a of ROOM_ACOMS) {
        const rooms = habitacionesPorAcomodacion[a] ?? 0;
        if (rooms === 0) continue;
        const rate = svc.preciosPorAcomodacion[a] ?? 0;
        svcCost += rate * rooms * rpGrupo(a) * hotelNoches;
      }
      svcCost += (svc.preciosPorAcomodacion.CHD ?? 0) * ninos * hotelNoches;
      subs.hoteleria += svcCost;
    } else {
      const unit = svc.unitAplicado ?? (svc.preciosPorAcomodacion.DBL ?? 0);
      const catNoches = svc.tipo === "catamaran" && svc.noches ? svc.noches : 1;
      const ticketsAdult =
        svc.tipo === "tour" && svc.tickets?.enabled ? (svc.tickets.adultPrice ?? 0) : 0;
      const ticketsChild =
        svc.tipo === "tour" && svc.tickets?.enabled
          ? (svc.tickets.childPrice ?? ticketsAdult)
          : 0;
      const chdUnit = svc.preciosPorAcomodacion.CHD ?? 0;
      const svcCost = (unit + ticketsAdult) * catNoches * groupAdultPax + (chdUnit + ticketsChild) * catNoches * ninos;
      if (svc.tipo === "traslado") subs.traslados += svcCost;
      else if (svc.tipo === "tour") subs.tours += svcCost;
      else if (svc.tipo === "vuelo") subs.vuelos += svcCost;
      else subs.extras += svcCost;
    }
  }

  subs.total = subs.hoteleria + subs.traslados + subs.tours + subs.vuelos + subs.extras;
  return subs;
}

export function calcularLocal(
  servicios: ServicioSeleccionado[],
  acomodaciones: Acomodacion[],
  cliente: Cliente,
): CotizacionResult {
  const acoms =
    acomodaciones.length > 0 ? acomodaciones : (["DBL"] as Acomodacion[]);
  const noches = Math.max(0, cliente.noches || 0);
  const pasajerosGlobal = Math.max(1, cliente.pasajeros || 1);
  const ninos = Math.max(0, cliente.ninos || 0);

  const out = [] as CotizacionResult["servicios"];
  const subtotales = {
    hotel: EMPTY_ACOM(),
    tour: EMPTY_ACOM(),
    traslado: EMPTY_ACOM(),
    vuelo: EMPTY_ACOM(),
    catamaran: EMPTY_ACOM(),
  };

  for (const s of servicios) {
    const preciosPorAcom = EMPTY_ACOM();
    const totalesPorAcom = EMPTY_ACOM();
    const paxLocal = Math.max(1, s.paxOverride ?? pasajerosGlobal);

    if (s.tipo === "hotel") {
      preciosPorAcom.SGL = s.precios.SGL ?? 0;
      preciosPorAcom.DBL = s.precios.DBL ?? 0;
      preciosPorAcom.TPL = s.precios.TPL ?? 0;
      preciosPorAcom.QDL = s.precios.TPL ?? 0; // QDL uses TPL tarifa
      preciosPorAcom.CHD = s.precios.CHD ?? 0;
      const hotelNoches =
        s.fechaInicio && s.fechaFin
          ? diffNoches(s.fechaInicio, s.fechaFin)
          : noches;
      for (const a of acoms) {
        totalesPorAcom[a] = preciosPorAcom[a] * hotelNoches * paxLocal;
        subtotales.hotel[a] += totalesPorAcom[a];
      }
      // Always compute CHD tarifa regardless of acoms (needed for group mode + PDF)
      totalesPorAcom.CHD = preciosPorAcom.CHD * hotelNoches * paxLocal;
      subtotales.hotel.CHD += totalesPorAcom.CHD;
      out.push({
        id: s.id,
        codigo: s.codigo ?? s.id,
        tipo: "hotel",
        nombre: s.nombre,
        preciosPorAcomodacion: preciosPorAcom,
        totalesPorAcomodacion: totalesPorAcom,
        detalle: `${hotelNoches} noches × ${paxLocal} pax`,
        fechaInicio: s.fechaInicio,
        fechaFin: s.fechaFin,
        notas: s.notas,
        notesImportant: s.notesImportant,
        notasList: s.notasList,
        ubicacion: s.ubicacion,
        estrellas: s.estrellas,
        vigencia: s.vigencia,
        tipoHabitacion: s.tipoHabitacion,
        desayuno: s.desayuno,
        noches: hotelNoches,
        paxAplicados: paxLocal,
        images: s.images,
      });
    } else {
      const tier = s.tarifaOverride ?? pickTier(paxLocal);
      const unit =
        typeof s.unitOverride === "number"
          ? s.unitOverride
          : priceForTier(s.precios, tier);
      const chdUnit = s.precios.chd ?? 0;
      const ticketsAdult =
        s.tipo === "tour" && s.tickets?.enabled && s.tickets.adultPrice > 0
          ? s.tickets.adultPrice
          : 0;
      const ticketsChild =
        s.tipo === "tour" &&
        s.tickets?.enabled &&
        typeof s.tickets.childPrice === "number" &&
        s.tickets.childPrice > 0
          ? s.tickets.childPrice
          : ticketsAdult;
      const catNoches =
        s.tipo === "catamaran" && s.fechaInicio && s.fechaFin
          ? diffNoches(s.fechaInicio, s.fechaFin)
          : 1;
      preciosPorAcom.SGL = unit;
      preciosPorAcom.DBL = unit;
      preciosPorAcom.TPL = unit;
      preciosPorAcom.QDL = unit;
      preciosPorAcom.CHD = chdUnit;
      const totalUnit =
        (unit + ticketsAdult) * catNoches * paxLocal + (chdUnit + ticketsChild) * catNoches * ninos;
      for (const a of acoms) {
        totalesPorAcom[a] = totalUnit;
        subtotales[s.tipo][a] += totalUnit;
      }
      const detalle =
        s.tipo === "vuelo"
          ? `${paxLocal} pax${ninos ? ` + ${ninos} niños` : ""}`
          : s.tipo === "catamaran" && catNoches > 1
            ? `${catNoches} noches × ${paxLocal} pax${ninos ? ` + ${ninos} niños` : ""}`
            : `${paxLocal} pax (${tierLabel(tier)})${ninos ? ` + ${ninos} niños` : ""}`;
      out.push({
        id: s.id,
        codigo: s.codigo ?? s.id,
        tipo: s.tipo,
        nombre: s.nombre,
        origen: s.tipo === "vuelo" ? s.origen : undefined,
        destino: s.tipo === "vuelo" ? s.destino : undefined,
        preciosPorAcomodacion: preciosPorAcom,
        totalesPorAcomodacion: totalesPorAcom,
        detalle,
        fecha: s.usarFecha ? s.fecha : undefined,
        notas: s.notas,
        notesImportant: s.notesImportant,
        notasList: s.notasList,
        tierAplicado: tier,
        unitAplicado: unit,
        paxAplicados: paxLocal,
        tickets: s.tipo === "tour" ? s.tickets : undefined,
        horario: s.tipo === "tour" || s.tipo === "catamaran" ? s.horario : undefined,
        tipoServicio: s.tipoServicio,
        fechaInicio: s.tipo === "catamaran" ? s.fechaInicio : undefined,
        fechaFin: s.tipo === "catamaran" ? s.fechaFin : undefined,
        noches: s.tipo === "catamaran" && catNoches > 1 ? catNoches : undefined,
        images: s.images,
      });
    }
  }

  const totales = EMPTY_ACOM();
  for (const sv of out) {
    for (const a of acoms) {
      totales[a] += sv.totalesPorAcomodacion[a];
    }
    // Always accumulate CHD (child tarifa, not a room type)
    totales.CHD += sv.totalesPorAcomodacion.CHD;
  }

  return {
    servicios: out,
    totalesPorAcomodacion: totales,
    subtotalesPorTipo: subtotales,
    acomodaciones: acoms,
    noches,
    pasajeros: pasajerosGlobal,
    ninos,
  };
}
