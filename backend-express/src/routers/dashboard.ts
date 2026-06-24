/** Dashboard: KPIs agregados a partir dos dados reais.
 *  Otimizado: a série mensal sai em UMA query (date_trunc/group by) e os
 *  demais KPIs rodam em paralelo (Promise.all), em vez de ~15 idas ao banco
 *  em série. Reduz muito a latência no Render (cold start + RTT alto). */
import { and, asc, count, eq, gte, lt, ne, sql } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { agendamentos, lancamentos, projetos } from "../db/schema";
import { hoje, inicioMes, inicioSemana, MESES, somaDias, somaMeses, ymd } from "../dates";

const r = Router();
const r2 = (n: number) => Math.round(n * 100) / 100;
const ymKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

// GET /api/dashboard
r.get("/", async (_req, res) => {
  const t = hoje();
  const mStart = inicioMes(t);
  const mEnd = somaMeses(t, 1);
  const prevStart = somaMeses(t, -1);
  const todayStr = ymd(t);

  // Janela da série: mês atual + 6 anteriores.
  const serieStart = ymd(somaMeses(t, -6));
  const serieEnd = ymd(mEnd); // primeiro dia do próximo mês

  const wStart = inicioSemana(t);
  const wEnd = somaDias(wStart, 7);

  // (1) UMA query agrega as entradas pagas por mês — substitui as 7 queries
  // em série e ainda fornece receita do mês atual e do anterior.
  const serieRows = await db
    .select({
      ym: sql<string>`to_char(date_trunc('month', ${lancamentos.data}), 'YYYY-MM')`,
      s: sql<string>`coalesce(sum(${lancamentos.valor}), 0)`,
    })
    .from(lancamentos)
    .where(and(
      eq(lancamentos.tipo, "entrada"), eq(lancamentos.status, "pago"),
      gte(lancamentos.data, serieStart), lt(lancamentos.data, serieEnd),
    ))
    .groupBy(sql`date_trunc('month', ${lancamentos.data})`);

  const serieMap = new Map<string, number>();
  for (const row of serieRows) serieMap.set(row.ym, Number(row.s));

  // (2) KPIs independentes em paralelo.
  const [ar, emAtraso, servSemana, servHoje, projAtivos, projSolar, prox] = await Promise.all([
    db.select({ s: sql<string>`coalesce(sum(${lancamentos.valor}), 0)` }).from(lancamentos)
      .where(and(eq(lancamentos.tipo, "entrada"), ne(lancamentos.status, "pago"))),
    db.select({ c: count() }).from(lancamentos)
      .where(and(eq(lancamentos.tipo, "entrada"), ne(lancamentos.status, "pago"), lt(lancamentos.data, todayStr))),
    db.select({ c: count() }).from(agendamentos)
      .where(and(gte(agendamentos.data, ymd(wStart)), lt(agendamentos.data, ymd(wEnd)), ne(agendamentos.status, "cancelado"))),
    db.select({ c: count() }).from(agendamentos)
      .where(and(eq(agendamentos.data, todayStr), ne(agendamentos.status, "cancelado"))),
    db.select({ c: count() }).from(projetos).where(ne(projetos.status, "concluido")),
    db.select({ c: count() }).from(projetos)
      .where(and(ne(projetos.status, "concluido"), eq(projetos.setor, "Solar"))),
    db.select().from(agendamentos)
      .where(and(gte(agendamentos.data, todayStr), ne(agendamentos.status, "cancelado")))
      .orderBy(asc(agendamentos.data), asc(agendamentos.horario)).limit(5),
  ]);

  const receitaMes = serieMap.get(ymKey(mStart)) ?? 0;
  const receitaPrev = serieMap.get(ymKey(prevStart)) ?? 0;
  const delta = receitaPrev > 0
    ? Math.round(((receitaMes - receitaPrev) / receitaPrev) * 100 * 10) / 10
    : null;
  const aReceber = Number(ar[0]?.s ?? 0);

  const series: { mes: string; valor: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const ms = somaMeses(t, -i);
    series.push({ mes: MESES[ms.getUTCMonth()] ?? "", valor: r2(serieMap.get(ymKey(ms)) ?? 0) });
  }

  res.json({
    receita_mes: { valor: r2(receitaMes), delta_pct: delta, legenda: "vs. mês anterior" },
    servicos_semana: { valor: servSemana[0]?.c ?? 0, legenda: `${servHoje[0]?.c ?? 0} agendados hoje` },
    projetos_ativos: { valor: projAtivos[0]?.c ?? 0, legenda: `${projSolar[0]?.c ?? 0} em instalação solar` },
    a_receber: { valor: r2(aReceber), legenda: `${emAtraso[0]?.c ?? 0} faturas em atraso` },
    receita_series: series,
    proximos_servicos: prox.map((a) => ({ data: a.data, servico: a.servico, cliente: a.cliente, status: a.status })),
  });
});

export default r;