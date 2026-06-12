import { Router } from "express";
import { db, oportunidadesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router = Router();

router.use(requireAuth);

router.get("/oportunidades", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(oportunidadesTable)
      .orderBy(desc(oportunidadesTable.updatedAt));
    res.json(rows.map((r) => r.datos));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cargar oportunidades" });
  }
});

router.post("/oportunidades", async (req: AuthRequest, res) => {
  try {
    const item = req.body as {
      id: string;
      agencyName?: string;
      agentName?: string;
      counterName?: string;
      quoteName?: string;
      destination?: string;
      status?: string;
      createdByName?: string;
      createdByUserId?: number;
      [key: string]: unknown;
    };

    const enriched = {
      ...item,
      createdByName: item.createdByName ?? req.userName,
      createdByUserId: item.createdByUserId ?? req.userId,
      createdByEmail: item.createdByEmail ?? req.userEmail,
    };

    const [row] = await db
      .insert(oportunidadesTable)
      .values({
        id: item.id,
        agencyName: item.agencyName ?? "",
        agentName: item.agentName ?? "",
        counterName: item.counterName ?? "",
        quoteName: item.quoteName ?? "",
        destination: item.destination ?? "",
        status: item.status ?? "nueva",
        createdById: item.createdByUserId ?? req.userId ?? null,
        createdByName: item.createdByName ?? req.userName ?? null,
        datos: enriched,
      })
      .onConflictDoUpdate({
        target: oportunidadesTable.id,
        set: {
          agencyName: item.agencyName ?? "",
          agentName: item.agentName ?? "",
          counterName: item.counterName ?? "",
          quoteName: item.quoteName ?? "",
          destination: item.destination ?? "",
          status: item.status ?? "nueva",
          datos: enriched,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json(row.datos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar oportunidad" });
  }
});

router.put("/oportunidades/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const item = req.body as { status?: string; agencyName?: string; destination?: string; [key: string]: unknown };
    const [row] = await db
      .update(oportunidadesTable)
      .set({
        status: item.status ?? undefined,
        agencyName: item.agencyName ?? undefined,
        destination: item.destination ?? undefined,
        datos: item,
        updatedAt: new Date(),
      })
      .where(eq(oportunidadesTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Oportunidad no encontrada" });
    res.json(row.datos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar oportunidad" });
  }
});

router.delete("/oportunidades/:id", async (req, res) => {
  try {
    await db.delete(oportunidadesTable).where(eq(oportunidadesTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar oportunidad" });
  }
});

router.post("/oportunidades/bulk-sync", async (req: AuthRequest, res) => {
  try {
    const list = req.body as Array<{
      id: string;
      agencyName?: string;
      agentName?: string;
      counterName?: string;
      quoteName?: string;
      destination?: string;
      status?: string;
      [key: string]: unknown;
    }>;

    for (const item of list) {
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
          createdById: req.userId ?? null,
          datos: item,
        })
        .onConflictDoUpdate({
          target: oportunidadesTable.id,
          set: {
            agencyName: item.agencyName ?? "",
            status: item.status ?? "nueva",
            datos: item,
            updatedAt: new Date(),
          },
        });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en bulk-sync de oportunidades" });
  }
});

export default router;
