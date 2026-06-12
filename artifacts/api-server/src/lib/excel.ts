import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveExcelPath(envKey: string, filename: string): string {
  if (process.env[envKey]) return process.env[envKey]!;
  const candidates = [
    path.resolve(__dirname, "..", "..", filename),
    path.resolve(__dirname, "..", filename),
    path.resolve(process.cwd(), filename),
    path.resolve(process.cwd(), "artifacts/api-server", filename),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0]!;
}

export interface Hotel {
  id: string;
  nombre: string;
  categoria: string;
  estrellas: string;
  tipoHabitacion: string;
  ubicacion: string;
  desayuno: string;
  vigencia: string;
  precios: { SGL: number; DBL: number; TPL: number; CHD: number };
}

export interface Tour {
  id: string;
  nombre: string;
  categoria: string;
  seccion: string;
  horario: string;
  precio_por_persona: number;
  precios: { p1: number; p2_5: number; p6_10: number; chd: number };
  descripcion: string;
}

export interface Traslado {
  id: string;
  nombre: string;
  categoria: string;
  tipo: "Regular" | "Privado";
  precio_por_persona: number;
  precios: { p1: number; p2_5: number; p6_10: number; chd: number };
}

export interface Catalog {
  hoteles: Hotel[];
  tours: Tour[];
  traslados: Traslado[];
  loadedAt: string;
}

let cache: Catalog | null = null;
let brasilCache: Catalog | null = null;
let enCache: Catalog | null = null;
let ptCache: Catalog | null = null;

const EXCEL_PATH = resolveExcelPath("TARIFARIO_PATH", "TARIFARIO.xlsx");
const BRASIL_EXCEL_PATH = resolveExcelPath("TARIFARIO_BRASIL_PATH", "TARIFARIO_BRASIL.xlsx");
const EN_EXCEL_PATH = resolveExcelPath("TARIFARIO_EN_PATH", "TARIFARIO_EN.xlsx");
const PT_EXCEL_PATH = resolveExcelPath("TARIFARIO_PT_PATH", "TARIFARIO_PT.xlsx");

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function isCode(v: unknown): boolean {
  return typeof v === "string" && /^RGE-/i.test(v.trim());
}

type Row = Record<string, unknown>;

function rowsOf(wb: XLSX.WorkBook, sheet: string): Row[] {
  const ws = wb.Sheets[sheet];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: null });
}

function parseHoteles(rows: Row[]): Hotel[] {
  const hoteles: Hotel[] = [];
  let ubicacion = "";
  for (const r of rows) {
    const vals = Object.values(r);
    const code = str(vals[0]);
    if (!code) continue;
    if (!isCode(code)) {
      const restEmpty = vals
        .slice(1)
        .every((v) => v == null || String(v).trim() === "");
      if (restEmpty && code.length > 0 && !/^Código/i.test(code)) {
        ubicacion = code;
      }
      continue;
    }
    const nombre = str(vals[1]);
    const estrellas = str(vals[2]);
    const tipoHab = str(vals[3]);
    const sgl = num(vals[4]);
    const dbl = num(vals[5]);
    const tpl = num(vals[6]);
    const chd = num(vals[7]);
    const desayuno = str(vals[8]);
    const vigencia = str(vals[9]);
    if (!nombre) continue;
    hoteles.push({
      id: code,
      nombre,
      categoria: "hotel",
      estrellas,
      tipoHabitacion: tipoHab,
      ubicacion,
      desayuno,
      vigencia,
      precios: { SGL: sgl, DBL: dbl, TPL: tpl, CHD: chd },
    });
  }
  return hoteles;
}

function parseTours(rows: Row[]): Tour[] {
  const tours: Tour[] = [];
  let seccion = "";
  for (const r of rows) {
    const vals = Object.values(r);
    const code = str(vals[0]);
    if (!code) continue;
    if (!isCode(code)) {
      const restEmpty = vals
        .slice(1)
        .every((v) => v == null || String(v).trim() === "");
      if (restEmpty && code.length > 0 && !/^Código/i.test(code)) {
        seccion = code;
      }
      continue;
    }
    const nombre = str(vals[1]);
    const horario = str(vals[2]);
    const p1 = num(vals[3]);
    const p2_5 = num(vals[4]);
    const p6_10 = num(vals[5]);
    const chd = num(vals[6]);
    const cat = str(vals[7]) || "Tour";
    if (!nombre) continue;
    tours.push({
      id: code,
      nombre,
      categoria: cat,
      seccion,
      horario,
      precio_por_persona: p2_5 || p1,
      precios: { p1, p2_5, p6_10, chd },
      descripcion: nombre,
    });
  }
  return tours;
}

function parseTraslados(rows: Row[], tipo: "Regular" | "Privado"): Traslado[] {
  const items: Traslado[] = [];
  for (const r of rows) {
    const vals = Object.values(r);
    const code = str(vals[0]);
    if (!isCode(code)) continue;
    const nombre = str(vals[1]);
    const p1 = num(vals[2]);
    const p2_5 = num(vals[3]);
    const p6_10 = num(vals[4]);
    const chd = num(vals[5]);
    const cat = str(vals[6]) || tipo;
    if (!nombre) continue;
    items.push({
      id: `${tipo === "Privado" ? "PRV-" : ""}${code}`,
      nombre,
      categoria: cat,
      tipo,
      precio_por_persona: p2_5 || p1,
      precios: { p1, p2_5, p6_10, chd },
    });
  }
  return items;
}

function parseCatalogFromWorkbook(wb: XLSX.WorkBook): Catalog {
  const hoteles = parseHoteles(rowsOf(wb, "Hotelería"));
  const tours = parseTours(rowsOf(wb, "Tours"));
  const trasladosReg = parseTraslados(rowsOf(wb, "Traslados Regulares"), "Regular");
  const trasladosPriv = parseTraslados(rowsOf(wb, "Traslados Privados"), "Privado");
  return {
    hoteles,
    tours,
    traslados: [...trasladosReg, ...trasladosPriv],
    loadedAt: new Date().toISOString(),
  };
}

/* ─── General catalog ─── */

export function loadCatalog(): Catalog {
  if (cache) return cache;
  return reloadCatalog();
}

export function reloadCatalog(): Catalog {
  const wb = XLSX.readFile(EXCEL_PATH);
  cache = parseCatalogFromWorkbook(wb);
  return cache;
}

export function getFileInfo(): { filename: string; loadedAt: string | null } {
  if (cache) {
    return { filename: path.basename(EXCEL_PATH), loadedAt: cache.loadedAt };
  }
  try {
    const stat = fs.statSync(EXCEL_PATH);
    return { filename: path.basename(EXCEL_PATH), loadedAt: stat.mtime.toISOString() };
  } catch {
    return { filename: path.basename(EXCEL_PATH), loadedAt: null };
  }
}

const REQUIRED_SHEETS = [
  "Hotelería",
  "Tours",
  "Traslados Regulares",
  "Traslados Privados",
];

export function replaceAndReload(buffer: Buffer): Catalog {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new Error("El archivo no es un Excel válido (.xlsx)");
  }
  for (const sheet of REQUIRED_SHEETS) {
    if (!wb.SheetNames.includes(sheet)) {
      throw new Error(`El archivo no contiene la hoja requerida: "${sheet}"`);
    }
  }
  fs.writeFileSync(EXCEL_PATH, buffer);
  return reloadCatalog();
}

/* ─── English catalog ─── */

function makeEmptyCatalog(): Catalog {
  return { hoteles: [], tours: [], traslados: [], loadedAt: new Date().toISOString() };
}

function loadOptionalCatalog(
  filePath: string,
  cacheRef: { value: Catalog | null },
): Catalog {
  if (cacheRef.value) return cacheRef.value;
  if (!fs.existsSync(filePath)) {
    cacheRef.value = makeEmptyCatalog();
    return cacheRef.value;
  }
  try {
    const wb = XLSX.readFile(filePath);
    cacheRef.value = parseCatalogFromWorkbook(wb);
    return cacheRef.value;
  } catch {
    cacheRef.value = makeEmptyCatalog();
    return cacheRef.value;
  }
}

function replaceAndReloadOptional(filePath: string, buffer: Buffer, cacheRef: { value: Catalog | null }): Catalog {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new Error("El archivo no es un Excel válido (.xlsx)");
  }
  for (const sheet of REQUIRED_SHEETS) {
    if (!wb.SheetNames.includes(sheet)) {
      throw new Error(`El archivo no contiene la hoja requerida: "${sheet}"`);
    }
  }
  fs.writeFileSync(filePath, buffer);
  cacheRef.value = parseCatalogFromWorkbook(wb);
  return cacheRef.value;
}

function getOptionalFileInfo(filePath: string, cacheRef: { value: Catalog | null }): { filename: string; loadedAt: string | null; exists: boolean } {
  const exists = fs.existsSync(filePath);
  if (cacheRef.value) return { filename: path.basename(filePath), loadedAt: cacheRef.value.loadedAt, exists };
  if (!exists) return { filename: path.basename(filePath), loadedAt: null, exists: false };
  try {
    const stat = fs.statSync(filePath);
    return { filename: path.basename(filePath), loadedAt: stat.mtime.toISOString(), exists: true };
  } catch {
    return { filename: path.basename(filePath), loadedAt: null, exists: false };
  }
}

const enCacheRef = { value: enCache };
const ptCacheRef = { value: ptCache };

export function loadEnCatalog(): Catalog { return loadOptionalCatalog(EN_EXCEL_PATH, enCacheRef); }
export function reloadEnCatalog(): Catalog { enCacheRef.value = null; return loadOptionalCatalog(EN_EXCEL_PATH, enCacheRef); }
export function getEnFileInfo() { return getOptionalFileInfo(EN_EXCEL_PATH, enCacheRef); }
export function replaceAndReloadEn(buffer: Buffer): Catalog { return replaceAndReloadOptional(EN_EXCEL_PATH, buffer, enCacheRef); }

export function loadPtCatalog(): Catalog { return loadOptionalCatalog(PT_EXCEL_PATH, ptCacheRef); }
export function reloadPtCatalog(): Catalog { ptCacheRef.value = null; return loadOptionalCatalog(PT_EXCEL_PATH, ptCacheRef); }
export function getPtFileInfo() { return getOptionalFileInfo(PT_EXCEL_PATH, ptCacheRef); }
export function replaceAndReloadPt(buffer: Buffer): Catalog { return replaceAndReloadOptional(PT_EXCEL_PATH, buffer, ptCacheRef); }

/* ─── Brasil catalog ─── */

const EMPTY_BRASIL: Catalog = { hoteles: [], tours: [], traslados: [], loadedAt: new Date().toISOString() };

export function loadBrasilCatalog(): Catalog {
  if (brasilCache) return brasilCache;
  return reloadBrasilCatalog();
}

export function reloadBrasilCatalog(): Catalog {
  if (!fs.existsSync(BRASIL_EXCEL_PATH)) {
    brasilCache = { ...EMPTY_BRASIL, loadedAt: new Date().toISOString() };
    return brasilCache;
  }
  try {
    const wb = XLSX.readFile(BRASIL_EXCEL_PATH);
    brasilCache = parseCatalogFromWorkbook(wb);
    return brasilCache;
  } catch {
    brasilCache = { ...EMPTY_BRASIL, loadedAt: new Date().toISOString() };
    return brasilCache;
  }
}

export function getBrasilFileInfo(): { filename: string; loadedAt: string | null; exists: boolean } {
  const exists = fs.existsSync(BRASIL_EXCEL_PATH);
  if (brasilCache) {
    return { filename: path.basename(BRASIL_EXCEL_PATH), loadedAt: brasilCache.loadedAt, exists };
  }
  if (!exists) {
    return { filename: path.basename(BRASIL_EXCEL_PATH), loadedAt: null, exists: false };
  }
  try {
    const stat = fs.statSync(BRASIL_EXCEL_PATH);
    return { filename: path.basename(BRASIL_EXCEL_PATH), loadedAt: stat.mtime.toISOString(), exists: true };
  } catch {
    return { filename: path.basename(BRASIL_EXCEL_PATH), loadedAt: null, exists: false };
  }
}

export function replaceAndReloadBrasil(buffer: Buffer): Catalog {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new Error("El archivo no es un Excel válido (.xlsx)");
  }

  console.log("\n====================");
  console.log("HOJAS DETECTADAS");
  console.log("====================");
  wb.SheetNames.forEach((name) => {
    const ws = wb.Sheets[name];
    const rawRows = ws ? XLSX.utils.sheet_to_json(ws, { defval: null }) : [];
    console.log(`- "${name}"  →  ${rawRows.length} filas brutas`);
  });

  console.log("\n====================");
  console.log("HOJAS REQUERIDAS");
  console.log("====================");
  REQUIRED_SHEETS.forEach((name) => console.log(`- "${name}"`));
  console.log("");

  for (const sheet of REQUIRED_SHEETS) {
    if (!wb.SheetNames.includes(sheet)) {
      console.log(`\n[FALLO DE VALIDACIÓN — hoja ausente]`);
      console.log(`  Requerida  : "${sheet}"`);
      const closest = wb.SheetNames.find(
        (s) => s.toLowerCase().replace(/\s+/g, "") === sheet.toLowerCase().replace(/\s+/g, "")
      );
      if (closest) {
        console.log(`  Detectada  : "${closest}"`);
        console.log(`  Diferencia : "${closest}" ≠ "${sheet}"`);
      } else {
        console.log(`  Disponibles: ${wb.SheetNames.map((s) => `"${s}"`).join(", ")}`);
      }
      throw new Error(`El archivo no contiene la hoja requerida: "${sheet}"`);
    }
  }

  console.log("\n====================");
  console.log("PROCESANDO HOJAS");
  console.log("====================");

  let hoteles: Hotel[] = [];
  try {
    const rows = rowsOf(wb, "Hotelería");
    console.log(`[Hotelería]  filas brutas: ${rows.length}`);
    hoteles = parseHoteles(rows);
    console.log(`[Hotelería]  registros importados: ${hoteles.length}`);
  } catch (e) {
    console.log(`[FALLO]  Hotelería  →  ${(e as Error).message}`);
    throw new Error(`Error procesando hoja "Hotelería": ${(e as Error).message}`);
  }

  let tours: Tour[] = [];
  try {
    const rows = rowsOf(wb, "Tours");
    console.log(`[Tours]      filas brutas: ${rows.length}`);
    tours = parseTours(rows);
    console.log(`[Tours]      registros importados: ${tours.length}`);
  } catch (e) {
    console.log(`[FALLO]  Tours  →  ${(e as Error).message}`);
    throw new Error(`Error procesando hoja "Tours": ${(e as Error).message}`);
  }

  let trasladosReg: Traslado[] = [];
  try {
    const rows = rowsOf(wb, "Traslados Regulares");
    console.log(`[Traslados Regulares]  filas brutas: ${rows.length}`);
    trasladosReg = parseTraslados(rows, "Regular");
    console.log(`[Traslados Regulares]  registros importados: ${trasladosReg.length}`);
  } catch (e) {
    console.log(`[FALLO]  Traslados Regulares  →  ${(e as Error).message}`);
    throw new Error(`Error procesando hoja "Traslados Regulares": ${(e as Error).message}`);
  }

  let trasladosPriv: Traslado[] = [];
  try {
    const rows = rowsOf(wb, "Traslados Privados");
    console.log(`[Traslados Privados]  filas brutas: ${rows.length}`);
    trasladosPriv = parseTraslados(rows, "Privado");
    console.log(`[Traslados Privados]  registros importados: ${trasladosPriv.length}`);
  } catch (e) {
    console.log(`[FALLO]  Traslados Privados  →  ${(e as Error).message}`);
    throw new Error(`Error procesando hoja "Traslados Privados": ${(e as Error).message}`);
  }

  console.log("\n====================");
  console.log("RESUMEN");
  console.log("====================");
  console.log(`  Hoteles   : ${hoteles.length}`);
  console.log(`  Tours     : ${tours.length}`);
  console.log(`  Traslados : ${trasladosReg.length + trasladosPriv.length}  (${trasladosReg.length} regulares + ${trasladosPriv.length} privados)`);
  console.log("");

  fs.writeFileSync(BRASIL_EXCEL_PATH, buffer);
  brasilCache = {
    hoteles,
    tours,
    traslados: [...trasladosReg, ...trasladosPriv],
    loadedAt: new Date().toISOString(),
  };
  return brasilCache;
}
