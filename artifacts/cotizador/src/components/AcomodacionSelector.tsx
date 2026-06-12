import type { Acomodacion } from "@/lib/types";
import { Section } from "./ClientForm";
import { BedDouble } from "lucide-react";

interface Props {
  selected: Acomodacion[];
  onChange: (a: Acomodacion[]) => void;
}

const PILLS: { value: Acomodacion; label: string; full: string }[] = [
  { value: "SGL", label: "SGL", full: "Sencilla" },
  { value: "DBL", label: "DBL", full: "Doble" },
  { value: "TPL", label: "TPL", full: "Triple" },
  { value: "QDL", label: "QDL", full: "Cuádruple" },
];

export default function AcomodacionSelector({ selected, onChange }: Props) {
  const toggle = (a: Acomodacion) => {
    if (selected.includes(a)) {
      if (selected.length === 1) return;
      onChange(selected.filter((x) => x !== a));
    } else {
      onChange([...selected, a]);
    }
  };

  return (
    <Section
      icon={<BedDouble className="w-4 h-4" />}
      title="Acomodaciones"
      subtitle="Cotiza una o varias en paralelo"
    >
      <div
        style={{
          display: "inline-flex",
          flexWrap: "wrap",
          gap: 4,
          backgroundColor: "#b78ca4",
          borderRadius: 14,
          padding: "4px",
        }}
      >
        {PILLS.map((p) => {
          const active = selected.includes(p.value);
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => toggle(p.value)}
              style={{
                padding: "6px 18px",
                borderRadius: 10,
                border: "none",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.18s ease",
                backgroundColor: active ? "#802d62" : "transparent",
                color: "#ffffff",
                boxShadow: active ? "0 2px 8px rgba(128,45,98,0.35)" : "none",
                letterSpacing: active ? "0.01em" : 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap" as const,
              }}
            >
              {active && (
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.25)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
              )}
              {p.label}
              <span style={{ fontSize: 11, fontWeight: 400, opacity: active ? 0.85 : 0.7 }}>
                · {p.full}
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
