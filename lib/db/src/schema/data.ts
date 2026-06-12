import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { usuariosTable } from "./users";

// ─── Agencias ─────────────────────────────────────────────────────────────────

export const agenciasTable = pgTable("agencias", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  logoUrl: text("logo_url"),
  contacto: text("contacto"),
  telefono: text("telefono"),
  correo: text("correo"),
  predeterminada: boolean("predeterminada").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Agencia = typeof agenciasTable.$inferSelect;
export type InsertAgencia = typeof agenciasTable.$inferInsert;

// ─── Agentes ──────────────────────────────────────────────────────────────────

export const agentesTable = pgTable("agentes", {
  id: text("id").primaryKey(),
  agenciaId: text("agencia_id").notNull().references(() => agenciasTable.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  correo: text("correo"),
  telefono: text("telefono"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Agente = typeof agentesTable.$inferSelect;
export type InsertAgente = typeof agentesTable.$inferInsert;

// ─── Counters ─────────────────────────────────────────────────────────────────

export const countersTable = pgTable("counters", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Counter = typeof countersTable.$inferSelect;
export type InsertCounter = typeof countersTable.$inferInsert;

// ─── Plantillas ───────────────────────────────────────────────────────────────

export const plantillasTable = pgTable("plantillas", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  bloques: jsonb("bloques").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PlantillaRow = typeof plantillasTable.$inferSelect;
export type InsertPlantillaRow = typeof plantillasTable.$inferInsert;

// ─── Observaciones ────────────────────────────────────────────────────────────

export const observacionesTable = pgTable("observaciones", {
  id: text("id").primaryKey(),
  texto: text("texto").notNull(),
  categoria: text("categoria").notNull(),
  orden: integer("orden").notNull().default(0),
  activo: boolean("activo").notNull().default(true),
});

export type ObservacionRow = typeof observacionesTable.$inferSelect;
export type InsertObservacionRow = typeof observacionesTable.$inferInsert;

// ─── Tarifas ──────────────────────────────────────────────────────────────────

export const tarifasTable = pgTable("tarifas", {
  id: text("id").primaryKey(),
  tipo: text("tipo").notNull(), // 'hotel' | 'tour' | 'traslado'
  datos: jsonb("datos").notNull(),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type TarifaRow = typeof tarifasTable.$inferSelect;
export type InsertTarifaRow = typeof tarifasTable.$inferInsert;

// ─── Descriptivos personalizados ──────────────────────────────────────────────

export const descriptivosCustomTable = pgTable("descriptivos_custom", {
  id: text("id").primaryKey(),
  codigo: text("codigo").notNull(),
  titulo: text("titulo").notNull(),
  datos: jsonb("datos").notNull(),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type DescriptivoCustomRow = typeof descriptivosCustomTable.$inferSelect;
export type InsertDescriptivoCustomRow = typeof descriptivosCustomTable.$inferInsert;

// ─── Cotizaciones ─────────────────────────────────────────────────────────────

export const cotizacionesTable = pgTable("cotizaciones", {
  id: text("id").primaryKey(),
  numero: text("numero").notNull(),
  estadoCrm: text("estado_crm").notNull().default("nueva"),
  prioridad: text("prioridad").notNull().default("media"),
  anulada: boolean("anulada").notNull().default(false),
  opportunityId: text("opportunity_id"),
  createdById: integer("created_by_id").references(() => usuariosTable.id),
  createdByName: text("created_by_name"),
  updatedById: integer("updated_by_id").references(() => usuariosTable.id),
  updatedByName: text("updated_by_name"),
  datos: jsonb("datos").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CotizacionRow = typeof cotizacionesTable.$inferSelect;
export type InsertCotizacionRow = typeof cotizacionesTable.$inferInsert;

// ─── Oportunidades ────────────────────────────────────────────────────────────

export const oportunidadesTable = pgTable("oportunidades", {
  id: text("id").primaryKey(),
  agencyName: text("agency_name").notNull().default(""),
  agentName: text("agent_name").notNull().default(""),
  counterName: text("counter_name").notNull().default(""),
  quoteName: text("quote_name").notNull().default(""),
  destination: text("destination").notNull().default(""),
  status: text("status").notNull().default("nueva"),
  createdById: integer("created_by_id").references(() => usuariosTable.id),
  createdByName: text("created_by_name"),
  datos: jsonb("datos").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type OportunidadRow = typeof oportunidadesTable.$inferSelect;
export type InsertOportunidadRow = typeof oportunidadesTable.$inferInsert;
