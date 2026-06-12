import { Router } from "express";
import { db, observacionesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();

router.use(requireAuth);

router.get("/observaciones", async (_req, res) => {
  try {
    const rows = await db.select().from(observacionesTable).orderBy(observacionesTable.orden);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cargar observaciones" });
  }
});

router.post("/observaciones", async (req, res) => {
  try {
    const body = req.body as { id: string; texto: string; categoria: string; orden: number; activo: boolean };
    const [row] = await db
      .insert(observacionesTable)
      .values(body)
      .onConflictDoUpdate({
        target: observacionesTable.id,
        set: { texto: body.texto, categoria: body.categoria, orden: body.orden, activo: body.activo },
      })
      .returning();
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar observación" });
  }
});

router.put("/observaciones/:id", async (req, res) => {
  try {
    const body = req.body as Partial<{ texto: string; categoria: string; orden: number; activo: boolean }>;
    const [row] = await db
      .update(observacionesTable)
      .set(body)
      .where(eq(observacionesTable.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Observación no encontrada" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar observación" });
  }
});

router.delete("/observaciones/:id", async (req, res) => {
  try {
    await db.delete(observacionesTable).where(eq(observacionesTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar observación" });
  }
});

router.post("/observaciones/bulk-sync", async (req, res) => {
  try {
    const list = req.body as Array<{ id: string; texto: string; categoria: string; orden: number; activo: boolean }>;
    for (const o of list) {
      await db
        .insert(observacionesTable)
        .values(o)
        .onConflictDoUpdate({ target: observacionesTable.id, set: o });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en bulk-sync de observaciones" });
  }
});

export default router;
