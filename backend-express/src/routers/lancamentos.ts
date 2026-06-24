/** CRUD de lançamentos (fluxo de caixa). */
import { and, desc, eq, gte, type SQL } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { lancamentos, type Lancamento } from "../db/schema";
import { ApiError, naoEncontrado } from "../http";
import { lancamentoCreate, lancamentoQuery, lancamentoUpdate } from "../schemas";

const r = Router();

const out = (l: Lancamento) => ({ ...l, valor: Number(l.valor) });

// GET /api/lancamentos?tipo=&status=&dias=
r.get("/", async (req, res) => {
  const q = lancamentoQuery.parse(req.query);
  const conds: SQL[] = [];
  if (q.tipo) conds.push(eq(lancamentos.tipo, q.tipo));
  if (q.status && q.status !== "todos") conds.push(eq(lancamentos.status, q.status));
  if (q.dias) {
    const d = new Date();
    d.setDate(d.getDate() - q.dias);
    conds.push(gte(lancamentos.data, d.toISOString().slice(0, 10)));
  }
  const base = db.select().from(lancamentos)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(lancamentos.data), desc(lancamentos.id));
  let qb = base.$dynamic();
  if (q.limit !== undefined) qb = qb.limit(q.limit);
  if (q.offset !== undefined) qb = qb.offset(q.offset);
  const rows = await qb;
  res.json(rows.map(out));
});

r.get("/:id", async (req, res) => {
  const [row] = await db.select().from(lancamentos)
    .where(eq(lancamentos.id, Number(req.params.id))).limit(1);
  if (!row) throw naoEncontrado("Lançamento não encontrado");
  res.json(out(row));
});

r.post("/", async (req, res) => {
  const { valor, ...rest } = lancamentoCreate.parse(req.body);
  const [row] = await db.insert(lancamentos)
    .values({ ...rest, valor: String(valor) }).returning();
  if (!row) throw new ApiError(500, "Falha ao criar lançamento");
  res.status(201).json(out(row));
});

r.put("/:id", async (req, res) => {
  const { valor, ...rest } = lancamentoUpdate.parse(req.body);
  const values: Partial<typeof lancamentos.$inferInsert> = { ...rest };
  if (valor !== undefined) values.valor = String(valor);
  const [row] = await db.update(lancamentos).set(values)
    .where(eq(lancamentos.id, Number(req.params.id))).returning();
  if (!row) throw naoEncontrado("Lançamento não encontrado");
  res.json(out(row));
});

r.delete("/:id", async (req, res) => {
  const [row] = await db.delete(lancamentos)
    .where(eq(lancamentos.id, Number(req.params.id))).returning();
  if (!row) throw naoEncontrado("Lançamento não encontrado");
  res.status(204).send();
});

export default r;