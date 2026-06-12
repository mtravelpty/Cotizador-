import { Router } from "express";
import { db, plantillasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router = Router();

router.use(requireAuth);

router.get("/plantillas", async (_req, res) => {
  try {
    const rows = await db.select().from(plantillasTable).orderBy(plantillasTable.nombre);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cargar plantillas" });
  }
});

router.post("/plantillas", async (req, res) => {
  try {
    const body = req.body as {
      id: string; nombre: string; descripcion?: string; bloques: unknown[];
      createdAt?: string; updatedAt?: string;
    };
    const [row] = await db
      .insert(plantillasTable)
      .values({
        id: body.id,
        nombre: body.nombre,
        descripcion: body.descripcion ?? null,
        bloques: body.bloques ?? [],
      })
      .onConflictDoUpdate({
        target: plantillasTable.id,
        set: {
          nombre: body.nombre,
          descripcion: body.descripcion ?? null,
          bloques: body.bloques ?? [],
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar plantilla" });
  }
});

router.put("/plantillas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body as Partial<{ nombre: string; descripcion: string; bloques: unknown[] }>;
    const [row] = await db
      .update(plantillasTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(plantillasTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Plantilla no encontrada" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar plantilla" });
  }
});

router.delete("/plantillas/:id", async (req, res) => {
  try {
    await db.delete(plantillasTable).where(eq(plantillasTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar plantilla" });
  }
});

router.post("/plantillas/bulk-sync", async (req, res) => {
  try {
    const list = req.body as Array<{ id: string; nombre: string; descripcion?: string; bloques: unknown[] }>;
    for (const p of list) {
      await db
        .insert(plantillasTable)
        .values({ id: p.id, nombre: p.nombre, descripcion: p.descripcion ?? null, bloques: p.bloques ?? [] })
        .onConflictDoUpdate({
          target: plantillasTable.id,
          set: { nombre: p.nombre, descripcion: p.descripcion ?? null, bloques: p.bloques ?? [], updatedAt: new Date() },
        });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en bulk-sync de plantillas" });
  }
});

export default router;
