import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const usuariosTable = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  username: text("username").unique(),
  correo: text("correo"),
  contrasenaHash: text("contrasena_hash").notNull(),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Usuario = typeof usuariosTable.$inferSelect;
export type InsertUsuario = typeof usuariosTable.$inferInsert;
