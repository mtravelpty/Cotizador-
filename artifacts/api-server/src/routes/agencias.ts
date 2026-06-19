import { Router } from "express";
import { randomUUID } from "crypto";
import { db, agenciasTable, agentesTable, countersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const router = Router();

router.use(requireAuth);

// ─── Agencias ─────────────────────────────────────────────────────────────────

router.get("/agencias", async (_req, res) => {
  try {
    const rows = await db.select().from(agenciasTable).orderBy(agenciasTable.nombre);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cargar agencias" });
  }
});

router.post("/agencias", async (req, res) => {
  try {
    const body = req.body as {
      id: string; nombre: string; logoUrl?: string; contacto?: string;
      telefono?: string; correo?: string; predeterminada?: boolean;
    };
    if (body.predeterminada) {
      await db.update(agenciasTable).set({ predeterminada: false });
    }
    const [row] = await db
      .insert(agenciasTable)
      .values({
        id: body.id,
        nombre: body.nombre,
        logoUrl: body.logoUrl ?? null,
        contacto: body.contacto ?? null,
        telefono: body.telefono ?? null,
        correo: body.correo ?? null,
        predeterminada: body.predeterminada ?? false,
      })
      .onConflictDoUpdate({
        target: agenciasTable.id,
        set: {
          nombre: body.nombre,
          logoUrl: body.logoUrl ?? null,
          contacto: body.contacto ?? null,
          telefono: body.telefono ?? null,
          correo: body.correo ?? null,
          predeterminada: body.predeterminada ?? false,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar agencia" });
  }
});

router.put("/agencias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body as Partial<{
      nombre: string; logoUrl: string; contacto: string;
      telefono: string; correo: string; predeterminada: boolean;
    }>;
    if (body.predeterminada) {
      await db.update(agenciasTable).set({ predeterminada: false });
    }
    const [row] = await db
      .update(agenciasTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(agenciasTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Agencia no encontrada" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar agencia" });
  }
});

router.delete("/agencias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(agentesTable).where(eq(agentesTable.agenciaId, id));
    await db.delete(agenciasTable).where(eq(agenciasTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar agencia" });
  }
});

// ─── Agentes ──────────────────────────────────────────────────────────────────

router.get("/agentes", async (_req, res) => {
  try {
    const rows = await db.select().from(agentesTable).orderBy(agentesTable.nombre);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cargar agentes" });
  }
});

router.post("/agentes", async (req, res) => {
  try {
    const body = req.body as { id: string; agenciaId: string; nombre: string; correo?: string; telefono?: string };
    const [row] = await db
      .insert(agentesTable)
      .values({
        id: body.id,
        agenciaId: body.agenciaId,
        nombre: body.nombre,
        correo: body.correo ?? null,
        telefono: body.telefono ?? null,
      })
      .onConflictDoUpdate({
        target: agentesTable.id,
        set: {
          agenciaId: body.agenciaId,
          nombre: body.nombre,
          correo: body.correo ?? null,
          telefono: body.telefono ?? null,
        },
      })
      .returning();
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar agente" });
  }
});

router.put("/agentes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body as Partial<{ nombre: string; correo: string; telefono: string; agenciaId: string }>;
    const [row] = await db
      .update(agentesTable)
      .set(body)
      .where(eq(agentesTable.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Agente no encontrado" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar agente" });
  }
});

router.delete("/agentes/:id", async (req, res) => {
  try {
    await db.delete(agentesTable).where(eq(agentesTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar agente" });
  }
});

// ─── Counters ─────────────────────────────────────────────────────────────────

router.get("/counters", async (_req, res) => {
  try {
    const rows = await db.select().from(countersTable).orderBy(countersTable.nombre);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al cargar counters" });
  }
});

router.post("/counters", async (req, res) => {
  try {
    const body = req.body as { id: string; nombre: string };
    const [row] = await db
      .insert(countersTable)
      .values({ id: body.id, nombre: body.nombre })
      .onConflictDoUpdate({ target: countersTable.id, set: { nombre: body.nombre } })
      .returning();
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar counter" });
  }
});

router.delete("/counters/:id", async (req, res) => {
  try {
    await db.delete(countersTable).where(eq(countersTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar counter" });
  }
});

// ─── Smart sync desde cotización ──────────────────────────────────────────────

router.post("/agencias/sync-from-quote", async (req, res) => {
  try {
    const { agencyName, agentName, correo } = req.body as {
      agencyName?: string;
      agentName?: string;
      correo?: string;
    };

    const agencyNorm = normalize(agencyName ?? "");
    const agentNorm = normalize(agentName ?? "");

    if (!agencyNorm || !agentNorm) {
      return res.json({ status: "skipped", reason: "empty_fields" });
    }

    // ── 1. Buscar o crear agencia ─────────────────────────────────────────────
    const allAgencias = await db.select().from(agenciasTable);
    let agencia = allAgencias.find((a) => normalize(a.nombre) === agencyNorm);

    if (!agencia) {
      const [created] = await db
        .insert(agenciasTable)
        .values({
          id: randomUUID(),
          nombre: agencyName!.trim(),
          predeterminada: false,
        })
        .returning();
      agencia = created;
    }

    // ── 2. Buscar o crear agente ──────────────────────────────────────────────
    const allAgentes = await db
      .select()
      .from(agentesTable)
      .where(eq(agentesTable.agenciaId, agencia.id));

    const agente = allAgentes.find((a) => normalize(a.nombre) === agentNorm);

    if (!agente) {
      // Verificar que no exista el mismo correo ya en la agencia
      const correoNorm = correo?.trim().toLowerCase();
      const correoYaExiste = correoNorm
        ? allAgentes.some((a) => a.correo?.toLowerCase() === correoNorm)
        : false;

      const [created] = await db
        .insert(agentesTable)
        .values({
          id: randomUUID(),
          agenciaId: agencia.id,
          nombre: agentName!.trim(),
          correo: !correoYaExiste && correo?.trim() ? correo.trim() : null,
        })
        .returning();
      return res.json({ status: "ok", agenciaId: agencia.id, agenteId: created.id, action: "created_agent" });
    }

    // ── 3. Agente ya existe — revisar correo ──────────────────────────────────
    const currentEmail = agente.correo?.trim() || "";
    const newEmail = correo?.trim() || "";

    if (!newEmail || currentEmail.toLowerCase() === newEmail.toLowerCase()) {
      return res.json({ status: "ok", agenciaId: agencia.id, agenteId: agente.id, action: "no_change" });
    }

    if (!currentEmail) {
      // Si no tenía correo, actualizar sin pedir confirmación
      await db
        .update(agentesTable)
        .set({ correo: newEmail })
        .where(eq(agentesTable.id, agente.id));
      return res.json({ status: "ok", agenciaId: agencia.id, agenteId: agente.id, action: "email_added" });
    }

    // Correo distinto al existente → reportar conflicto para confirmación del usuario
    return res.json({
      status: "email_conflict",
      agenciaId: agencia.id,
      agenteId: agente.id,
      agenteNombre: agente.nombre,
      currentEmail,
      newEmail,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en sync-from-quote" });
  }
});

// ─── Bulk sync (importar respaldo) ────────────────────────────────────────────

router.post("/agencias/bulk-sync", async (req, res) => {
  try {
    const { agencias, agentes } = req.body as {
      agencias: Array<{ id: string; nombre: string; logoUrl?: string; contacto?: string; telefono?: string; correo?: string; predeterminada?: boolean }>;
      agentes: Array<{ id: string; agenciaId: string; nombre: string; correo?: string; telefono?: string }>;
    };
    if (agencias?.length) {
      for (const a of agencias) {
        await db.insert(agenciasTable).values(a).onConflictDoUpdate({ target: agenciasTable.id, set: { ...a, updatedAt: new Date() } });
      }
    }
    if (agentes?.length) {
      for (const a of agentes) {
        await db.insert(agentesTable).values(a).onConflictDoUpdate({ target: agentesTable.id, set: a });
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en bulk-sync de agencias" });
  }
});

export default router;
