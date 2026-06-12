export type Idioma = "es" | "en" | "pt";

export const IDIOMA_LABELS: Record<Idioma, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
};

export interface Traducciones {
  // ── Section headers ──────────────────────────────────────────────
  propuestaDeServicios: string;
  alojamiento: string;
  traslados: string;
  toursYExperiencias: string;
  catamaranYNavegacion: string;
  vuelos: string;
  itinerarioSugerido: string;
  descriptivos: string;
  observaciones: string;
  resumenDeCostos: string;
  detalleDeCotizacion: string;
  totalesSegunAcomodacion: string;

  // ── Table column headers ─────────────────────────────────────────
  hotel: string;
  categoria: string;
  tipoHab: string;
  descripcion: string;
  modalidad: string;
  tipo: string;
  tarifaPP: string;
  dia: string;
  fecha: string;
  actividad: string;
  concepto: string;
  acom: string;
  tarifaNoc: string;
  pax: string;
  noc: string;

  // ── Service type labels ──────────────────────────────────────────
  tipoVuelo: string;
  privado: string;
  regular: string;

  // ── Descriptivo sub-labels ───────────────────────────────────────
  incluye: string;
  observacionesSub: string;
  recomendaciones: string;
  notaImportante: string;
  horario: string;
  costoAdicionalEntradas: string;
  noIncluyeEntradas: string;

  // ── Proposal info labels ─────────────────────────────────────────
  fechaEmision: string;
  destino: string;
  fechaViaje: string;
  fechasDeEstadia: string;
  numeroCotizacion: string;
  validaHasta: string;
  tipoServicio: string;
  agencia: string;
  agente: string;
  fechaLlegada: string;
  fechaSalida: string;
  noches: string;
  pasajeros: string;
  ninos: string;
  total: string;
  porNoche: string;

  // ── WhatsApp prose ───────────────────────────────────────────────
  waIntro: string;
  waModoLabel: string;
  waTarifa: string;
  waTarifaNetaPP: string;
  waDisponibilidad: string;
  waAdicional: string;
  waPorPersona: string;

  // ── Passenger labels ─────────────────────────────────────────────
  adulto: string;
  adultos: string;
  adultosCap: string;
  nino: string;
  ninoPlural: string;
  ninosCap: string;

  // ── Email intro ──────────────────────────────────────────────────
  emailIntro: string;
}

const ES: Traducciones = {
  propuestaDeServicios: "PROPUESTA DE SERVICIOS",
  alojamiento: "ALOJAMIENTO",
  traslados: "TRASLADOS",
  toursYExperiencias: "TOURS Y EXPERIENCIAS",
  catamaranYNavegacion: "CATAMARÁN Y NAVEGACIÓN",
  vuelos: "VUELOS",
  itinerarioSugerido: "ITINERARIO SUGERIDO",
  descriptivos: "DESCRIPTIVOS",
  observaciones: "OBSERVACIONES",
  resumenDeCostos: "RESUMEN DE COSTOS",
  detalleDeCotizacion: "DETALLE DE COTIZACIÓN",
  totalesSegunAcomodacion: "TOTALES SEGÚN ACOMODACIÓN",

  hotel: "HOTEL",
  categoria: "CATEGORÍA",
  tipoHab: "TIPO HAB.",
  descripcion: "DESCRIPCIÓN",
  modalidad: "MODALIDAD",
  tipo: "TIPO",
  tarifaPP: "TARIFA",
  dia: "DÍA",
  fecha: "FECHA",
  actividad: "ACTIVIDAD",
  concepto: "CONCEPTO",
  acom: "ACOM.",
  tarifaNoc: "TARIFA",
  pax: "PAX",
  noc: "NOC.",

  tipoVuelo: "Vuelo",
  privado: "Privado",
  regular: "Regular",

  incluye: "Incluye",
  observacionesSub: "Observaciones",
  recomendaciones: "Recomendaciones",
  notaImportante: "Nota importante",
  horario: "Horario",
  costoAdicionalEntradas: "Costo adicional por entradas",
  noIncluyeEntradas: "No incluye entradas",

  fechaEmision: "Fecha de emisión",
  destino: "Destino",
  fechaViaje: "Fechas de viaje",
  fechasDeEstadia: "Fechas de estadía",
  numeroCotizacion: "N° Cotización",
  validaHasta: "Válida hasta",
  tipoServicio: "Tipo de servicio",
  agencia: "Agencia",
  agente: "Agente",
  fechaLlegada: "Fecha de llegada",
  fechaSalida: "Fecha de salida",
  noches: "Noches",
  pasajeros: "Pasajeros",
  ninos: "Niños",
  total: "Total",
  porNoche: "/noche",

  waIntro: "A continuación comparto los detalles de su cotización:",
  waModoLabel: "Modalidad",
  waTarifa: "Tarifa",
  waTarifaNetaPP: "Tarifas netas por persona y por noche.",
  waDisponibilidad: "Disponibilidad sujeta al momento de la reserva.",
  waAdicional: "Costo adicional entradas",
  waPorPersona: "por persona",

  adulto: "adulto",
  adultos: "adultos",
  adultosCap: "Adultos",
  nino: "niño",
  ninoPlural: "niños",
  ninosCap: "Niños",

  emailIntro:
    "Hola,\n\nUn gusto saludarte. Conforme a lo solicitado, te comparto la cotización de los servicios de su interés:",
};

const EN: Traducciones = {
  propuestaDeServicios: "SERVICE PROPOSAL",
  alojamiento: "ACCOMMODATION",
  traslados: "TRANSFERS",
  toursYExperiencias: "TOURS & EXPERIENCES",
  catamaranYNavegacion: "CATAMARAN & SAILING",
  vuelos: "FLIGHTS",
  itinerarioSugerido: "SUGGESTED ITINERARY",
  descriptivos: "DESCRIPTIONS",
  observaciones: "NOTES",
  resumenDeCostos: "COST SUMMARY",
  detalleDeCotizacion: "QUOTE DETAIL",
  totalesSegunAcomodacion: "TOTALS BY ACCOMMODATION",

  hotel: "HOTEL",
  categoria: "CATEGORY",
  tipoHab: "ROOM TYPE",
  descripcion: "DESCRIPTION",
  modalidad: "MODE",
  tipo: "TYPE",
  tarifaPP: "RATE",
  dia: "DAY",
  fecha: "DATE",
  actividad: "ACTIVITY",
  concepto: "CONCEPT",
  acom: "ACCOM.",
  tarifaNoc: "RATE",
  pax: "PAX",
  noc: "NIGHTS",

  tipoVuelo: "Flight",
  privado: "Private",
  regular: "Regular",

  incluye: "Includes",
  observacionesSub: "Notes",
  recomendaciones: "Recommendations",
  notaImportante: "Important note",
  horario: "Schedule",
  costoAdicionalEntradas: "Additional ticket cost",
  noIncluyeEntradas: "Tickets not included",

  fechaEmision: "Issue date",
  destino: "Destination",
  fechaViaje: "Travel dates",
  fechasDeEstadia: "Stay dates",
  numeroCotizacion: "Quote No.",
  validaHasta: "Valid until",
  tipoServicio: "Service type",
  agencia: "Agency",
  agente: "Agent",
  fechaLlegada: "Arrival date",
  fechaSalida: "Departure date",
  noches: "Nights",
  pasajeros: "Passengers",
  ninos: "Children",
  total: "Total",
  porNoche: "/night",

  waIntro: "Please find below the details of your quote:",
  waModoLabel: "Mode",
  waTarifa: "Rate",
  waTarifaNetaPP: "Net rates per person per night.",
  waDisponibilidad: "Availability subject to booking date.",
  waAdicional: "Additional ticket cost",
  waPorPersona: "per person",

  adulto: "adult",
  adultos: "adults",
  adultosCap: "Adults",
  nino: "child",
  ninoPlural: "children",
  ninosCap: "Children",

  emailIntro:
    "Hello,\n\nThank you for your inquiry. Please find below the quote for the services you requested:",
};

const PT: Traducciones = {
  propuestaDeServicios: "PROPOSTA DE SERVIÇOS",
  alojamiento: "HOSPEDAGEM",
  traslados: "TRASLADOS",
  toursYExperiencias: "TOURS E EXPERIÊNCIAS",
  catamaranYNavegacion: "CATAMARÃ E NAVEGAÇÃO",
  vuelos: "VOOS",
  itinerarioSugerido: "ROTEIRO SUGERIDO",
  descriptivos: "DESCRITIVOS",
  observaciones: "OBSERVAÇÕES",
  resumenDeCostos: "RESUMO DE CUSTOS",
  detalleDeCotizacion: "DETALHE DA COTAÇÃO",
  totalesSegunAcomodacion: "TOTAIS POR ACOMODAÇÃO",

  hotel: "HOTEL",
  categoria: "CATEGORIA",
  tipoHab: "TIPO DE QUARTO",
  descripcion: "DESCRIÇÃO",
  modalidad: "MODALIDADE",
  tipo: "TIPO",
  tarifaPP: "TARIFA",
  dia: "DIA",
  fecha: "DATA",
  actividad: "ATIVIDADE",
  concepto: "CONCEITO",
  acom: "ACOM.",
  tarifaNoc: "TARIFA",
  pax: "PAX",
  noc: "NOITES",

  tipoVuelo: "Voo",
  privado: "Privado",
  regular: "Regular",

  incluye: "Inclui",
  observacionesSub: "Observações",
  recomendaciones: "Recomendações",
  notaImportante: "Nota importante",
  horario: "Horário",
  costoAdicionalEntradas: "Custo adicional de ingressos",
  noIncluyeEntradas: "Ingressos não incluídos",

  fechaEmision: "Data de emissão",
  destino: "Destino",
  fechaViaje: "Datas de viagem",
  fechasDeEstadia: "Datas de estadia",
  numeroCotizacion: "N° Cotação",
  validaHasta: "Válido até",
  tipoServicio: "Tipo de serviço",
  agencia: "Agência",
  agente: "Agente",
  fechaLlegada: "Data de chegada",
  fechaSalida: "Data de saída",
  noches: "Noites",
  pasajeros: "Passageiros",
  ninos: "Crianças",
  total: "Total",
  porNoche: "/noite",

  waIntro: "Segue abaixo os detalhes da sua cotação:",
  waModoLabel: "Modalidade",
  waTarifa: "Tarifa",
  waTarifaNetaPP: "Tarifas líquidas por pessoa por noite.",
  waDisponibilidad: "Disponibilidade sujeita ao momento da reserva.",
  waAdicional: "Custo adicional de ingressos",
  waPorPersona: "por pessoa",

  adulto: "adulto",
  adultos: "adultos",
  adultosCap: "Adultos",
  nino: "criança",
  ninoPlural: "crianças",
  ninosCap: "Crianças",

  emailIntro:
    "Olá,\n\nÉ um prazer falar com você. Conforme solicitado, compartilho a cotação dos serviços de seu interesse:",
};

export const DICT: Record<Idioma, Traducciones> = { es: ES, en: EN, pt: PT };

export function tr(idioma: Idioma): Traducciones {
  return DICT[idioma] ?? DICT.es;
}
