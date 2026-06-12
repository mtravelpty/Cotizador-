import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Upload,
  Phone,
  Mail,
  ImageOff,
  Search,
  Star,
  Users,
  User,
} from "lucide-react";
import {
  saveAgencia,
  deleteAgencia,
  saveAgente,
  deleteAgente,
  type Agencia,
  type AgenteAgencia,
} from "@/lib/agencias";
import { apiAuth } from "@/lib/api-auth";

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function getInitials(name: string): string {
  if (!name?.trim()) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.trim().slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// ─── Logo Avatar ──────────────────────────────────────────────────────────────

function LogoAvatar({ agencia, size = 42 }: { agencia: Agencia; size?: number }) {
  if (agencia.logoUrl) {
    return (
      <div
        className="rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0"
        style={{ width: size, height: size }}
      >
        <img
          src={agencia.logoUrl}
          alt={agencia.nombre}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center text-white font-bold shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.33,
        background: "#802d62",
      }}
    >
      {getInitials(agencia.nombre)}
    </div>
  );
}

// ─── Agency Modal ─────────────────────────────────────────────────────────────

function AgenciaModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Agencia;
  onSave: (a: Agencia) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [telefono, setTelefono] = useState(initial?.telefono ?? "");
  const [correo, setCorreo] = useState(initial?.correo ?? "");
  const [predeterminada, setPredeterminada] = useState(initial?.predeterminada ?? false);
  const [logoError, setLogoError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoUrl(result);
      setLogoError(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!nombre.trim()) return;
    onSave({
      id: initial?.id ?? genId(),
      nombre: nombre.trim(),
      logoUrl: logoUrl || undefined,
      telefono: telefono.trim() || undefined,
      correo: correo.trim() || undefined,
      predeterminada,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="font-bold text-slate-900">
            {initial ? "Editar agencia" : "Nueva agencia"}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Logo */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Logo
            </label>
            <div className="flex items-center gap-4">
              <div
                className="w-[72px] h-[72px] rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
                title="Subir logo"
              >
                {logoUrl && !logoError ? (
                  <img
                    src={logoUrl}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-300">
                    <ImageOff className="w-5 h-5" />
                    <span className="text-[9px] font-medium">Sin logo</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Subir imagen
                </button>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  PNG, JPG, SVG · recomendado 200×200px
                </p>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => { setLogoUrl(""); setLogoError(false); }}
                    className="text-[10px] text-red-500 hover:text-red-700 mt-1 transition-colors"
                  >
                    Quitar logo
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Nombre de agencia <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: RGE Travel Agency"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
            />
          </div>

          {/* Teléfono / Correo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+1 (000) 000-0000"
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Correo
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="agencia@correo.com"
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Predeterminada */}
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                predeterminada
                  ? "border-[#E6AE33] bg-[#E6AE33]"
                  : "border-slate-300 bg-white group-hover:border-[#E6AE33]"
              }`}
              onClick={() => setPredeterminada((v) => !v)}
            >
              {predeterminada && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-sm text-slate-700 font-medium">Agencia predeterminada</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={!nombre.trim()}
            title="Guardar"
            className="w-9 h-9 rounded-xl bg-[#802d62] hover:bg-[#6b2252] text-white flex items-center justify-center shadow-sm transition-colors disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Agent Modal ──────────────────────────────────────────────────────────────

function AgenteModal({
  initial,
  agenciaId,
  onSave,
  onClose,
}: {
  initial?: AgenteAgencia;
  agenciaId: string;
  onSave: (a: AgenteAgencia) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [correo, setCorreo] = useState(initial?.correo ?? "");
  const [telefono, setTelefono] = useState(initial?.telefono ?? "");

  const handleSave = () => {
    if (!nombre.trim()) return;
    onSave({
      id: initial?.id ?? genId(),
      agenciaId,
      nombre: nombre.trim(),
      correo: correo.trim() || undefined,
      telefono: telefono.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="font-bold text-slate-900">
            {initial ? "Editar agente" : "Agregar agente"}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Nombre del agente <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre completo"
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Correo
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="agente@correo.com"
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Teléfono
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+1 (000) 000-0000"
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={!nombre.trim()}
            title="Guardar"
            className="w-9 h-9 rounded-xl bg-[#802d62] hover:bg-[#6b2252] text-white flex items-center justify-center shadow-sm transition-colors disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Agents Sub-section ───────────────────────────────────────────────────────

function AgentesSection({
  agencia,
  agentes,
  onAgenteSave,
  onAgenteDelete,
}: {
  agencia: Agencia;
  agentes: AgenteAgencia[];
  onAgenteSave: (a: AgenteAgencia) => Promise<void>;
  onAgenteDelete: (id: string) => Promise<void>;
}) {
  const [agenteModal, setAgenteModal] = useState<{ open: boolean; editing?: AgenteAgencia }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const mine = agentes.filter((a) => a.agenciaId === agencia.id);

  const handleSave = async (ag: AgenteAgencia) => {
    await onAgenteSave(ag);
    setAgenteModal({ open: false });
  };

  const handleDelete = async (id: string) => {
    await onAgenteDelete(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          <Users className="w-3.5 h-3.5" />
          Agentes
          {mine.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
              {mine.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAgenteModal({ open: true })}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold transition-colors"
        >
          <Plus className="w-3 h-3" />
          Agregar agente
        </button>
      </div>

      {mine.length === 0 ? (
        <div className="text-[11px] text-slate-400 italic py-1">Sin agentes registrados</div>
      ) : (
        <div className="space-y-1">
          {mine.map((ag) => (
            <div key={ag.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 group">
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-slate-800 truncate">{ag.nombre}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {ag.correo && (
                    <span className="text-[10px] text-slate-400 truncate">{ag.correo}</span>
                  )}
                  {ag.telefono && (
                    <span className="text-[10px] text-slate-400">{ag.telefono}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  type="button"
                  onClick={() => setAgenteModal({ open: true, editing: ag })}
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(ag.id)}
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (() => {
        const agenteAEliminar = mine.find((a) => a.id === deleteConfirm);
        return (
          <DeleteAgenteModal
            nombre={agenteAEliminar?.nombre ?? ""}
            onConfirm={() => handleDelete(deleteConfirm)}
            onClose={() => setDeleteConfirm(null)}
          />
        );
      })()}

      {agenteModal.open && (
        <AgenteModal
          initial={agenteModal.editing}
          agenciaId={agencia.id}
          onSave={handleSave}
          onClose={() => setAgenteModal({ open: false })}
        />
      )}
    </div>
  );
}

// ─── Delete Agent Confirmation Modal ──────────────────────────────────────────

function DeleteAgenteModal({
  nombre,
  onConfirm,
  onClose,
}: {
  nombre: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <span className="text-lg leading-none">⚠️</span>
            Eliminar agente
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm text-slate-700">
            ¿Está seguro de que desea eliminar al agente{" "}
            <span className="font-semibold text-slate-900">"{nombre}"</span>?
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#dc2626" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#b91c1c")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#dc2626")}
          >
            Eliminar agente
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Agency Confirmation Modal ─────────────────────────────────────────

function DeleteAgenciaModal({
  nombre,
  onConfirm,
  onClose,
}: {
  nombre: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <span className="text-lg leading-none">⚠️</span>
            Eliminar agencia
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm text-slate-700">
            ¿Está seguro de que desea eliminar la agencia{" "}
            <span className="font-semibold text-slate-900">"{nombre}"</span>?
          </p>
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-red-700 mb-1.5">
              Esta acción eliminará:
            </p>
            <ul className="space-y-1">
              {[
                "La agencia",
                "Todos los agentes asociados",
                "La relación con cotizaciones futuras",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-red-600">
                  <span className="mt-0.5 shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#dc2626" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#b91c1c")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#dc2626")}
          >
            Eliminar agencia
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Agencias() {
  const [modal, setModal] = useState<{ open: boolean; editing?: Agencia }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: agencias = [] } = useQuery<Agencia[]>({
    queryKey: ["agencias"],
    queryFn: () => apiAuth.agencias.list() as Promise<Agencia[]>,
    staleTime: 0,
  });

  const { data: agentes = [] } = useQuery<AgenteAgencia[]>({
    queryKey: ["agentes"],
    queryFn: () => apiAuth.agentes.list() as Promise<AgenteAgencia[]>,
    staleTime: 0,
  });

  const handleSave = async (a: Agencia) => {
    await saveAgencia(a);
    setModal({ open: false });
  };

  const handleDelete = async (id: string) => {
    await deleteAgencia(id);
    setDeleteConfirm(null);
  };

  const handleAgenteSave = async (ag: AgenteAgencia) => {
    await saveAgente(ag);
  };

  const handleAgenteDelete = async (id: string) => {
    await deleteAgente(id);
  };

  const filteredAgencias = agencias.filter((a) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      a.nombre.toLowerCase().includes(q) ||
      (a.correo?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#f9f0f5" }}>
            <Building2 className="w-5 h-5" style={{ color: "#802d62" }} />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">Agencias</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {agencias.length === 0
                ? "Ninguna agencia registrada"
                : `${agencias.length} agencia${agencias.length !== 1 ? "s" : ""} · ${agentes.length} agente${agentes.length !== 1 ? "s" : ""}`}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors hover:opacity-90"
          style={{ background: "#802d62" }}
        >
          <Plus className="w-4 h-4" />
          Nueva agencia
        </button>
      </div>

      {/* Search */}
      {agencias.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar agencia..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 shadow-sm"
          />
        </div>
      )}

      {/* List */}
      {agencias.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
          <Building2 className="w-10 h-10 mx-auto text-slate-200 mb-3" />
          <div className="text-sm font-medium text-slate-600">No hay agencias aún</div>
          <div className="text-xs text-slate-400 mt-1">
            Agrega agencias para mostrar su logo en las tarjetas del tablero.
          </div>
          <button
            type="button"
            onClick={() => setModal({ open: true })}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold mx-auto transition-colors hover:opacity-90"
            style={{ background: "#802d62" }}
          >
            <Plus className="w-4 h-4" />
            Agregar primera agencia
          </button>
        </div>
      ) : filteredAgencias.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-10 text-center">
          <Search className="w-8 h-8 mx-auto text-slate-200 mb-2" />
          <div className="text-sm font-medium text-slate-500">Sin resultados para "{search}"</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAgencias.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4"
            >
              <div className="flex items-start gap-3">
                <LogoAvatar agencia={a} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-bold text-slate-900 truncate">{a.nombre}</div>
                    {a.predeterminada && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0"
                        style={{ backgroundColor: "#FEF3C7", color: "#E6AE33", border: "1px solid #E6AE33" }}
                      >
                        <Star className="w-2.5 h-2.5" />
                        Predeterminada
                      </span>
                    )}
                  </div>
                  {a.telefono && (
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 truncate">
                      <Phone className="w-3 h-3 shrink-0" />
                      {a.telefono}
                    </div>
                  )}
                  {a.correo && (
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 truncate">
                      <Mail className="w-3 h-3 shrink-0" />
                      {a.correo}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModal({ open: true, editing: a })}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(a.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Agents sub-section */}
              <AgentesSection
                agencia={a}
                agentes={agentes}
                onAgenteSave={handleAgenteSave}
                onAgenteDelete={handleAgenteDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (() => {
        const agenciaAEliminar = agencias.find((a) => a.id === deleteConfirm);
        return (
          <DeleteAgenciaModal
            nombre={agenciaAEliminar?.nombre ?? ""}
            onConfirm={() => handleDelete(deleteConfirm)}
            onClose={() => setDeleteConfirm(null)}
          />
        );
      })()}

      {/* Add/Edit Modal */}
      {modal.open && (
        <AgenciaModal
          initial={modal.editing}
          onSave={handleSave}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  );
}
