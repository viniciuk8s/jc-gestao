/** Relatórios: agregações financeiras, folha e projetos (somente leitura). */
import { and, avg, count, eq, gte, lt, lte, ne, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { funcionarios, lancamentos, pagamentos, projetos } from "../db/schema";
import { fimMes, hoje, inicioMes, MESES, somaMeses, ymd } from "../dates";

const r = Router();
const r2 = (n: number) => Math.round(n * 100) / 100;
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD");

async function somaLanc(tipo: "entrada" | "saida", pago: boolean, de: string, ate: string): Promise<number> {
  const [row] = await db.select({ s: sql<string>`coalesce(sum(${lancamentos.valor}), 0)` })
    .from(lancamentos)
    .where(and(
      eq(lancamentos.tipo, tipo),
      pago ? eq(lancamentos.status, "pago") : ne(lancamentos.status, "pago"),
      gte(lancamentos.data, de), lte(lancamentos.data, ate),
    ));
  return Number(row?.s ?? 0);
}

// GET /api/relatorios/resumo?de=&ate=
r.get("/resumo", async (req, res) => {
  const q = z.object({ de: dateStr.optional(), ate: dateStr.optional() }).parse(req.query);
  const t = hoje();
  const de = q.de ?? ymd(inicioMes(t));
  const ate = q.ate ?? ymd(fimMes(t));

  const entradas = await somaLanc("entrada", true, de, ate);
  const saidas = await somaLanc("saida", true, de, ate);
  const aReceber = await somaLanc("entrada", false, de, ate);
  const aPagar = await somaLanc("saida", false, de, ate);

  const rows = await db.select({
    categoria: lancamentos.categoria, tipo: lancamentos.tipo,
    total: sql<string>`coalesce(sum(${lancamentos.valor}), 0)`,
  }).from(lancamentos)
    .where(and(eq(lancamentos.status, "pago"), gte(lancamentos.data, de), lte(lancamentos.data, ate)))
    .groupBy(lancamentos.categoria, lancamentos.tipo);

  res.json({
    de, ate,
    entradas: r2(entradas), saidas: r2(saidas), saldo: r2(entradas - saidas),
    a_receber: r2(aReceber), a_pagar: r2(aPagar),
    por_categoria: rows.map((c) => ({ categoria: c.categoria, tipo: c.tipo, total: r2(Number(c.total)) })),
  });
});

// GET /api/relatorios/fluxo-mensal?meses=12
r.get("/fluxo-mensal", async (req, res) => {
  const { meses = 12 } = z.object({ meses: z.coerce.number().int().optional() }).parse(req.query);
  const n = Math.max(1, Math.min(meses, 36));
  const t = hoje();
  const out: { mes: string; ano: number; entradas: number; saidas: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const ms = somaMeses(t, -i);
    const me = somaMeses(t, -i + 1);
    const soma = async (tipo: "entrada" | "saida") => {
      const [row] = await db.select({ s: sql<string>`coalesce(sum(${lancamentos.valor}), 0)` })
        .from(lancamentos).where(and(
          eq(lancamentos.tipo, tipo), eq(lancamentos.status, "pago"),
          gte(lancamentos.data, ymd(ms)), lt(lancamentos.data, ymd(me)),
        ));
      return Number(row?.s ?? 0);
    };
    out.push({ mes: MESES[ms.getUTCMonth()] ?? "", ano: ms.getUTCFullYear(),
               entradas: r2(await soma("entrada")), saidas: r2(await soma("saida")) });
  }
  res.json(out);
});

// GET /api/relatorios/folha?competencia=AAAA-MM
r.get("/folha", async (req, res) => {
  const q = z.object({ competencia: z.string().regex(/^\d{4}-\d{2}$/, "Competência deve ser AAAA-MM").optional() }).parse(req.query);
  const t = hoje();
  const competencia = q.competencia ?? `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;

  const rows = await db.select({
    funcionario_id: pagamentos.funcionarioId, funcionario: funcionarios.nome,
    total: sql<string>`coalesce(sum(${pagamentos.valor}), 0)`,
  }).from(pagamentos)
    .leftJoin(funcionarios, eq(funcionarios.id, pagamentos.funcionarioId))
    .where(eq(pagamentos.competencia, competencia))
    .groupBy(pagamentos.funcionarioId, funcionarios.nome);

  const itens = rows.map((i) => ({ funcionario_id: i.funcionario_id, funcionario: i.funcionario, total: r2(Number(i.total)) }));
  res.json({ competencia, total: r2(itens.reduce((s, i) => s + i.total, 0)), itens });
});

// GET /api/relatorios/projetos
r.get("/projetos", async (_req, res) => {
  const statusRows = await db.select({ k: projetos.status, c: count() }).from(projetos).groupBy(projetos.status);
  const setorRows = await db.select({ k: projetos.setor, c: count() }).from(projetos).groupBy(projetos.setor);
  const [tot] = await db.select({ c: count() }).from(projetos);
  const [atv] = await db.select({ c: count() }).from(projetos).where(ne(projetos.status, "concluido"));
  const [med] = await db.select({ a: sql<string>`coalesce(${avg(projetos.progresso)}, 0)` }).from(projetos);

  const porStatus: Record<string, number> = {};
  for (const s of statusRows) if (s.k) porStatus[s.k] = s.c;
  const porSetor: Record<string, number> = {};
  for (const s of setorRows) if (s.k) porSetor[s.k] = s.c;

  res.json({
    total: tot?.c ?? 0, ativos: atv?.c ?? 0,
    por_status: porStatus, por_setor: porSetor,
    progresso_medio: Math.round(Number(med?.a ?? 0) * 10) / 10,
  });
});

export default r;