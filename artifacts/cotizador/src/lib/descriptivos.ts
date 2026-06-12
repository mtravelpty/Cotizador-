import type { Descriptivo } from "@/lib/types";
import { apiAuth } from "@/lib/api-auth";
import { queryClient } from "@/lib/queryClient";

export interface DescriptivoLocal {
  id: string;
  codigo: string;
  titulo: string;
  titulo_en?: string;
  titulo_pt?: string;
  horario?: string;
  duracion?: string;
  categoria?: string;
  parrafos: string[];
  parrafos_en?: string[];
  parrafos_pt?: string[];
  incluyeItems: string[];
  incluyeItems_en?: string[];
  incluyeItems_pt?: string[];
  observacionesItems: string[];
  observacionesItems_en?: string[];
  observacionesItems_pt?: string[];
  recomendacionesItems: string[];
  recomendacionesItems_en?: string[];
  recomendacionesItems_pt?: string[];
  notaImportante?: string;
  notaImportante_en?: string;
  notaImportante_pt?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Sync load (from cache) ───────────────────────────────────────────────────

export function loadDescriptivosLS(): DescriptivoLocal[] {
  return queryClient.getQueryData<DescriptivoLocal[]>(["descriptivos-custom"]) ?? [];
}

// ─── Async load (from API) ────────────────────────────────────────────────────

export async function loadDescriptivosLSAsync(): Promise<DescriptivoLocal[]> {
  const cached = queryClient.getQueryData<DescriptivoLocal[]>(["descriptivos-custom"]);
  if (cached) return cached;
  try {
    const data = await apiAuth.descriptivosCustom.list() as DescriptivoLocal[];
    queryClient.setQueryData(["descriptivos-custom"], data);
    return data;
  } catch (err) {
    console.error("[descriptivos-custom] Error cargando:", err);
    return [];
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────

export async function saveDescriptivosLS(items: DescriptivoLocal[]): Promise<void> {
  queryClient.setQueryData(["descriptivos-custom"], items);
  try {
    await apiAuth.descriptivosCustom.bulkSync(items);
  } catch (err) {
    console.error("[descriptivos-custom] Error guardando:", err);
  }
}

export async function saveDescriptivoLocal(d: DescriptivoLocal): Promise<void> {
  const list = loadDescriptivosLS();
  const next = list.some((x) => x.id === d.id)
    ? list.map((x) => (x.id === d.id ? d : x))
    : [...list, d];
  queryClient.setQueryData(["descriptivos-custom"], next);
  try { await apiAuth.descriptivosCustom.save(d); } catch (err) { console.error(err); }
}

export async function deleteDescriptivoLocal(id: string): Promise<void> {
  queryClient.setQueryData(["descriptivos-custom"], loadDescriptivosLS().filter((x) => x.id !== id));
  try { await apiAuth.descriptivosCustom.remove(id); } catch (err) { console.error(err); }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let _cnt = 0;
function uid(): string {
  return `${Date.now()}_${++_cnt}`;
}

export function newDescriptivoLocal(partial?: Partial<DescriptivoLocal>): DescriptivoLocal {
  const now = new Date().toISOString();
  return {
    id: `desc_${uid()}`,
    codigo: "",
    titulo: "",
    titulo_en: "",
    titulo_pt: "",
    horario: "",
    duracion: "",
    categoria: "",
    parrafos: [],
    parrafos_en: [],
    parrafos_pt: [],
    incluyeItems: [],
    incluyeItems_en: [],
    incluyeItems_pt: [],
    observacionesItems: [],
    observacionesItems_en: [],
    observacionesItems_pt: [],
    recomendacionesItems: [],
    recomendacionesItems_en: [],
    recomendacionesItems_pt: [],
    notaImportante: "",
    notaImportante_en: "",
    notaImportante_pt: "",
    activo: true,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function duplicarDescriptivo(d: DescriptivoLocal): DescriptivoLocal {
  const now = new Date().toISOString();
  return { ...d, id: `desc_${uid()}`, codigo: `${d.codigo}-COPIA`, titulo: `${d.titulo} (copia)`, createdAt: now, updatedAt: now };
}

export function toDescriptivo(d: DescriptivoLocal): Descriptivo {
  const infoBits = [d.horario, d.duracion].filter(Boolean);
  return {
    codigo: d.codigo.trim().toUpperCase(),
    titulo: d.titulo,
    titulo_en: d.titulo_en?.trim() || undefined,
    titulo_pt: d.titulo_pt?.trim() || undefined,
    info: infoBits.join(" · ") || undefined,
    parrafos: d.parrafos.filter(Boolean),
    parrafos_en: d.parrafos_en?.filter(Boolean).length ? d.parrafos_en.filter(Boolean) : undefined,
    parrafos_pt: d.parrafos_pt?.filter(Boolean).length ? d.parrafos_pt.filter(Boolean) : undefined,
    incluye: d.incluyeItems.filter(Boolean).join("\n") || undefined,
    incluye_en: d.incluyeItems_en?.filter(Boolean).join("\n") || undefined,
    incluye_pt: d.incluyeItems_pt?.filter(Boolean).join("\n") || undefined,
    observaciones: d.observacionesItems.filter(Boolean).join("\n") || undefined,
    observaciones_en: d.observacionesItems_en?.filter(Boolean).join("\n") || undefined,
    observaciones_pt: d.observacionesItems_pt?.filter(Boolean).join("\n") || undefined,
    recomendaciones: d.recomendacionesItems.filter(Boolean).join("\n") || undefined,
    recomendaciones_en: d.recomendacionesItems_en?.filter(Boolean).join("\n") || undefined,
    recomendaciones_pt: d.recomendacionesItems_pt?.filter(Boolean).join("\n") || undefined,
    notaImportante: d.notaImportante?.trim() || undefined,
    notaImportante_en: d.notaImportante_en?.trim() || undefined,
    notaImportante_pt: d.notaImportante_pt?.trim() || undefined,
    horarioExtra: d.horario?.trim() || undefined,
  };
}

export function fromDescriptivo(d: Descriptivo): DescriptivoLocal {
  const now = new Date().toISOString();
  return {
    id: `desc_${uid()}`,
    codigo: d.codigo ?? "",
    titulo: d.titulo ?? "",
    titulo_en: d.titulo_en ?? "",
    titulo_pt: d.titulo_pt ?? "",
    horario: (d as unknown as { horarioExtra?: string }).horarioExtra ?? d.info ?? "",
    duracion: "",
    categoria: "",
    parrafos: Array.isArray(d.parrafos) ? d.parrafos : [],
    parrafos_en: Array.isArray(d.parrafos_en) ? d.parrafos_en : [],
    parrafos_pt: Array.isArray(d.parrafos_pt) ? d.parrafos_pt : [],
    incluyeItems: d.incluye ? d.incluye.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [],
    incluyeItems_en: d.incluye_en ? d.incluye_en.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [],
    incluyeItems_pt: d.incluye_pt ? d.incluye_pt.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [],
    observacionesItems: d.observaciones ? d.observaciones.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [],
    observacionesItems_en: d.observaciones_en ? d.observaciones_en.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [],
    observacionesItems_pt: d.observaciones_pt ? d.observaciones_pt.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [],
    recomendacionesItems: d.recomendaciones ? d.recomendaciones.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [],
    recomendacionesItems_en: d.recomendaciones_en ? d.recomendaciones_en.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [],
    recomendacionesItems_pt: d.recomendaciones_pt ? d.recomendaciones_pt.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [],
    notaImportante: d.notaImportante ?? "",
    notaImportante_en: d.notaImportante_en ?? "",
    notaImportante_pt: d.notaImportante_pt ?? "",
    activo: true,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Merge with API descriptivos ──────────────────────────────────────────────

export function mergeDescriptivos(
  local: DescriptivoLocal[],
  apiItems: Descriptivo[],
): Descriptivo[] {
  const active = local.filter((d) => d.activo);
  const converted = active.map(toDescriptivo);
  const lsCodes = new Set(converted.map((d) => d.codigo.trim().toUpperCase()));
  const apiOnly = apiItems.filter((d) => !lsCodes.has((d.codigo ?? "").trim().toUpperCase()));
  return [...converted, ...apiOnly];
}

// ─── HTML preview builder ─────────────────────────────────────────────────────

const COLOR_AZUL = "#1E3A8A";
const COLOR_NARANJA = "#f97316";
const COLOR_VERDE = "#16a34a";
const COLOR_TEXTO = "#1f2937";
const COLOR_BORDE = "#e5e7eb";
const COLOR_LABEL = "#6b7280";

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escNL(s: string): string {
  return esc(s).replace(/\n/g, "<br />");
}

export function buildDescriptivoPreviewHtml(d: DescriptivoLocal): string {
  const infoBits = [d.horario, d.duracion].filter(Boolean);
  const infoLine = infoBits.length ? `<div style="font-size:11px;color:${COLOR_LABEL};margin:4px 0 10px;">${esc(infoBits.join(" · "))}</div>` : "";
  const parrafos = d.parrafos.filter(Boolean).map((p) => `<p style="margin:0 0 8px;color:${COLOR_TEXTO};font-size:12px;line-height:1.5;">${esc(p)}</p>`).join("");
  const incluyeText = d.incluyeItems.filter(Boolean).join("\n");
  const incluyeList = incluyeText ? `<div style="margin-top:10px;padding:10px 12px;background:#f0fdf4;border-left:3px solid ${COLOR_VERDE};border-radius:6px;"><div style="font-size:10px;font-weight:bold;color:${COLOR_VERDE};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">Incluye</div><div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escNL(incluyeText)}</div></div>` : "";
  const obsText = d.observacionesItems.filter(Boolean).join("\n");
  const observaciones = obsText ? `<div style="margin-top:8px;padding:10px 12px;background:#fff7ed;border-left:3px solid ${COLOR_NARANJA};border-radius:6px;"><div style="font-size:10px;font-weight:bold;color:${COLOR_NARANJA};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">Observaciones</div><div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escNL(obsText)}</div></div>` : "";
  const recText = d.recomendacionesItems.filter(Boolean).join("\n");
  const recomendaciones = recText ? `<div style="margin-top:8px;padding:10px 12px;background:#f9f0f5;border-left:3px solid ${COLOR_AZUL};border-radius:6px;"><div style="font-size:10px;font-weight:bold;color:${COLOR_AZUL};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">Recomendaciones</div><div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escNL(recText)}</div></div>` : "";
  const nota = d.notaImportante?.trim() ? `<div style="margin-top:8px;padding:10px 12px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;"><div style="font-size:10px;font-weight:bold;color:#dc2626;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">Nota importante</div><div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escNL(d.notaImportante!)}</div></div>` : "";
  const item = `<div style="padding:18px 0;border-bottom:1px solid ${COLOR_BORDE};"><div style="font-weight:bold;color:${COLOR_AZUL};font-size:14px;line-height:1.3;">${esc(d.titulo || "(sin título)")}</div>${infoLine}${parrafos}${incluyeList}${observaciones}${recomendaciones}${nota}</div>`;
  return `<div style="font-family:'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLOR_TEXTO};font-size:13px;line-height:1.45;padding:16px;"><div style="display:inline-block;background:#fbbf23;color:#fff;padding:6px 14px;border-radius:20px;font-weight:600;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;">DESCRIPTIVOS</div><div style="margin-top:10px;">${item}</div></div>`;
}
