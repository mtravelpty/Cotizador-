import { MoreHorizontal, Users } from "lucide-react";

// ── Priority colours ──────────────────────────────────────────────────────────
const PRIORITY: Record<string, { border: string; dot: string; label: string; dayColor: string }> = {
  urgente:      { border: "#ef4444", dot: "#ef4444", label: "URGENTE",              dayColor: "#ef4444" },
  seguimiento:  { border: "#e6ae33", dot: "#e6ae33", label: "REQUIERE SEGUIMIENTO", dayColor: "#d97706" },
  prioritaria:  { border: "#f2c94c", dot: "#f2c94c", label: "PRIORITARIA",          dayColor: "#d97706" },
  nueva:        { border: "#0b63ff", dot: "#0b63ff", label: "NUEVA",                dayColor: "#0b63ff" },
  aldia:        { border: "#03a04e", dot: "#03a04e", label: "AL DÍA",               dayColor: "#03a04e" },
};

// ── Sample data ───────────────────────────────────────────────────────────────
const CARDS = [
  {
    priority: "urgente",
    initials: "PT",
    agencia: "PRICE TRAVEL",
    quoteName: "CARLOS RAMÍREZ",
    destination: "CANCÚN + RIVIERA MAYA",
    adultos: 2,
    acomodacion: "DBL",
    numCotizaciones: 1,
    total: "USD 1,098",
    lastCode: "RGE-UM10ZX",
    daysSince: 6,
    lastUpdate: "15 MAY 2026",
  },
  {
    priority: "seguimiento",
    initials: "VT",
    agencia: "VIAJES TOCUMEN",
    quoteName: "FAMILIA RODRÍGUEZ",
    destination: "BOCAS DEL TORO + COLÓN",
    adultos: 4,
    acomodacion: "TPL",
    numCotizaciones: 3,
    total: "USD 3,540",
    lastCode: "RGE-AB72KL",
    daysSince: 3,
    lastUpdate: "01 JUN 2026",
  },
  {
    priority: "nueva",
    initials: "LT",
    agencia: "LUXURY TRAVEL PA",
    quoteName: "MARTÍNEZ — LUNA DE MIEL",
    destination: "BOQUETE + BOCAS DEL TORO",
    adultos: 2,
    acomodacion: "DBL",
    numCotizaciones: 1,
    total: "USD 2,260",
    lastCode: "RGE-CX19MN",
    daysSince: 1,
    lastUpdate: "02 JUN 2026",
  },
  {
    priority: "prioritaria",
    initials: "GE",
    agencia: "GLOBAL EXPLORERS",
    quoteName: "GRUPO EMPRESARIAL FINCA",
    destination: "CIUDAD DE PANAMÁ + SAN BLAS",
    adultos: 8,
    acomodacion: "SGL",
    numCotizaciones: 2,
    total: "USD 9,800",
    lastCode: "RGE-PR44ZZ",
    daysSince: 4,
    lastUpdate: "29 MAY 2026",
  },
  {
    priority: "aldia",
    initials: "ST",
    agencia: "SOL TOURS",
    quoteName: "CHEN — GRUPO FAMILIAR",
    destination: "CHIRIQUÍ + GAMBOA",
    adultos: 3,
    acomodacion: "TPL",
    numCotizaciones: 4,
    total: "USD 4,120",
    lastCode: "RGE-ST99WW",
    daysSince: 0,
    lastUpdate: "03 JUN 2026",
  },
];

// ── Logo / Initials ───────────────────────────────────────────────────────────
function LogoBox({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 12,
        background: "#fff",
        border: "1.5px solid #e5e8ef",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <span
        style={{
          fontSize: 15,
          fontWeight: 800,
          color,
          letterSpacing: "0.04em",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {initials}
      </span>
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
function SeguimientoCard({ card }: { card: (typeof CARDS)[number] }) {
  const p = PRIORITY[card.priority];
  const BRAND = "#044b9e";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        background: "#ffffff",
        borderRadius: 16,
        borderLeft: `5px solid ${p.border}`,
        boxShadow: "0 2px 8px rgba(4,25,65,0.07), 0 1px 2px rgba(4,25,65,0.04)",
        minHeight: 112,
        overflow: "hidden",
        transition: "box-shadow 0.18s, transform 0.18s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 8px 24px rgba(4,25,65,0.13), 0 2px 6px rgba(4,25,65,0.08)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 2px 8px rgba(4,25,65,0.07), 0 1px 2px rgba(4,25,65,0.04)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* ── SECCIÓN 2: Logo ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          flexShrink: 0,
        }}
      >
        <LogoBox initials={card.initials} color={BRAND} />
      </div>

      {/* ── SECCIÓN 3: Información principal ── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingRight: 20,
          paddingTop: 14,
          paddingBottom: 14,
        }}
      >
        {/* Línea 1: nombre cotización */}
        <div
          style={{
            fontWeight: 700,
            fontSize: 13.5,
            color: "#0d1b2e",
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {card.quoteName}
        </div>

        {/* Línea 2: Agencia • Destino */}
        <div
          style={{
            fontSize: 11.5,
            color: "#475569",
            marginTop: 3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
          }}
        >
          {card.agencia}{" "}
          <span style={{ color: "#94a3b8" }}>•</span>{" "}
          {card.destination}
        </div>

        {/* Línea 3: Metadatos */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 7,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 10.5,
              color: "#64748b",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.03em",
            }}
          >
            <Users size={11} strokeWidth={2.5} />
            {card.adultos} ADULTOS
          </span>
          <span style={{ color: "#cbd5e1", fontSize: 11 }}>•</span>
          <span
            style={{
              fontSize: 10.5,
              color: "#64748b",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.03em",
            }}
          >
            {card.acomodacion}
          </span>
          <span style={{ color: "#cbd5e1", fontSize: 11 }}>•</span>
          <span
            style={{
              fontSize: 10.5,
              color: "#64748b",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.03em",
            }}
          >
            {card.numCotizaciones} COTIZACIÓN{card.numCotizaciones !== 1 ? "ES" : ""}
          </span>
        </div>
      </div>

      {/* ── SECCIÓN 4: Monto ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "14px 24px",
          flexShrink: 0,
          minWidth: 160,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: BRAND,
            letterSpacing: "-0.03em",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {card.total}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#94a3b8",
            marginTop: 3,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
          }}
        >
          Última: <span style={{ color: "#475569", fontWeight: 600 }}>{card.lastCode}</span>
        </div>
        <button
          style={{
            marginTop: 6,
            fontSize: 10.5,
            color: BRAND,
            fontWeight: 700,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.02em",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          VER COTIZACIONES ({card.numCotizaciones})
        </button>
      </div>

      {/* ── SECCIÓN 5: Estado ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "14px 20px",
          flexShrink: 0,
          minWidth: 172,
        }}
      >
        {/* Badge de urgencia */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 10.5,
            fontWeight: 700,
            color: p.dot,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: p.dot,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          {p.label}
        </div>

        {/* Días sin actualización */}
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: card.daysSince === 0 ? "#03a04e" : p.dayColor,
            marginTop: 5,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.02em",
          }}
        >
          {card.daysSince === 0
            ? "Actualizado hoy"
            : `${card.daysSince} DÍAS SIN ACTUALIZACIÓN`}
        </div>

        {/* Fecha última actualización */}
        <div
          style={{
            fontSize: 10,
            color: "#94a3b8",
            marginTop: 4,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
          }}
        >
          ACTUALIZADO:{" "}
          <span style={{ color: "#64748b", fontWeight: 600 }}>{card.lastUpdate}</span>
        </div>
      </div>

      {/* ── SECCIÓN 6: Acciones ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 20px 0 8px",
          flexShrink: 0,
        }}
      >
        <button
          style={{
            height: 36,
            padding: "0 20px",
            background: BRAND,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 6px rgba(4,75,158,0.25)",
          }}
        >
          ABRIR
        </button>
        <button
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <MoreHorizontal size={16} color="#64748b" />
        </button>
      </div>
    </div>
  );
}

// ── Preview page ──────────────────────────────────────────────────────────────
export function Card() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f4fb",
        padding: "32px 40px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header label */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em" }}>
          SEGUIMIENTO — CARDS
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginTop: 2 }}>
          Nuevo diseño · 5 variantes de estado
        </div>
      </div>

      {/* Cards list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CARDS.map((c, i) => (
          <SeguimientoCard key={i} card={c} />
        ))}
      </div>
    </div>
  );
}
