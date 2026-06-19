/** CRUD de funcionários. */
import { and, eq, type SQL } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { funcionarios, type Funcionario } from "../db/schema";
import { ApiError, naoEncontrado } from "../http";
import { funcionarioCreate, funcionarioQuery, funcionarioUpdate } from "../schemas";

const r = Router();

const out = (f: Funcionario) => ({
  ...f,
  salario: f.salario == null ? null : Number(f.salario),
});

// GET /api/funcionarios?setor=&status=
r.get("/", async (req, res) => {
  const q = funcionarioQuery.parse(req.query);
  const conds: SQL[] = [];
  if (q.setor && q.setor !== "todos") conds.push(eq(funcionarios.setor, q.setor));
  if (q.status && q.status !== "todos") conds.push(eq(funcionarios.status, q.status));
  const rows = await db
    .select().from(funcionarios)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(funcionarios.nome);
  res.json(rows.map(out));
});

// GET /api/funcionarios/:id
r.get("/:id", async (req, res) => {
  const [row] = await db.select().from(funcionarios)
    .where(eq(funcionarios.id, Number(req.params.id))).limit(1);
  if (!row) throw naoEncontrado("Funcionário não encontrado");
  res.json(out(row));
});

// POST /api/funcionarios
r.post("/", async (req, res) => {
  const { salario, email, ...rest } = funcionarioCreate.parse(req.body);
  const [row] = await db.insert(funcionarios).values({
    ...rest,
    email: email === "" ? null : email,
    ...(salario !== undefined ? { salario: String(salario) } : {}),
  }).returning();
  if (!row) throw new ApiError(500, "Falha ao criar funcionário");
  res.status(201).json(out(row));
});

// PUT /api/funcionarios/:id
r.put("/:id", async (req, res) => {
  const { salario, email, ...rest } = funcionarioUpdate.parse(req.body);
  const values: Partial<typeof funcionarios.$inferInsert> = { ...rest };
  if (salario !== undefined) values.salario = String(salario);
  if (email !== undefined) values.email = email === "" ? null : email;
  const [row] = await db.update(funcionarios).set(values)
    .where(eq(funcionarios.id, Number(req.params.id))).returning();
  if (!row) throw naoEncontrado("Funcionário não encontrado");
  res.json(out(row));
});

// DELETE /api/funcionarios/:id
r.delete("/:id", async (req, res) => {
  const [row] = await db.delete(funcionarios)
    .where(eq(funcionarios.id, Number(req.params.id))).returning();
  if (!row) throw naoEncontrado("Funcionário não encontrado");
  res.status(204).send();
});

export default r;