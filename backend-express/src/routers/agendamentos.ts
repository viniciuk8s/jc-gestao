/** CRUD de agendamentos. */
import { and, asc, eq, gte, lte, type SQL } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { agendamentos, type Agendamento } from "../db/schema";
import { ApiError, naoEncontrado } from "../http";
import { agendamentoCreate, agendamentoQuery, agendamentoUpdate } from "../schemas";

const r = Router();

const out = (a: Agendamento) => ({ ...a, valor: a.valor == null ? null : Number(a.valor) });

// GET /api/agendamentos?de=&ate=&status=
r.get("/", async (req, res) => {
  const q = agendamentoQuery.parse(req.query);
  const conds: SQL[] = [];
  if (q.de) conds.push(gte(agendamentos.data, q.de));
  if (q.ate) conds.push(lte(agendamentos.data, q.ate));
  if (q.status && q.status !== "todos") conds.push(eq(agendamentos.status, q.status));
  const base = db.select().from(agendamentos)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(agendamentos.data), asc(agendamentos.horario));
  let qb = base.$dynamic();
  if (q.limit !== undefined) qb = qb.limit(q.limit);
  if (q.offset !== undefined) qb = qb.offset(q.offset);
  const rows = await qb;
  res.json(rows.map(out));
});

r.get("/:id", async (req, res) => {
  const [row] = await db.select().from(agendamentos)
    .where(eq(agendamentos.id, Number(req.params.id))).limit(1);
  if (!row) throw naoEncontrado("Agendamento não encontrado");
  res.json(out(row));
});

r.post("/", async (req, res) => {
  const { valor, ...rest } = agendamentoCreate.parse(req.body);
  const [row] = await db.insert(agendamentos).values({
    ...rest,
    ...(valor !== undefined ? { valor: String(valor) } : {}),
  }).returning();
  if (!row) throw new ApiError(500, "Falha ao criar agendamento");
  res.status(201).json(out(row));
});

r.put("/:id", async (req, res) => {
  const { valor, ...rest } = agendamentoUpdate.parse(req.body);
  const values: Partial<typeof agendamentos.$inferInsert> = { ...rest };
  if (valor !== undefined) values.valor = String(valor);
  const [row] = await db.update(agendamentos).set(values)
    .where(eq(agendamentos.id, Number(req.params.id))).returning();
  if (!row) throw naoEncontrado("Agendamento não encontrado");
  res.json(out(row));
});

r.delete("/:id", async (req, res) => {
  const [row] = await db.delete(agendamentos)
    .where(eq(agendamentos.id, Number(req.params.id))).returning();
  if (!row) throw naoEncontrado("Agendamento não encontrado");
  res.status(204).send();
});

export default r;