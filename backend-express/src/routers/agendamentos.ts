/** CRUD de agendamentos, com colaboradores (membros) aninhados. */
import { and, asc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { agendamentoMembros, agendamentos, type Agendamento, type AgendamentoMembro } from "../db/schema";
import { ApiError, naoEncontrado } from "../http";
import { agendamentoCreate, agendamentoQuery, agendamentoUpdate } from "../schemas";

const r = Router();

function out(a: Agendamento, membros: AgendamentoMembro[]) {
  return {
    ...a,
    valor: a.valor == null ? null : Number(a.valor),
    membros: membros.map((m) => ({ id: m.id, nome: m.nome, tipo: m.tipo })),
  };
}

// Carrega os membros de vários agendamentos de uma vez (evita N+1).
async function membrosPorAgendamento(ids: number[]) {
  const map = new Map<number, AgendamentoMembro[]>();
  if (ids.length === 0) return map;
  const rows = await db.select().from(agendamentoMembros)
    .where(inArray(agendamentoMembros.agendamentoId, ids));
  for (const m of rows) {
    const arr = map.get(m.agendamentoId) ?? [];
    arr.push(m);
    map.set(m.agendamentoId, arr);
  }
  return map;
}

// GET /api/agendamentos?de=&ate=&status=&limit=&offset=
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
  const mp = await membrosPorAgendamento(rows.map((a) => a.id));
  res.json(rows.map((a) => out(a, mp.get(a.id) ?? [])));
});

r.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(agendamentos).where(eq(agendamentos.id, id)).limit(1);
  if (!row) throw naoEncontrado("Agendamento não encontrado");
  const mp = await membrosPorAgendamento([id]);
  res.json(out(row, mp.get(id) ?? []));
});

r.post("/", async (req, res) => {
  const { valor, membros, ...rest } = agendamentoCreate.parse(req.body);
  const novo = await db.transaction(async (tx) => {
    const [row] = await tx.insert(agendamentos).values({
      ...rest,
      ...(valor !== undefined ? { valor: String(valor) } : {}),
    }).returning();
    if (!row) throw new ApiError(500, "Falha ao criar agendamento");
    if (membros && membros.length) {
      await tx.insert(agendamentoMembros).values(
        membros.map((m) => ({ agendamentoId: row.id, nome: m.nome, tipo: m.tipo ?? "funcionario" })),
      );
    }
    return row;
  });
  const mp = await membrosPorAgendamento([novo.id]);
  res.status(201).json(out(novo, mp.get(novo.id) ?? []));
});

r.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { valor, membros, ...rest } = agendamentoUpdate.parse(req.body);
  const atualizado = await db.transaction(async (tx) => {
    const values: Partial<typeof agendamentos.$inferInsert> = { ...rest };
    if (valor !== undefined) values.valor = String(valor);
    const [row] = await tx.update(agendamentos).set(values)
      .where(eq(agendamentos.id, id)).returning();
    if (!row) return null;
    // Se "membros" veio no corpo, substitui o conjunto inteiro.
    if (membros !== undefined) {
      await tx.delete(agendamentoMembros).where(eq(agendamentoMembros.agendamentoId, id));
      if (membros.length) {
        await tx.insert(agendamentoMembros).values(
          membros.map((m) => ({ agendamentoId: id, nome: m.nome, tipo: m.tipo ?? "funcionario" })),
        );
      }
    }
    return row;
  });
  if (!atualizado) throw naoEncontrado("Agendamento não encontrado");
  const mp = await membrosPorAgendamento([id]);
  res.json(out(atualizado, mp.get(id) ?? []));
});

// DELETE: os membros somem junto (FK on delete cascade).
r.delete("/:id", async (req, res) => {
  const [row] = await db.delete(agendamentos)
    .where(eq(agendamentos.id, Number(req.params.id))).returning();
  if (!row) throw naoEncontrado("Agendamento não encontrado");
  res.status(204).send();
});

export default r;
