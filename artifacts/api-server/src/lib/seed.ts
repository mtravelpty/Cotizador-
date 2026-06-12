/**
 * seedUsers — Lista de usuarios iniciales del sistema.
 *
 * Para agregar más usuarios, añade una entrada a SEED_USERS.
 * Las contraseñas se guardan hasheadas; aquí se ponen en texto plano.
 * Solo se crean los usuarios que NO existan en la base de datos (por username).
 */

import bcrypt from "bcryptjs";
import { db, usuariosTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { logger } from "./logger.js";

interface SeedUser {
  nombre: string;
  username: string;
  correo?: string;
  password: string;
  activo: boolean;
}

const SEED_USERS: SeedUser[] = [
  {
    nombre: "Administrador",
    username: "admin",
    correo: "admin@rgestyletravel.com",
    password: "rge2025",
    activo: true,
  },
  {
    nombre: "Jonathan",
    username: "jonathan",
    password: "4827",
    activo: true,
  },
  {
    nombre: "Johana",
    username: "johana",
    password: "9153",
    activo: true,
  },
  {
    nombre: "Melisa",
    username: "melisa",
    password: "6482",
    activo: true,
  },
  {
    nombre: "Gabriela",
    username: "gabriela",
    password: "3719",
    activo: true,
  },
  {
    nombre: "Ruth",
    username: "ruth",
    password: "8246",
    activo: true,
  },
  {
    nombre: "Yeni",
    username: "yeni",
    password: "5931",
    activo: true,
  },
  {
    nombre: "Annie",
    username: "annie",
    password: "7164",
    activo: true,
  },
  {
    nombre: "María González",
    username: "maria",
    password: "maria2025",
    activo: true,
  },
  {
    nombre: "José Pérez",
    username: "jose",
    password: "jose2025",
    activo: true,
  },
  // Para agregar más usuarios, copia el bloque anterior y edita los campos:
  // {
  //   nombre: "Nombre Apellido",
  //   username: "usuario",
  //   password: "contraseña-segura",
  //   activo: true,
  // },
];

export async function seedUsers(): Promise<void> {
  try {
    for (const u of SEED_USERS) {
      const username = u.username.trim().toLowerCase();

      // Check by username (primary) or by correo (for migrated users)
      const conditions = u.correo
        ? or(
            eq(usuariosTable.username, username),
            eq(usuariosTable.correo, u.correo.trim().toLowerCase()),
          )
        : eq(usuariosTable.username, username);

      const [existing] = await db
        .select({ id: usuariosTable.id, username: usuariosTable.username })
        .from(usuariosTable)
        .where(conditions!)
        .limit(1);

      if (existing) {
        // If the user exists but has no username yet, patch it
        if (!existing.username) {
          await db
            .update(usuariosTable)
            .set({ username })
            .where(eq(usuariosTable.id, existing.id));
          logger.info({ username }, "Username asignado a usuario existente");
        } else {
          logger.debug({ username }, "Usuario ya existe, omitiendo seed");
        }
        continue;
      }

      const contrasenaHash = await bcrypt.hash(u.password, 10);
      await db.insert(usuariosTable).values({
        nombre: u.nombre,
        username,
        correo: u.correo?.trim().toLowerCase(),
        contrasenaHash,
        activo: u.activo,
      });
      logger.info({ username }, "Usuario inicial creado");
    }
  } catch (err) {
    logger.error({ err }, "Error al ejecutar seedUsers");
  }
}
