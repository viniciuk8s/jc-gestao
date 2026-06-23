/** CRUD de jornadas de trabalho (registro diário). Valida o funcionário
 *  e devolve o nome dele no retorno (como em pagamentos). */
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { funcionarios, jornadas, type Jornada } from "../db/schema";
import { ApiError, naoEncontrado } from "../http";
import { jornadaCreate, jornadaQuery, jornadaUpdate } from "../schemas";

const r = Router();

function out(j: Jornada, funcionarioNome: string | null) {
  return { ...j, despesa: j.despesa == null ? null : Number(j.despesa), funcionario_nome: funcionarioNome };
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

// GET /api/jornadas?funcionario_id=&de=&ate=
r.get("/", async (req, res) => {
  const q = jornadaQuery.parse(req.query);
  const conds: SQL[] = [];
  if (q.funcionario_id) conds.push(eq(jornadas.funcionarioId, q.funcionario_id));
  if (q.de) conds.push(gte(jornadas.data, q.de));
  if (q.ate) conds.push(lte(jornadas.data, q.ate));
  const rows = await db
    .select({ j: jornadas, nome: funcionarios.nome })
    .from(jornadas)
    .leftJoin(funcionarios, eq(jornadas.funcionarioId, funcionarios.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(jornadas.data), desc(jornadas.id));
  res.json(rows.map((row) => out(row.j, row.nome)));
});

// GET /api/jornadas/:id
r.get("/:id", async (req, res) => {
  const [row] = await db
    .select({ j: jornadas, nome: funcionarios.nome })
    .from(jornadas)
    .leftJoin(funcionarios, eq(jornadas.funcionarioId, funcionarios.id))
    .where(eq(jornadas.id, Number(req.params.id))).limit(1);
  if (!row) throw naoEncontrado("Registro de trabalho não encontrado");
  res.json(out(row.j, row.nome));
});

// POST /api/jornadas
r.post("/", async (req, res) => {
  const { despesa, funcionarioId, ...rest } = jornadaCreate.parse(req.body);
  await exigirFuncionario(funcionarioId);
  const [row] = await db.insert(jornadas).values({
    ...rest, funcionarioId,
    ...(despesa !== undefined ? { despesa: String(despesa) } : {}),
  }).returning();
  if (!row) throw new ApiError(500, "Falha ao registrar jornada");
  res.status(201).json(out(row, await nomeDoFuncionario(row.funcionarioId)));
});

// PUT /api/jornadas/:id
r.put("/:id", async (req, res) => {
  const { despesa, funcionarioId, ...rest } = jornadaUpdate.parse(req.body);
  if (funcionarioId !== undefined) await exigirFuncionario(funcionarioId);
  const values: Partial<typeof jornadas.$inferInsert> = { ...rest };
  if (funcionarioId !== undefined) values.funcionarioId = funcionarioId;
  if (despesa !== undefined) values.despesa = String(despesa);
  const [row] = await db.update(jornadas).set(values)
    .where(eq(jornadas.id, Number(req.params.id))).returning();
  if (!row) throw naoEncontrado("Registro de trabalho não encontrado");
  res.json(out(row, await nomeDoFuncionario(row.funcionarioId)));
});

// DELETE /api/jornadas/:id
r.delete("/:id", async (req, res) => {
  const [row] = await db.delete(jornadas)
    .where(eq(jornadas.id, Number(req.params.id))).returning();
  if (!row) throw naoEncontrado("Registro de trabalho não encontrado");
  res.status(204).send();
});

export default r;
