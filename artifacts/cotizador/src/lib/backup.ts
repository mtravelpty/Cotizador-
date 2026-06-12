import { apiAuth } from "@/lib/api-auth";

export type BackupType = "full" | "plantillas";

export interface RgeBackup {
  version: 2 | 3;
  type: BackupType;
  exportedAt: string;
}

export type ImportResult =
  | { ok: true; tipo: BackupType }
  | { ok: false; error: string };

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function exportarRespaldoCompleto(): Promise<void> {
  try {
    const data = await apiAuth.backup.export();
    downloadJson(data, `RGE_Backup_${todayString()}.json`);
  } catch (err) {
    console.error("[backup] Error exportando:", err);
    alert("Error al exportar el respaldo. Revisa la conexión.");
  }
}

export async function exportarRespaldoPlantillas(): Promise<void> {
  try {
    const full = await apiAuth.backup.export() as { plantillas?: unknown[] };
    const backup = {
      version: 3,
      type: "plantillas",
      exportedAt: new Date().toISOString(),
      plantillas: full.plantillas ?? [],
    };
    downloadJson(backup, `RGE_Plantillas_${todayString()}.json`);
  } catch (err) {
    console.error("[backup] Error exportando plantillas:", err);
    alert("Error al exportar plantillas. Revisa la conexión.");
  }
}

export async function importarRespaldo(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as Record<string, unknown>;

    if (!data.version || (data.version !== 2 && data.version !== 3)) {
      return { ok: false, error: "Archivo de respaldo inválido (versión no reconocida)" };
    }

    await apiAuth.backup.import(data);
    return { ok: true, tipo: (data.type as BackupType) ?? "full" };
  } catch (err) {
    console.error("[backup] Error importando:", err);
    return { ok: false, error: "Error al importar el respaldo. Revisa el archivo." };
  }
}
