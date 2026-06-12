import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const JWT_SECRET = process.env.SESSION_SECRET ?? "rge-jwt-secret-dev-2025";
const JWT_EXPIRES = "30d";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { username, contrasena } = req.body ?? {};

  try {
    if (!username || !contrasena) {
      console.log("[AUTH] Fallo: campos vacíos", { username: !!username, contrasena: !!contrasena });
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }

    const normalized = String(username).trim().toLowerCase();
    console.log("[AUTH] Buscando usuario:", normalized);

    const [user] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.username, normalized))
      .limit(1);

    if (!user) {
      console.log("[AUTH] Fallo: usuario no encontrado:", normalized);
      return res.status(401).json({ error: "Credenciales inválidas", motivo: "usuario no encontrado" });
    }

    if (!user.activo) {
      console.log("[AUTH] Fallo: usuario inactivo:", normalized);
      return res.status(401).json({ error: "Credenciales inválidas", motivo: "usuario inactivo" });
    }

    const valid = await bcrypt.compare(String(contrasena), user.contrasenaHash);
    console.log("[AUTH] bcrypt.compare resultado:", valid, "para usuario:", normalized);

    if (!valid) {
      console.log("[AUTH] Fallo: contraseña incorrecta para:", normalized);
      return res.status(401).json({ error: "Credenciales inválidas", motivo: "contraseña incorrecta" });
    }

    const payload = { id: user.id, nombre: user.nombre, correo: user.correo ?? "" };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    console.log("[AUTH] Login exitoso:", normalized);
    return res.json({ token, user: payload });
  } catch (err) {
    console.error("[AUTH] Error interno:", err);
    return res.status(500).json({ error: "Error al iniciar sesión", motivo: "error interno" });
  }
});

router.get("/auth/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado" });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as {
      id: number;
      nombre: string;
      correo: string;
    };
    return res.json({ id: payload.id, nombre: payload.nombre, correo: payload.correo });
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
});

export default router;
