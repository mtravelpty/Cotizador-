import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";

export type ToastTone = "success" | "info" | "warning" | "error";

export interface ToastItem {
  id: string;
  msg: string;
  tone: ToastTone;
  leaving?: boolean;
}

const TONE_CFG: Record<ToastTone, {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  borderColor: string;
  bg: string;
}> = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    iconColor: "#03a04e",
    iconBg: "#dcfce7",
    borderColor: "#03a04e",
    bg: "#ecfdf5",
  },
  info: {
    icon: <Info className="w-4 h-4 shrink-0" />,
    iconColor: "#802d62",
    iconBg: "#f9f0f5",
    borderColor: "#802d62",
    bg: "#f9f0f5",
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
    iconColor: "#b45309",
    iconBg: "#fef3c7",
    borderColor: "#e6ae33",
    bg: "#fffbeb",
  },
  error: {
    icon: <XCircle className="w-4 h-4 shrink-0" />,
    iconColor: "#ef4444",
    iconBg: "#fee2e2",
    borderColor: "#ef4444",
    bg: "#fef2f2",
  },
};

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function ToastStack({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notificaciones"
      style={{
        position: "fixed",
        top: 72,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
        minWidth: 300,
        maxWidth: 420,
      }}
    >
      {toasts.map((t) => {
        const cfg = TONE_CFG[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={t.leaving ? "toast-leave" : "toast-enter"}
            style={{
              pointerEvents: "auto",
              background: cfg.bg,
              borderRadius: 14,
              boxShadow: "0 12px 30px rgba(128,45,98,0.18)",
              borderLeft: `5px solid ${cfg.borderColor}`,
              outline: "1px solid rgba(128,45,98,0.07)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px 12px 16px",
              minHeight: 56,
            }}
          >
            {/* Icon in soft circle */}
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: cfg.iconBg,
                color: cfg.iconColor,
                flexShrink: 0,
              }}
            >
              {cfg.icon}
            </span>

            {/* Message */}
            <span
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 700,
                color: "#041941",
                lineHeight: 1.45,
              }}
            >
              {t.msg}
            </span>

            {/* Dismiss button */}
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Cerrar notificación"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: 8,
                border: "none",
                background: "rgba(128,45,98,0.06)",
                color: "#64748b",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(128,45,98,0.12)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(128,45,98,0.06)"; }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
