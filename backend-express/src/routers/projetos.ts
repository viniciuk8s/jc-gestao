/** CRUD de projetos, com membros aninhados (funcionários e terceiros). */
import { desc, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { projetoMembros, projetos, type Projeto, type ProjetoMembro } from "../db/schema";
import { ApiError, naoEncontrado } from "../http";
import { projetoCreate, projetoUpdate } from "../schemas";

const r = Router();

function out(p: Projeto, membros: ProjetoMembro[]) {
  return { ...p, membros: membros.map((m) => ({ id: m.id, nome: m.nome, tipo: m.tipo })) };
}

// carrega os membros de vários projetos de uma vez (evita N+1)
async function membrosPorProjeto(ids: number[]) {
  const map = new Map<number, ProjetoMembro[]>();
  if (ids.length === 0) return map;
  const rows = await db.select().from(projetoMembros).where(inArray(projetoMembros.projetoId, ids));
  for (const m of rows) {
    const arr = map.get(m.projetoId) ?? [];
    arr.push(m);
    map.set(m.projetoId, arr);
  }
  return map;
}

// GET /api/projetos
r.get("/", async (_req, res) => {
  const rows = await db.select().from(projetos).orderBy(desc(projetos.id));
  const map = await membrosPorProjeto(rows.map((p) => p.id));
  res.json(rows.map((p) => out(p, map.get(p.id) ?? [])));
});

// GET /api/projetos/:id
r.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [p] = await db.select().from(projetos).where(eq(projetos.id, id)).limit(1);
  if (!p) throw naoEncontrado("Projeto não encontrado");
  const membros = await db.select().from(projetoMembros).where(eq(projetoMembros.projetoId, id));
  res.json(out(p, membros));
});

// POST /api/projetos
r.post("/", async (req, res) => {
  const { membros, ...rest } = projetoCreate.parse(req.body);
  const result = await db.transaction(async (tx) => {
    const [p] = await tx.insert(projetos).values({ ...rest }).returning();
    if (!p) throw new ApiError(500, "Falha ao criar projeto");
    let ms: ProjetoMembro[] = [];
    if (membros && membros.length) {
      ms = await tx.insert(projetoMembros)
        .values(membros.map((m) => ({ projetoId: p.id, nome: m.nome, tipo: m.tipo })))
        .returning();
    }
    return out(p, ms);
  });
  res.status(201).json(result);
});

// PUT /api/projetos/:id  (se "membros" vier, substitui todo o conjunto)
r.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { membros, ...rest } = projetoUpdate.parse(req.body);
  const result = await db.transaction(async (tx) => {
    const [p] = await tx.update(projetos).set({ ...rest }).where(eq(projetos.id, id)).returning();
    if (!p) throw naoEncontrado("Projeto não encontrado");
    let ms: ProjetoMembro[];
    if (membros !== undefined) {
      await tx.delete(projetoMembros).where(eq(projetoMembros.projetoId, id));
      ms = membros.length
        ? await tx.insert(projetoMembros)
            .values(membros.map((m) => ({ projetoId: id, nome: m.nome, tipo: m.tipo })))
            .returning()
        : [];
    } else {
      ms = await tx.select().from(projetoMembros).where(eq(projetoMembros.projetoId, id));
    }
    return out(p, ms);
  });
  res.json(result);
});

// DELETE /api/projetos/:id  (os membros caem por cascade)
r.delete("/:id", async (req, res) => {
  const [p] = await db.delete(projetos).where(eq(projetos.id, Number(req.params.id))).returning();
  if (!p) throw naoEncontrado("Projeto não encontrado");
  res.status(204).send();
});

export default r;