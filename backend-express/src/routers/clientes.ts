/** CRUD de clientes. Lista com busca por nome (?q=) e paginação opcional. */
import { and, asc, eq, ilike, type SQL } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { clientes } from "../db/schema";
import { ApiError, naoEncontrado } from "../http";
import { clienteCreate, clienteQuery, clienteUpdate } from "../schemas";

const r = Router();

r.get("/", async (req, res) => {
  const q = clienteQuery.parse(req.query);
  const conds: SQL[] = [];
  if (q.q) conds.push(ilike(clientes.nome, `%${q.q}%`));
  if (q.status && q.status !== "todos") conds.push(eq(clientes.status, q.status));
  const base = db.select().from(clientes)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(clientes.nome));
  let qb = base.$dynamic();
  if (q.limit !== undefined) qb = qb.limit(q.limit);
  if (q.offset !== undefined) qb = qb.offset(q.offset);
  res.json(await qb);
});

r.get("/:id", async (req, res) => {
  const [row] = await db.select().from(clientes)
    .where(eq(clientes.id, Number(req.params.id))).limit(1);
  if (!row) throw naoEncontrado("Cliente não encontrado");
  res.json(row);
});

r.post("/", async (req, res) => {
  const data = clienteCreate.parse(req.body);
  const [row] = await db.insert(clientes).values(data).returning();
  if (!row) throw new ApiError(500, "Falha ao criar cliente");
  res.status(201).json(row);
});

r.put("/:id", async (req, res) => {
  const data = clienteUpdate.parse(req.body);
  const [row] = await db.update(clientes).set(data)
    .where(eq(clientes.id, Number(req.params.id))).returning();
  if (!row) throw naoEncontrado("Cliente não encontrado");
  res.json(row);
});

r.delete("/:id", async (req, res) => {
  const [row] = await db.delete(clientes)
    .where(eq(clientes.id, Number(req.params.id))).returning();
  if (!row) throw naoEncontrado("Cliente não encontrado");
  res.status(204).send();
});

export default r;
