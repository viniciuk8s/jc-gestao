/** CRUD de pagamentos. Valida se o funcionário existe e devolve o nome dele. */
import { and, desc, eq, type SQL } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { funcionarios, pagamentos, type Pagamento } from "../db/schema";
import { ApiError, naoEncontrado } from "../http";
import { pagamentoCreate, pagamentoQuery, pagamentoUpdate } from "../schemas";

const r = Router();

function out(p: Pagamento, funcionarioNome: string | null) {
  return { ...p, valor: p.valor == null ? null : Number(p.valor), funcionario_nome: funcionarioNome };
}

async function exigirFuncionario(id: number) {
  const [f] = await db.select({ id: funcionarios.id }).from(funcionarios)
    .where(eq(funcionarios.id, id)).limit(1);
  if (!f) throw new ApiError(400, "Funcionário informado não existe");
}

async function nomeDoFuncionario(id: number | null): Promise<string | null> {
  if (id == null) return null;
  const [f] = await db.select({ nome: funcionarios.nome }).from(funcionarios)
    .where(eq(funcionarios.id, id)).limit(1);
  return f?.nome ?? null;
}

// GET /api/pagamentos?funcionario_id=&competencia=
r.get("/", async (req, res) => {
  const q = pagamentoQuery.parse(req.query);
  const conds: SQL[] = [];
  if (q.funcionario_id) conds.push(eq(pagamentos.funcionarioId, q.funcionario_id));
  if (q.competencia) conds.push(eq(pagamentos.competencia, q.competencia));
  const rows = await db
    .select({ p: pagamentos, nome: funcionarios.nome })
    .from(pagamentos)
    .leftJoin(funcionarios, eq(pagamentos.funcionarioId, funcionarios.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(pagamentos.data), desc(pagamentos.id));
  res.json(rows.map((row) => out(row.p, row.nome)));
});

// GET /api/pagamentos/:id
r.get("/:id", async (req, res) => {
  const [row] = await db
    .select({ p: pagamentos, nome: funcionarios.nome })
    .from(pagamentos)
    .leftJoin(funcionarios, eq(pagamentos.funcionarioId, funcionarios.id))
    .where(eq(pagamentos.id, Number(req.params.id))).limit(1);
  if (!row) throw naoEncontrado("Pagamento não encontrado");
  res.json(out(row.p, row.nome));
});

// POST /api/pagamentos
r.post("/", async (req, res) => {
  const { valor, funcionarioId, ...rest } = pagamentoCreate.parse(req.body);
  await exigirFuncionario(funcionarioId);
  const [row] = await db.insert(pagamentos).values({
    ...rest, funcionarioId,
    ...(valor !== undefined ? { valor: String(valor) } : {}),
  }).returning();
  if (!row) throw new ApiError(500, "Falha ao registrar pagamento");
  res.status(201).json(out(row, await nomeDoFuncionario(row.funcionarioId)));
});

// PUT /api/pagamentos/:id
r.put("/:id", async (req, res) => {
  const { valor, funcionarioId, ...rest } = pagamentoUpdate.parse(req.body);
  if (funcionarioId !== undefined) await exigirFuncionario(funcionarioId);
  const values: Partial<typeof pagamentos.$inferInsert> = { ...rest };
  if (funcionarioId !== undefined) values.funcionarioId = funcionarioId;
  if (valor !== undefined) values.valor = String(valor);
  const [row] = await db.update(pagamentos).set(values)
    .where(eq(pagamentos.id, Number(req.params.id))).returning();
  if (!row) throw naoEncontrado("Pagamento não encontrado");
  res.json(out(row, await nomeDoFuncionario(row.funcionarioId)));
});

// DELETE /api/pagamentos/:id
r.delete("/:id", async (req, res) => {
  const [row] = await db.delete(pagamentos)
    .where(eq(pagamentos.id, Number(req.params.id))).returning();
  if (!row) throw naoEncontrado("Pagamento não encontrado");
  res.status(204).send();
});

export default r;