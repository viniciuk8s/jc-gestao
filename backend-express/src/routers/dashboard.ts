/** Dashboard: KPIs agregados a partir dos dados reais. */
import { and, asc, count, eq, gte, lt, ne, sql } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { agendamentos, lancamentos, projetos } from "../db/schema";
import { hoje, inicioMes, inicioSemana, MESES, somaDias, somaMeses, ymd } from "../dates";

const r = Router();
const r2 = (n: number) => Math.round(n * 100) / 100;

async function entradasPagas(start: string, end: string): Promise<number> {
  const [row] = await db
    .select({ s: sql<string>`coalesce(sum(${lancamentos.valor}), 0)` })
    .from(lancamentos)
    .where(and(
      eq(lancamentos.tipo, "entrada"), eq(lancamentos.status, "pago"),
      gte(lancamentos.data, start), lt(lancamentos.data, end),
    ));
  return Number(row?.s ?? 0);
}

// GET /api/dashboard
r.get("/", async (_req, res) => {
  const t = hoje();
  const mStart = inicioMes(t);
  const mEnd = somaMeses(t, 1);
  const prevStart = somaMeses(t, -1);

  const receitaMes = await entradasPagas(ymd(mStart), ymd(mEnd));
  const receitaPrev = await entradasPagas(ymd(prevStart), ymd(mStart));
  const delta = receitaPrev > 0
    ? Math.round(((receitaMes - receitaPrev) / receitaPrev) * 100 * 10) / 10
    : null;

  const [ar] = await db.select({ s: sql<string>`coalesce(sum(${lancamentos.valor}), 0)` })
    .from(lancamentos)
    .where(and(eq(lancamentos.tipo, "entrada"), ne(lancamentos.status, "pago")));
  const aReceber = Number(ar?.s ?? 0);

  const [emAtraso] = await db.select({ c: count() }).from(lancamentos)
    .where(and(eq(lancamentos.tipo, "entrada"), ne(lancamentos.status, "pago"), lt(lancamentos.data, ymd(t))));

  const wStart = inicioSemana(t);
  const wEnd = somaDias(wStart, 7);
  const [servSemana] = await db.select({ c: count() }).from(agendamentos)
    .where(and(gte(agendamentos.data, ymd(wStart)), lt(agendamentos.data, ymd(wEnd)), ne(agendamentos.status, "cancelado")));
  const [servHoje] = await db.select({ c: count() }).from(agendamentos)
    .where(and(eq(agendamentos.data, ymd(t)), ne(agendamentos.status, "cancelado")));

  const [projAtivos] = await db.select({ c: count() }).from(projetos).where(ne(projetos.status, "concluido"));
  const [projSolar] = await db.select({ c: count() }).from(projetos)
    .where(and(ne(projetos.status, "concluido"), eq(projetos.setor, "Solar")));

  const series: { mes: string; valor: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const ms = somaMeses(t, -i);
    series.push({ mes: MESES[ms.getUTCMonth()] ?? "", valor: r2(await entradasPagas(ymd(ms), ymd(somaMeses(t, -i + 1)))) });
  }

  const prox = await db.select().from(agendamentos)
    .where(and(gte(agendamentos.data, ymd(t)), ne(agendamentos.status, "cancelado")))
    .orderBy(asc(agendamentos.data), asc(agendamentos.horario)).limit(5);

  res.json({
    receita_mes: { valor: r2(receitaMes), delta_pct: delta, legenda: "vs. mês anterior" },
    servicos_semana: { valor: servSemana?.c ?? 0, legenda: `${servHoje?.c ?? 0} agendados hoje` },
    projetos_ativos: { valor: projAtivos?.c ?? 0, legenda: `${projSolar?.c ?? 0} em instalação solar` },
    a_receber: { valor: r2(aReceber), legenda: `${emAtraso?.c ?? 0} faturas em atraso` },
    receita_series: series,
    proximos_servicos: prox.map((a) => ({ data: a.data, servico: a.servico, cliente: a.cliente, status: a.status })),
  });
});

export default r;