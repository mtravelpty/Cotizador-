import { Router } from "express";
import { db, cotizacionesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router = Router();

router.use(requireAuth);

router.get("/guardadas", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(cotizacionesTable)
      .orderBy(desc(cotizacionesTable.updatedAt));
    res.json(rows.map((r) => r.datos));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cargar cotizaciones" });
  }
});

router.post("/guardadas", async (req: AuthRequest, res) => {
  try {
    const item = req.body as {
      id: string;
      numeroCotizacion: string;
      estadoCRM?: string;
      prioridad?: string;
      anulada?: boolean;
      opportunityId?: string;
      createdByName?: string;
      createdByUserId?: number;
      updatedByName?: string;
      updatedByUserId?: number;
      [key: string]: unknown;
    };

    const byName = item.createdByName ?? req.userName;
    const byId = item.createdByUserId ?? req.userId;

    const enriched = {
      ...item,
      createdByName: byName,
      createdByUserId: byId,
      createdByEmail: item.createdByEmail ?? req.userEmail,
    };

    const [row] = await db
      .insert(cotizacionesTable)
      .values({
        id: item.id,
        numero: item.numeroCotizacion,
        estadoCrm: item.estadoCRM ?? "nueva",
        prioridad: item.prioridad ?? "media",
        anulada: item.anulada ?? false,
        opportunityId: item.opportunityId ?? null,
        createdById: byId ?? null,
        createdByName: byName ?? null,
        updatedById: item.updatedByUserId ?? null,
        updatedByName: item.updatedByName ?? null,
        datos: enriched,
      })
      .onConflictDoUpdate({
        target: cotizacionesTable.id,
        set: {
          numero: item.numeroCotizacion,
          estadoCrm: item.estadoCRM ?? "nueva",
          prioridad: item.prioridad ?? "media",
          anulada: item.anulada ?? false,
          opportunityId: item.opportunityId ?? null,
          updatedById: req.userId ?? null,
          updatedByName: req.userName ?? null,
          datos: enriched,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json(row.datos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar cotización" });
  }
});

router.put("/guardadas/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const item = req.body as { estadoCRM?: string; prioridad?: string; anulada?: boolean; opportunityId?: string; [key: string]: unknown };
    const [row] = await db
      .update(cotizacionesTable)
      .set({
        estadoCrm: item.estadoCRM ?? undefined,
        prioridad: item.prioridad ?? undefined,
        anulada: item.anulada ?? undefined,
        opportunityId: item.opportunityId ?? undefined,
        updatedById: req.userId ?? null,
        updatedByName: req.userName ?? null,
        datos: item,
        updatedAt: new Date(),
      })
      .where(eq(cotizacionesTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Cotización no encontrada" });
    res.json(row.datos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar cotización" });
  }
});

router.delete("/guardadas/:id", async (req, res) => {
  try {
    await db.delete(cotizacionesTable).where(eq(cotizacionesTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar cotización" });
  }
});

router.post("/guardadas/bulk-sync", async (req: AuthRequest, res) => {
  try {
    const list = req.body as Array<{
      id: string;
      numeroCotizacion: string;
      estadoCRM?: string;
      prioridad?: string;
      anulada?: boolean;
      opportunityId?: string;
      createdByName?: string;
      createdByUserId?: number;
      updatedByName?: string;
      updatedByUserId?: number;
      [key: string]: unknown;
    }>;

    for (const item of list) {
      await db
        .insert(cotizacionesTable)
        .values({
          id: item.id,
          numero: item.numeroCotizacion,
          estadoCrm: item.estadoCRM ?? "nueva",
          prioridad: item.prioridad ?? "media",
          anulada: item.anulada ?? false,
          opportunityId: item.opportunityId ?? null,
          createdById: item.createdByUserId ?? null,
          createdByName: item.createdByName ?? null,
          updatedById: item.updatedByUserId ?? null,
          updatedByName: item.updatedByName ?? null,
          datos: item,
        })
        .onConflictDoUpdate({
          target: cotizacionesTable.id,
          set: {
            numero: item.numeroCotizacion,
            estadoCrm: item.estadoCRM ?? "nueva",
            prioridad: item.prioridad ?? "media",
            anulada: item.anulada ?? false,
            datos: item,
            updatedAt: new Date(),
          },
        });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en bulk-sync de cotizaciones" });
  }
});

export default router;
