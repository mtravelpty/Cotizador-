import { Router } from "express";
import {
  db,
  plantillasTable,
  descriptivosCustomTable,
  observacionesTable,
  tarifasTable,
  agenciasTable,
  agentesTable,
  cotizacionesTable,
  oportunidadesTable,
  countersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router = Router();

router.use(requireAuth);

// ─── Export ───────────────────────────────────────────────────────────────────

router.get("/backup/export", async (_req, res) => {
  try {
    const [
      plantillas,
      descriptivos,
      observaciones,
      tarifasHoteles,
      tarifasTours,
      tarifasTraslados,
      agencias,
      agentes,
      counters,
      guardadas,
      oportunidades,
    ] = await Promise.all([
      db.select().from(plantillasTable),
      db.select().from(descriptivosCustomTable),
      db.select().from(observacionesTable).orderBy(observacionesTable.orden),
      db.select().from(tarifasTable).where(eq(tarifasTable.tipo, "hotel")),
      db.select().from(tarifasTable).where(eq(tarifasTable.tipo, "tour")),
      db.select().from(tarifasTable).where(eq(tarifasTable.tipo, "traslado")),
      db.select().from(agenciasTable),
      db.select().from(agentesTable),
      db.select().from(countersTable),
      db.select().from(cotizacionesTable),
      db.select().from(oportunidadesTable),
    ]);

    const backup = {
      version: 3,
      type: "full",
      exportedAt: new Date().toISOString(),
      plantillas: plantillas.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion,
        bloques: r.bloques,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      descriptivos: descriptivos.map((r) => r.datos),
      observaciones: observaciones.map((r) => ({
        id: r.id,
        texto: r.texto,
        categoria: r.categoria,
        orden: r.orden,
        activo: r.activo,
      })),
      tarifas: {
        hoteles: tarifasHoteles.map((r) => r.datos),
        tours: tarifasTours.map((r) => r.datos),
        traslados: tarifasTraslados.map((r) => r.datos),
      },
      agencias: agencias.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        logoUrl: r.logoUrl,
        contacto: r.contacto,
        telefono: r.telefono,
        correo: r.correo,
        predeterminada: r.predeterminada,
      })),
      agentes: agentes.map((r) => ({
        id: r.id,
        agenciaId: r.agenciaId,
        nombre: r.nombre,
        correo: r.correo,
        telefono: r.telefono,
      })),
      counters: counters.map((r) => ({ id: r.id, nombre: r.nombre })),
      seguimiento: {
        guardadas: guardadas.map((r) => r.datos),
        oportunidades: oportunidades.map((r) => r.datos),
      },
    };

    res.json(backup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al exportar respaldo" });
  }
});

// ─── Import ───────────────────────────────────────────────────────────────────

router.post("/backup/import", async (req: AuthRequest, res) => {
  try {
    const data = req.body as {
      version?: number;
      type?: string;
      plantillas?: Array<{ id: string; nombre: string; descripcion?: string; bloques: unknown[] }>;
      descriptivos?: Array<{ id: string; codigo: string; titulo: string; activo?: boolean; [key: string]: unknown }>;
      observaciones?: Array<{ id: string; texto: string; categoria: string; orden: number; activo: boolean }>;
      tarifas?: {
        hoteles?: Array<{ id: string; [key: string]: unknown }>;
        tours?: Array<{ id: string; [key: string]: unknown }>;
        traslados?: Array<{ id: string; [key: string]: unknown }>;
      };
      agencias?: Array<{ id: string; nombre: string; logoUrl?: string; contacto?: string; telefono?: string; correo?: string; predeterminada?: boolean }>;
      agentes?: Array<{ id: string; agenciaId: string; nombre: string; correo?: string; telefono?: string }>;
      counters?: Array<{ id: string; nombre: string }>;
      seguimiento?: {
        guardadas?: Array<{ id: string; numeroCotizacion: string; estadoCRM?: string; prioridad?: string; anulada?: boolean; opportunityId?: string; [key: string]: unknown }>;
        oportunidades?: Array<{ id: string; agencyName?: string; agentName?: string; counterName?: string; quoteName?: string; destination?: string; status?: string; [key: string]: unknown }>;
      };
    };

    if (!data.version || (data.version !== 2 && data.version !== 3)) {
      return res.status(400).json({ error: "Versión de respaldo inválida" });
    }

    if (data.plantillas?.length) {
      for (const p of data.plantillas) {
        await db
          .insert(plantillasTable)
          .values({ id: p.id, nombre: p.nombre, descripcion: p.descripcion ?? null, bloques: p.bloques ?? [] })
          .onConflictDoUpdate({
            target: plantillasTable.id,
            set: { nombre: p.nombre, descripcion: p.descripcion ?? null, bloques: p.bloques ?? [], updatedAt: new Date() },
          });
      }
    }

    if (data.descriptivos?.length) {
      for (const d of data.descriptivos) {
        await db
          .insert(descriptivosCustomTable)
          .values({ id: d.id, codigo: d.codigo ?? "", titulo: d.titulo ?? "", datos: d, activo: d.activo ?? true })
          .onConflictDoUpdate({
            target: descriptivosCustomTable.id,
            set: { codigo: d.codigo ?? "", titulo: d.titulo ?? "", datos: d, updatedAt: new Date() },
          });
      }
    }

    if (data.observaciones?.length) {
      for (const o of data.observaciones) {
        await db
          .insert(observacionesTable)
          .values(o)
          .onConflictDoUpdate({ target: observacionesTable.id, set: o });
      }
    }

    if (data.tarifas) {
      const { hoteles = [], tours = [], traslados = [] } = data.tarifas;
      await db.delete(tarifasTable).where(eq(tarifasTable.tipo, "hotel"));
      await db.delete(tarifasTable).where(eq(tarifasTable.tipo, "tour"));
      await db.delete(tarifasTable).where(eq(tarifasTable.tipo, "traslado"));
      for (const h of hoteles) await db.insert(tarifasTable).values({ id: h.id as string, tipo: "hotel", datos: h, activo: (h.activo as boolean) ?? true });
      for (const t of tours) await db.insert(tarifasTable).values({ id: t.id as string, tipo: "tour", datos: t, activo: (t.activo as boolean) ?? true });
      for (const tr of traslados) await db.insert(tarifasTable).values({ id: tr.id as string, tipo: "traslado", datos: tr, activo: (tr.activo as boolean) ?? true });
    }

    if (data.agencias?.length) {
      for (const a of data.agencias) {
        await db
          .insert(agenciasTable)
          .values({ id: a.id, nombre: a.nombre, logoUrl: a.logoUrl ?? null, contacto: a.contacto ?? null, telefono: a.telefono ?? null, correo: a.correo ?? null, predeterminada: a.predeterminada ?? false })
          .onConflictDoUpdate({
            target: agenciasTable.id,
            set: { nombre: a.nombre, logoUrl: a.logoUrl ?? null, predeterminada: a.predeterminada ?? false, updatedAt: new Date() },
          });
      }
    }

    if (data.agentes?.length) {
      for (const a of data.agentes) {
        await db
          .insert(agentesTable)
          .values({ id: a.id, agenciaId: a.agenciaId, nombre: a.nombre, correo: a.correo ?? null, telefono: a.telefono ?? null })
          .onConflictDoUpdate({ target: agentesTable.id, set: { nombre: a.nombre, correo: a.correo ?? null, telefono: a.telefono ?? null } });
      }
    }

    if (data.counters?.length) {
      for (const c of data.counters) {
        await db
          .insert(countersTable)
          .values({ id: c.id, nombre: c.nombre })
          .onConflictDoUpdate({ target: countersTable.id, set: { nombre: c.nombre } });
      }
    }

    if (data.seguimiento) {
      if (data.seguimiento.guardadas?.length) {
        for (const item of data.seguimiento.guardadas) {
          await db
            .insert(cotizacionesTable)
            .values({
              id: item.id,
              numero: item.numeroCotizacion,
              estadoCrm: item.estadoCRM ?? "nueva",
              prioridad: item.prioridad ?? "media",
              anulada: item.anulada ?? false,
              opportunityId: item.opportunityId ?? null,
              createdById: (item.createdByUserId as number | undefined) ?? null,
              createdByName: (item.createdByName as string | undefined) ?? null,
              datos: item,
            })
            .onConflictDoUpdate({
              target: cotizacionesTable.id,
              set: { estadoCrm: item.estadoCRM ?? "nueva", datos: item, updatedAt: new Date() },
            });
        }
      }
      if (data.seguimiento.oportunidades?.length) {
        for (const item of data.seguimiento.oportunidades) {
          await db
            .insert(oportunidadesTable)
            .values({
              id: item.id,
              agencyName: item.agencyName ?? "",
              agentName: item.agentName ?? "",
              counterName: item.counterName ?? "",
              quoteName: item.quoteName ?? "",
              destination: item.destination ?? "",
              status: item.status ?? "nueva",
              datos: item,
            })
            .onConflictDoUpdate({
              target: oportunidadesTable.id,
              set: { status: item.status ?? "nueva", datos: item, updatedAt: new Date() },
            });
        }
      }
    }

    res.json({ ok: true, importedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al importar respaldo" });
  }
});

export default router;
