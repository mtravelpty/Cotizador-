import { getAuthToken } from "@/lib/auth";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

async function apiFetch<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const { body, ...rest } = init ?? {};
  const res = await fetch(API_BASE + path, {
    ...rest,
    headers: { ...authHeaders(), ...(rest.headers ?? {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const apiAuth = {
  get: <T>(path: string) => apiFetch<T>(path),

  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body }),

  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PUT", body }),

  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: "DELETE" }),

  // ── Agencias ────────────────────────────────────────────────────────────────
  agencias: {
    list: () => apiAuth.get<AgenciaApi[]>("/agencias"),
    save: (a: AgenciaApi) => apiAuth.post<AgenciaApi>("/agencias", a),
    update: (id: string, a: Partial<AgenciaApi>) => apiAuth.put<AgenciaApi>(`/agencias/${id}`, a),
    remove: (id: string) => apiAuth.delete<{ ok: boolean }>(`/agencias/${id}`),
  },

  agentes: {
    list: () => apiAuth.get<AgenteApi[]>("/agentes"),
    save: (a: AgenteApi) => apiAuth.post<AgenteApi>("/agentes", a),
    update: (id: string, a: Partial<AgenteApi>) => apiAuth.put<AgenteApi>(`/agentes/${id}`, a),
    remove: (id: string) => apiAuth.delete<{ ok: boolean }>(`/agentes/${id}`),
  },

  counters: {
    list: () => apiAuth.get<CounterApi[]>("/counters"),
    save: (c: CounterApi) => apiAuth.post<CounterApi>("/counters", c),
    remove: (id: string) => apiAuth.delete<{ ok: boolean }>(`/counters/${id}`),
  },

  // ── Plantillas ──────────────────────────────────────────────────────────────
  plantillas: {
    list: () => apiAuth.get<PlantillaApi[]>("/plantillas"),
    save: (p: PlantillaApi) => apiAuth.post<PlantillaApi>("/plantillas", p),
    update: (id: string, p: Partial<PlantillaApi>) => apiAuth.put<PlantillaApi>(`/plantillas/${id}`, p),
    remove: (id: string) => apiAuth.delete<{ ok: boolean }>(`/plantillas/${id}`),
    bulkSync: (list: PlantillaApi[]) => apiAuth.post<{ ok: boolean }>("/plantillas/bulk-sync", list),
  },

  // ── Observaciones ────────────────────────────────────────────────────────────
  observaciones: {
    list: () => apiAuth.get<ObservacionApi[]>("/observaciones"),
    save: (o: ObservacionApi) => apiAuth.post<ObservacionApi>("/observaciones", o),
    update: (id: string, o: Partial<ObservacionApi>) => apiAuth.put<ObservacionApi>(`/observaciones/${id}`, o),
    remove: (id: string) => apiAuth.delete<{ ok: boolean }>(`/observaciones/${id}`),
    bulkSync: (list: ObservacionApi[]) => apiAuth.post<{ ok: boolean }>("/observaciones/bulk-sync", list),
  },

  // ── Tarifas ─────────────────────────────────────────────────────────────────
  tarifas: {
    listHoteles: () => apiAuth.get<unknown[]>("/tarifas/hotel"),
    listTours: () => apiAuth.get<unknown[]>("/tarifas/tour"),
    listTraslados: () => apiAuth.get<unknown[]>("/tarifas/traslado"),
    saveHotel: (h: unknown) => apiAuth.post<unknown>("/tarifas/hotel", h),
    saveTour: (t: unknown) => apiAuth.post<unknown>("/tarifas/tour", t),
    saveTraslado: (t: unknown) => apiAuth.post<unknown>("/tarifas/traslado", t),
    removeHotel: (id: string) => apiAuth.delete<{ ok: boolean }>(`/tarifas/hotel/${id}`),
    removeTour: (id: string) => apiAuth.delete<{ ok: boolean }>(`/tarifas/tour/${id}`),
    removeTraslado: (id: string) => apiAuth.delete<{ ok: boolean }>(`/tarifas/traslado/${id}`),
    bulkSyncHoteles: (list: unknown[]) => apiAuth.post<{ ok: boolean }>("/tarifas/hotel/bulk-sync", list),
    bulkSyncTours: (list: unknown[]) => apiAuth.post<{ ok: boolean }>("/tarifas/tour/bulk-sync", list),
    bulkSyncTraslados: (list: unknown[]) => apiAuth.post<{ ok: boolean }>("/tarifas/traslado/bulk-sync", list),
  },

  // ── Descriptivos custom ──────────────────────────────────────────────────────
  descriptivosCustom: {
    list: () => apiAuth.get<unknown[]>("/descriptivos-custom"),
    save: (d: unknown) => apiAuth.post<unknown>("/descriptivos-custom", d),
    remove: (id: string) => apiAuth.delete<{ ok: boolean }>(`/descriptivos-custom/${id}`),
    bulkSync: (list: unknown[]) => apiAuth.post<{ ok: boolean }>("/descriptivos-custom/bulk-sync", list),
  },

  // ── Guardadas ───────────────────────────────────────────────────────────────
  guardadas: {
    list: () => apiAuth.get<unknown[]>("/guardadas"),
    save: (g: unknown) => apiAuth.post<unknown>("/guardadas", g),
    update: (id: string, g: unknown) => apiAuth.put<unknown>(`/guardadas/${id}`, g),
    remove: (id: string) => apiAuth.delete<{ ok: boolean }>(`/guardadas/${id}`),
    bulkSync: (list: unknown[]) => apiAuth.post<{ ok: boolean }>("/guardadas/bulk-sync", list),
  },

  // ── Oportunidades ────────────────────────────────────────────────────────────
  oportunidades: {
    list: () => apiAuth.get<unknown[]>("/oportunidades"),
    save: (o: unknown) => apiAuth.post<unknown>("/oportunidades", o),
    update: (id: string, o: unknown) => apiAuth.put<unknown>(`/oportunidades/${id}`, o),
    remove: (id: string) => apiAuth.delete<{ ok: boolean }>(`/oportunidades/${id}`),
    bulkSync: (list: unknown[]) => apiAuth.post<{ ok: boolean }>("/oportunidades/bulk-sync", list),
  },

  // ── Backup ───────────────────────────────────────────────────────────────────
  backup: {
    export: () => apiAuth.get<unknown>("/backup/export"),
    import: (data: unknown) => apiAuth.post<{ ok: boolean; importedAt: string }>("/backup/import", data),
  },
};

// ─── API types (flattened to match DB row structure) ─────────────────────────

export interface AgenciaApi {
  id: string;
  nombre: string;
  logoUrl?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
  predeterminada?: boolean;
}

export interface AgenteApi {
  id: string;
  agenciaId: string;
  nombre: string;
  correo?: string | null;
  telefono?: string | null;
}

export interface CounterApi {
  id: string;
  nombre: string;
}

export interface PlantillaApi {
  id: string;
  nombre: string;
  descripcion?: string | null;
  bloques: unknown[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ObservacionApi {
  id: string;
  texto: string;
  categoria: string;
  orden: number;
  activo: boolean;
}
