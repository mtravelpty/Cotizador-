import type { Hotel, Tour, Traslado } from "./excel";

export type Acomodacion = "SGL" | "DBL" | "TPL";

export interface ServicioInput {
  id: string;
  tipo: "hotel" | "tour" | "traslado";
  cantidad?: number;
}

export interface CotizacionInput {
  servicios: ServicioInput[];
  acomodaciones: Acomodacion[];
  noches: number;
  pasajeros: number;
  ninos?: number;
}

export interface ServicioCalculado {
  id: string;
  tipo: "hotel" | "tour" | "traslado";
  nombre: string;
  preciosPorAcomodacion: Record<Acomodacion, number>;
  totalesPorAcomodacion: Record<Acomodacion, number>;
  detalle: string;
}

export interface CotizacionResult {
  servicios: ServicioCalculado[];
  totalesPorAcomodacion: Record<Acomodacion, number>;
  acomodaciones: Acomodacion[];
  noches: number;
  pasajeros: number;
  ninos: number;
}

function tieredPrice(
  precios: { p1: number; p2_5: number; p6_10: number },
  pasajeros: number,
): number {
  if (pasajeros <= 1) return precios.p1 || precios.p2_5;
  if (pasajeros <= 5) return precios.p2_5;
  if (pasajeros <= 10) return precios.p6_10 || precios.p2_5;
  return precios.p6_10 || precios.p2_5;
}

export function calcularCotizacion(
  input: CotizacionInput,
  catalog: { hoteles: Hotel[]; tours: Tour[]; traslados: Traslado[] },
): CotizacionResult {
  const acomodaciones =
    input.acomodaciones.length > 0 ? input.acomodaciones : ["DBL" as Acomodacion];
  const noches = Math.max(0, input.noches || 0);
  const pasajeros = Math.max(1, input.pasajeros || 1);
  const ninos = Math.max(0, input.ninos || 0);

  const servicios: ServicioCalculado[] = [];

  for (const s of input.servicios) {
    if (s.tipo === "hotel") {
      const h = catalog.hoteles.find((x) => x.id === s.id);
      if (!h) continue;
      const preciosPorAcom: Record<Acomodacion, number> = {
        SGL: h.precios.SGL,
        DBL: h.precios.DBL,
        TPL: h.precios.TPL,
      };
      const totalesPorAcom: Record<Acomodacion, number> = {
        SGL: 0,
        DBL: 0,
        TPL: 0,
      };
      for (const a of acomodaciones) {
        // hotel price is per person per night
        totalesPorAcom[a] = preciosPorAcom[a] * noches * pasajeros;
      }
      servicios.push({
        id: h.id,
        tipo: "hotel",
        nombre: h.nombre,
        preciosPorAcomodacion: preciosPorAcom,
        totalesPorAcomodacion: totalesPorAcom,
        detalle: `${noches} noches × ${pasajeros} pax`,
      });
    } else if (s.tipo === "tour") {
      const t = catalog.tours.find((x) => x.id === s.id);
      if (!t) continue;
      const unit = tieredPrice(t.precios, pasajeros);
      const preciosPorAcom: Record<Acomodacion, number> = {
        SGL: unit,
        DBL: unit,
        TPL: unit,
      };
      const totalesPorAcom: Record<Acomodacion, number> = {
        SGL: 0,
        DBL: 0,
        TPL: 0,
      };
      for (const a of acomodaciones) {
        totalesPorAcom[a] =
          unit * pasajeros + (t.precios.chd || 0) * ninos;
      }
      servicios.push({
        id: t.id,
        tipo: "tour",
        nombre: t.nombre,
        preciosPorAcomodacion: preciosPorAcom,
        totalesPorAcomodacion: totalesPorAcom,
        detalle: `${pasajeros} pax${ninos ? ` + ${ninos} niños` : ""}`,
      });
    } else if (s.tipo === "traslado") {
      const tr = catalog.traslados.find((x) => x.id === s.id);
      if (!tr) continue;
      const unit = tieredPrice(tr.precios, pasajeros);
      const preciosPorAcom: Record<Acomodacion, number> = {
        SGL: unit,
        DBL: unit,
        TPL: unit,
      };
      const totalesPorAcom: Record<Acomodacion, number> = {
        SGL: 0,
        DBL: 0,
        TPL: 0,
      };
      for (const a of acomodaciones) {
        totalesPorAcom[a] =
          unit * pasajeros + (tr.precios.chd || 0) * ninos;
      }
      servicios.push({
        id: tr.id,
        tipo: "traslado",
        nombre: tr.nombre,
        preciosPorAcomodacion: preciosPorAcom,
        totalesPorAcomodacion: totalesPorAcom,
        detalle: `${pasajeros} pax${ninos ? ` + ${ninos} niños` : ""}`,
      });
    }
  }

  const totales: Record<Acomodacion, number> = { SGL: 0, DBL: 0, TPL: 0 };
  for (const sv of servicios) {
    for (const a of acomodaciones) {
      totales[a] += sv.totalesPorAcomodacion[a];
    }
  }

  return {
    servicios,
    totalesPorAcomodacion: totales,
    acomodaciones,
    noches,
    pasajeros,
    ninos,
  };
}
