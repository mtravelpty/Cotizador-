import {
  FileSpreadsheet,
  ListChecks,
  LayoutTemplate,
  BookOpen,
  Tag,
  HardDrive,
  Settings2,
  ChevronDown,
  Building2,
  LogOut,
  User,
} from "lucide-react";
import logoRge from "@assets/0000_1781231540085.png";
import { useState } from "react";
import type { ActiveUser } from "@/lib/auth";

export type View = "cotizador" | "seguimiento" | "agencias" | "plantillas" | "descriptivos" | "tarifas" | "respaldos";

const CONFIG_VIEWS: View[] = ["plantillas", "descriptivos", "tarifas", "agencias", "respaldos"];

interface Props {
  view: View;
  onView: (v: View) => void;
  seguimientoFlash?: boolean;
  user?: ActiveUser | null;
  onLogout?: () => void;
}

export default function Sidebar({ view, onView, seguimientoFlash = false, user, onLogout }: Props) {
  const isConfigView = CONFIG_VIEWS.includes(view);
  const [configOpen, setConfigOpen] = useState(isConfigView);

  return (
    <div
      className="w-[240px] shrink-0 h-screen sticky top-0 flex flex-col"
      style={{ padding: "12px 0 12px 12px" }}
    >
      <aside
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(245,235,241,0.82))",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid rgba(255,255,255,0.65)",
          boxShadow: "0 18px 45px rgba(128,45,98,0.12), inset 0 1px 0 rgba(255,255,255,0.65)",
          borderRadius: 24,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "18px 20px 12px",
            borderBottom: "1px solid rgba(128,45,98,0.08)",
          }}
        >
          <img
            src={logoRge}
            alt="RGE Style Travel"
            style={{
              display: "block",
              maxWidth: 180,
              height: "auto",
              width: "auto",
              objectFit: "contain",
              imageRendering: "auto",
            }}
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto" style={{ padding: "10px 10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <NavItem
              active={view === "cotizador"}
              onClick={() => onView("cotizador")}
              icon={<FileSpreadsheet className="w-4 h-4" />}
              label="Cotizador"
            />
            <NavItem
              active={view === "seguimiento"}
              onClick={() => onView("seguimiento")}
              icon={<ListChecks className="w-4 h-4" />}
              label="Seguimiento"
              flash={seguimientoFlash}
            />
          </div>

          <div className="pt-3">
            <div className="mb-2" style={{ borderTop: "1px solid rgba(128,45,98,0.08)" }} />
            <button
              onClick={() => {
                setConfigOpen((o) => !o);
                if (!configOpen && !isConfigView) {
                  onView("plantillas");
                }
              }}
              className="w-full flex items-center justify-between gap-2 rounded-xl outline-none focus:outline-none"
              style={{
                color: "#64748b",
                padding: "5px 12px",
                background: "transparent",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#6b2252";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
              }}
            >
              <span className="flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                Configuración
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${configOpen ? "rotate-0" : "-rotate-90"}`}
              />
            </button>

            {configOpen && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  marginTop: 4,
                  paddingLeft: 8,
                  marginLeft: 12,
                  borderLeft: "1px solid rgba(128,45,98,0.08)",
                }}
              >
                <NavItem
                  active={view === "plantillas"}
                  onClick={() => onView("plantillas")}
                  icon={<LayoutTemplate className="w-4 h-4" />}
                  label="Plantillas"
                  sub
                />
                <NavItem
                  active={view === "descriptivos"}
                  onClick={() => onView("descriptivos")}
                  icon={<BookOpen className="w-4 h-4" />}
                  label="Descriptivos"
                  sub
                />
                <NavItem
                  active={view === "tarifas"}
                  onClick={() => onView("tarifas")}
                  icon={<Tag className="w-4 h-4" />}
                  label="Tarifas"
                  sub
                />
                <NavItem
                  active={view === "agencias"}
                  onClick={() => onView("agencias")}
                  icon={<Building2 className="w-4 h-4" />}
                  label="Agencias"
                  sub
                />
                <NavItem
                  active={view === "respaldos"}
                  onClick={() => onView("respaldos")}
                  icon={<HardDrive className="w-4 h-4" />}
                  label="Respaldos"
                  sub
                />
              </div>
            )}
          </div>
        </nav>

        {/* ── Active user ──────────────────────────────────────────────── */}
        {user && (
          <div
            style={{
              borderTop: "1px solid rgba(128,45,98,0.08)",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: "#f9f0f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <User className="w-4 h-4" style={{ color: "#802d62" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#07152f",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.nombre}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#94a3b8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.correo}
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Cerrar sesión"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#94a3b8",
                  flexShrink: 0,
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2";
                  (e.currentTarget as HTMLButtonElement).style.color = "#b91c1c";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  sub,
  flash,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub?: boolean;
  flash?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 outline-none focus:outline-none focus-visible:outline-none"
      style={{
        fontSize: sub ? 13 : 14,
        fontWeight: active ? 600 : 500,
        padding: sub ? "7px 14px" : "8px 14px",
        borderRadius: 18,
        border: "none",
        transition: "all 0.2s ease",
        background: active ? "#f9f0f5" : "transparent",
        color: active ? "#6b2252" : "#07152f",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = "#faf5f8";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }
      }}
    >
      <span
        style={{
          color: active ? "#6b2252" : "#07152f",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          transition: "color 0.2s ease",
        }}
      >
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {flash && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 20,
            height: 20,
            borderRadius: 9999,
            backgroundColor: "#E6AE33",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.02em",
            paddingLeft: 5,
            paddingRight: 5,
            animation: "seguimiento-flash-pulse 0.6s ease-in-out infinite alternate",
            flexShrink: 0,
          }}
        >
          +1
        </span>
      )}
    </button>
  );
}
