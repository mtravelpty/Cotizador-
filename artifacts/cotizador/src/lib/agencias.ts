import { apiAuth } from "@/lib/api-auth";
import { queryClient } from "@/lib/queryClient";

export interface Agencia {
  id: string;
  nombre: string;
  logoUrl?: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  predeterminada?: boolean;
}

export interface AgenteAgencia {
  id: string;
  agenciaId: string;
  nombre: string;
  correo?: string;
  telefono?: string;
}

export interface Counter {
  id: string;
  nombre: string;
}

// ─── Sync load (from React Query cache) ──────────────────────────────────────

export function loadAgencias(): Agencia[] {
  return queryClient.getQueryData<Agencia[]>(["agencias"]) ?? [];
}

export function loadAgentes(): AgenteAgencia[] {
  return queryClient.getQueryData<AgenteAgencia[]>(["agentes"]) ?? [];
}

export function loadCounters(): Counter[] {
  return queryClient.getQueryData<Counter[]>(["counters"]) ?? [];
}

// ─── Async load (always from API, keeps cache fresh) ─────────────────────────

export async function loadAgenciasAsync(): Promise<Agencia[]> {
  try {
    const data = await apiAuth.agencias.list() as Agencia[];
    queryClient.setQueryData(["agencias"], data);
    return data;
  } catch (err) {
    console.error("[agencias] Error cargando:", err);
    return queryClient.getQueryData<Agencia[]>(["agencias"]) ?? [];
  }
}

export async function loadAgentesAsync(): Promise<AgenteAgencia[]> {
  try {
    const data = await apiAuth.agentes.list() as AgenteAgencia[];
    queryClient.setQueryData(["agentes"], data);
    return data;
  } catch (err) {
    console.error("[agentes] Error cargando:", err);
    return queryClient.getQueryData<AgenteAgencia[]>(["agentes"]) ?? [];
  }
}

export async function loadCountersAsync(): Promise<Counter[]> {
  try {
    const data = await apiAuth.counters.list() as Counter[];
    queryClient.setQueryData(["counters"], data);
    return data;
  } catch (err) {
    console.error("[counters] Error cargando:", err);
    return queryClient.getQueryData<Counter[]>(["counters"]) ?? [];
  }
}

// ─── Save individual (API → invalidate cache so all users see fresh data) ────

export async function saveAgencia(a: Agencia): Promise<void> {
  await apiAuth.agencias.save(a);
  await queryClient.invalidateQueries({ queryKey: ["agencias"] });
}

export async function deleteAgencia(id: string): Promise<void> {
  await apiAuth.agencias.remove(id);
  await queryClient.invalidateQueries({ queryKey: ["agencias"] });
  await queryClient.invalidateQueries({ queryKey: ["agentes"] });
}

export async function saveAgente(a: AgenteAgencia): Promise<void> {
  await apiAuth.agentes.save(a);
  await queryClient.invalidateQueries({ queryKey: ["agentes"] });
}

export async function deleteAgente(id: string): Promise<void> {
  await apiAuth.agentes.remove(id);
  await queryClient.invalidateQueries({ queryKey: ["agentes"] });
}

export async function saveCounter(c: Counter): Promise<void> {
  await apiAuth.counters.save(c);
  await queryClient.invalidateQueries({ queryKey: ["counters"] });
}

export async function deleteCounter(id: string): Promise<void> {
  await apiAuth.counters.remove(id);
  await queryClient.invalidateQueries({ queryKey: ["counters"] });
}

// ─── Bulk save (for backup import only) ──────────────────────────────────────

export async function saveAgencias(list: Agencia[]): Promise<void> {
  try {
    await apiAuth.post("/agencias/bulk-sync", { agencias: list, agentes: [] });
    await queryClient.invalidateQueries({ queryKey: ["agencias"] });
  } catch (err) { console.error(err); }
}

export async function saveAgentes(list: AgenteAgencia[]): Promise<void> {
  try {
    await apiAuth.post("/agencias/bulk-sync", { agencias: [], agentes: list });
    await queryClient.invalidateQueries({ queryKey: ["agentes"] });
  } catch (err) { console.error(err); }
}

export async function saveCounters(list: Counter[]): Promise<void> {
  try {
    for (const c of list) await apiAuth.counters.save(c);
    await queryClient.invalidateQueries({ queryKey: ["counters"] });
  } catch (err) { console.error(err); }
}

// ─── Sync desde cotización ────────────────────────────────────────────────────
// Llama al endpoint smart-sync del backend y gestiona el conflicto de correo.

interface SyncFromQuoteResult {
  status: "ok" | "skipped" | "email_conflict";
  agenciaId?: string;
  agenteId?: string;
  agenteNombre?: string;
  currentEmail?: string;
  newEmail?: string;
  action?: string;
  reason?: string;
}

export async function syncAgenciaFromCliente(cliente: {
  correo?: string;   // nombre de la agencia (campo "Agencia" en UI)
  agente?: string;   // nombre del agente
  emailCliente?: string; // correo electrónico del agente
}): Promise<void> {
  const agencyName = cliente.correo?.trim();
  const agentName = cliente.agente?.trim();
  const correo = cliente.emailCliente?.trim();

  if (!agencyName || !agentName) return;

  try {
    const result = await apiAuth.post<SyncFromQuoteResult>("/agencias/sync-from-quote", {
      agencyName,
      agentName,
      correo: correo || undefined,
    });

    if (result.status === "email_conflict" && result.agenteId && result.currentEmail && result.newEmail) {
      const confirmed = window.confirm(
        `El agente "${result.agenteNombre}" ya tiene registrado el correo "${result.currentEmail}".\n\n` +
        `¿Desea actualizarlo a "${result.newEmail}"?`
      );
      if (confirmed) {
        await apiAuth.put(`/agentes/${result.agenteId}`, { correo: result.newEmail });
      }
    }

    // Refrescar caches para que Agencias muestre los datos actualizados
    if (result.status === "ok" || result.status === "email_conflict") {
      await queryClient.invalidateQueries({ queryKey: ["agencias"] });
      await queryClient.invalidateQueries({ queryKey: ["agentes"] });
    }
  } catch (err) {
    console.error("[agencias] Error en sync-from-quote:", err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAgenciaByNombre(nombre: string): Agencia | undefined {
  if (!nombre?.trim()) return undefined;
  const q = nombre.trim().toLowerCase();
  return loadAgencias().find((a) => a.nombre.toLowerCase() === q);
}

export function getAgenciaPredeterminada(): Agencia | undefined {
  return loadAgencias().find((a) => a.predeterminada === true);
}

export function getAgentesByAgenciaId(agenciaId: string): AgenteAgencia[] {
  return loadAgentes().filter((a) => a.agenciaId === agenciaId);
}

export function loadCounterSuggestions(): string[] {
  const dedicated = loadCounters().map((c) => c.nombre);
  if (dedicated.length > 0) return dedicated;
  const guardadas = queryClient.getQueryData<Array<{ counterName?: string }>>(["guardadas"]);
  if (!guardadas) return [];
  return Array.from(new Set(guardadas.map((i) => i.counterName ?? "").filter(Boolean)));
}
