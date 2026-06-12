import * as XLSX from "xlsx";
import type { CotizacionGuardada } from "@/components/Guardadas";
import { calcularLocal } from "./calc";

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  enviado: "Enviado",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
};

export function exportarCotizacionesExcel(items: CotizacionGuardada[]) {
  const rows = items.map((g) => {
    const result = calcularLocal(g.servicios, g.acomodaciones, g.cliente);
    const estado = g.estado ?? "pendiente";
    const acoms = g.acomodaciones;

    const totalSGL = acoms.includes("SGL") ? result.totalesPorAcomodacion.SGL : null;
    const totalDBL = acoms.includes("DBL") ? result.totalesPorAcomodacion.DBL : null;
    const totalTPL = acoms.includes("TPL") ? result.totalesPorAcomodacion.TPL : null;
    const totalCHD = acoms.includes("CHD") ? result.totalesPorAcomodacion.CHD : null;

    const serviciosTipos = [
      ...new Set(g.servicios.map((s) => {
        if (s.tipo === "hotel") return "Hotel";
        if (s.tipo === "tour") return "Tour";
        if (s.tipo === "traslado") return "Traslado";
        if (s.tipo === "vuelo") return "Vuelo";
        return s.tipo;
      })),
    ].join(", ");

    const nombresServicios = g.servicios.map((s) => s.nombre).join(" | ");

    return {
      "N° Cotización": g.numeroCotizacion,
      "Estado": ESTADO_LABELS[estado] ?? estado,
      "Fecha Creación": fmtDate(g.fechaCreacion),
      "Cliente": g.cliente.nombre,
      "Correo": g.cliente.correo ?? "",
      "WhatsApp": g.cliente.whatsapp ?? "",
      "Agente": g.cliente.agente ?? "",
      "Llegada": fmtDate(g.cliente.fechaInicio),
      "Salida": fmtDate(g.cliente.fechaFin),
      "Noches": g.cliente.noches ?? 0,
      "Pasajeros": g.cliente.pasajeros,
      "Niños": g.cliente.ninos ?? 0,
      "Acomodaciones": g.acomodaciones.join(", "),
      "Modo": g.modoCotizacion === "calculo" ? "Cálculo" : "Tarifas",
      "Total SGL": totalSGL !== null ? fmtMoney(totalSGL) : "",
      "Total DBL": totalDBL !== null ? fmtMoney(totalDBL) : "",
      "Total TPL": totalTPL !== null ? fmtMoney(totalTPL) : "",
      "Total CHD": totalCHD !== null ? fmtMoney(totalCHD) : "",
      "Tipos de servicio": serviciosTipos,
      "N° Servicios": g.servicios.length,
      "Detalle de servicios": nombresServicios,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  const colWidths = [
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 28 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 10 },
    { wch: 8 },
    { wch: 18 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 22 },
    { wch: 12 },
    { wch: 60 },
  ];
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cotizaciones");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `RGE_Cotizaciones_${today}.xlsx`);
}
