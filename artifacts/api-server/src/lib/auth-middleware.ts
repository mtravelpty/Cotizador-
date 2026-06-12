import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../routes/auth";

export interface AuthRequest extends Request {
  userId?: number;
  userName?: string;
  userEmail?: string;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as {
      id: number;
      nombre: string;
      correo: string;
    };
    req.userId = payload.id;
    req.userName = payload.nombre;
    req.userEmail = payload.correo;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}
