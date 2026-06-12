import { Router } from "express";
import { db, tarifasTable, descriptivosCustomTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();

router.use(requireAuth);

// ─── Tarifas (hoteles, tours, traslados) ──────────────────────────────────────

router.get("/tarifas/:tipo", async (req, res) => {
  try {
    const { tipo } = req.params;
    if (!["hotel", "tour", "traslado"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo inválido" });
    }
    const rows = await db
      .select()
      .from(tarifasTable)
      .where(eq(tarifasTable.tipo, tipo))
      .orderBy(tarifasTable.createdAt);
    res.json(rows.map((r) => r.datos));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cargar tarifas" });
  }
});

router.post("/tarifas/:tipo", async (req, res) => {
  try {
    const { tipo } = req.params;
    const item = req.body as { id: string; [key: string]: unknown };
    const [row] = await db
      .insert(tarifasTable)
      .values({ id: item.id, tipo, datos: item, activo: (item.activo as boolean) ?? true })
      .onConflictDoUpdate({
        target: tarifasTable.id,
        set: { datos: item, activo: (item.activo as boolean) ?? true, updatedAt: new Date() },
      })
      .returning();
    res.json(row.datos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar tarifa" });
  }
});

router.delete("/tarifas/:tipo/:id", async (req, res) => {
  try {
    const { tipo, id } = req.params;
    await db.delete(tarifasTable).where(and(eq(tarifasTable.tipo, tipo), eq(tarifasTable.id, id)));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar tarifa" });
  }
});

router.post("/tarifas/:tipo/bulk-sync", async (req, res) => {
  try {
    const { tipo } = req.params;
    const list = req.body as Array<{ id: string; [key: string]: unknown }>;
    await db.delete(tarifasTable).where(eq(tarifasTable.tipo, tipo));
    for (const item of list) {
      await db
        .insert(tarifasTable)
        .values({ id: item.id, tipo, datos: item, activo: (item.activo as boolean) ?? true });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en bulk-sync de tarifas" });
  }
});

// ─── Descriptivos personalizados ──────────────────────────────────────────────

router.get("/descriptivos-custom", async (_req, res) => {
  try {
    const rows = await db.select().from(descriptivosCustomTable).orderBy(descriptivosCustomTable.codigo);
    res.json(rows.map((r) => r.datos));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cargar descriptivos custom" });
  }
});

router.post("/descriptivos-custom", async (req, res) => {
  try {
    const item = req.body as { id: string; codigo: string; titulo: string; activo?: boolean; [key: string]: unknown };
    const [row] = await db
      .insert(descriptivosCustomTable)
      .values({
        id: item.id,
        codigo: item.codigo,
        titulo: item.titulo,
        datos: item,
        activo: item.activo ?? true,
      })
      .onConflictDoUpdate({
        target: descriptivosCustomTable.id,
        set: { codigo: item.codigo, titulo: item.titulo, datos: item, activo: item.activo ?? true, updatedAt: new Date() },
      })
      .returning();
    res.json(row.datos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar descriptivo custom" });
  }
});

router.delete("/descriptivos-custom/:id", async (req, res) => {
  try {
    await db.delete(descriptivosCustomTable).where(eq(descriptivosCustomTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar descriptivo custom" });
  }
});

router.post("/descriptivos-custom/bulk-sync", async (req, res) => {
  try {
    const list = req.body as Array<{ id: string; codigo: string; titulo: string; activo?: boolean; [key: string]: unknown }>;
    for (const item of list) {
      await db
        .insert(descriptivosCustomTable)
        .values({ id: item.id, codigo: item.codigo, titulo: item.titulo, datos: item, activo: item.activo ?? true })
        .onConflictDoUpdate({
          target: descriptivosCustomTable.id,
          set: { codigo: item.codigo, titulo: item.titulo, datos: item, activo: item.activo ?? true, updatedAt: new Date() },
        });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en bulk-sync de descriptivos" });
  }
});

export default router;
