/** Cria/limpa e popula dados de exemplo realistas.
 *  Pré-requisito: tabelas já criadas (npm run db:push).
 *  Uso: npm run seed
 *  As datas são relativas a HOJE, para o dashboard mostrar sempre o mês corrente.
 */
import { hoje, inicioMes, somaDias, somaMeses, ymd } from "../dates";
import { db } from "./client";
import {
  agendamentos, funcionarios, lancamentos, pagamentos, projetoMembros, projetos,
} from "./schema";

async function run() {
  // limpa na ordem das dependências (FK)
  await db.delete(projetoMembros);
  await db.delete(pagamentos);
  await db.delete(agendamentos);
  await db.delete(lancamentos);
  await db.delete(projetos);
  await db.delete(funcionarios);

  const t = hoje();
  const mStart = inicioMes(t);
  const comp = ymd(mStart).slice(0, 7); // AAAA-MM
  const dia = (n: number) => {
    const d = new Date(Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth(), n));
    return d.getUTCMonth() === mStart.getUTCMonth() ? ymd(d) : ymd(mStart);
  };

  // ---- Funcionários ----
  const funcs = await db.insert(funcionarios).values([
    { nome: "Maria Souza", funcao: "Engenheira eletricista", setor: "Elétrica", contrato: "CLT",
      admissao: "2023-02-10", salario: "8200", status: "ativo", email: "maria.souza@jcsolar.com", telefone: "(84) 99999-0001" },
    { nome: "Carlos Lima", funcao: "Técnico em energia solar", setor: "Solar", contrato: "CLT",
      admissao: "2024-06-01", salario: "3800", status: "ativo", email: "carlos.lima@jcsolar.com", telefone: "(84) 99999-0002" },
    { nome: "João Pedro", funcao: "Eletricista", setor: "Elétrica", contrato: "CLT",
      admissao: "2022-09-15", salario: "3200", status: "ferias", email: "joao.pedro@jcsolar.com", telefone: "(84) 99999-0003" },
    { nome: "Ana Beatriz", funcao: "Vendedora", setor: "Comercial", contrato: "PJ",
      admissao: "2025-01-20", salario: "2800", status: "ativo", email: "ana.beatriz@jcsolar.com", telefone: "(84) 99999-0004" },
    { nome: "Rafael Gomes", funcao: "Auxiliar técnico", setor: "Solar", contrato: "Temporário",
      admissao: "2026-03-05", salario: "1900", status: "ativo", email: "rafael.gomes@jcsolar.com", telefone: "(84) 99999-0005" },
    { nome: "Patrícia Nunes", funcao: "Analista financeiro", setor: "Administrativo", contrato: "CLT",
      admissao: "2021-11-02", salario: "4500", status: "afastado", email: "patricia.nunes@jcsolar.com", telefone: "(84) 99999-0006" },
  ]).returning();

  // ---- Lançamentos ----
  const receitasMensais = [42000, 51000, 47500, 63000, 58000, 71000, 78400]; // 6 meses atrás -> mês atual
  const lanc: (typeof lancamentos.$inferInsert)[] = receitasMensais.map((total, i) => {
    const ms = somaMeses(t, -(6 - i));
    return {
      data: ymd(new Date(Date.UTC(ms.getUTCFullYear(), ms.getUTCMonth(), 10))),
      descricao: "Faturamento de serviços", categoria: "Serviços", forma: "Transferência",
      tipo: "entrada", status: "pago", valor: `${total}.00`,
    };
  });
  lanc.push(
    { data: dia(3), descricao: "Instalação solar — Cond. Vila Verde", categoria: "Instalação solar", forma: "Pix", tipo: "entrada", status: "pago", valor: "12500" },
    { data: dia(5), descricao: "Compra de cabos e disjuntores", categoria: "Fornecedores", forma: "Boleto", tipo: "saida", status: "pago", valor: "4200" },
    { data: dia(8), descricao: "Manutenção elétrica — Mercado São José", categoria: "Serviços", forma: "Transferência", tipo: "entrada", status: "pago", valor: "1850" },
    { data: dia(7), descricao: "Folha de pagamento — equipe", categoria: "Folha de pagamento", forma: "Transferência", tipo: "saida", status: "pago", valor: "9800" },
    { data: dia(2), descricao: "Projeto fotovoltaico — Padaria", categoria: "Instalação solar", forma: "Boleto", tipo: "entrada", status: "pendente", valor: "7600" },
    { data: dia(14), descricao: "Vistoria de geração — Aldeota", categoria: "Serviços", forma: "Pix", tipo: "entrada", status: "agendado", valor: "900" },
  );
  await db.insert(lancamentos).values(lanc);

  // ---- Projetos ----
  const projs = await db.insert(projetos).values([
    { nome: "Usina solar — Galpão Industrial", cliente: "Indústria Norte", setor: "Solar", status: "andamento", prioridade: "alta", entrega: ymd(somaDias(t, 20)), progresso: 60, descricao: "Instalação de 120 painéis." },
    { nome: "Reforma elétrica — Edifício Aurora", cliente: "Cond. Aurora", setor: "Elétrica", status: "andamento", prioridade: "media", entrega: ymd(somaDias(t, 12)), progresso: 35 },
    { nome: "Projeto fotovoltaico — Padaria Pão Quente", cliente: "Pão Quente", setor: "Solar", status: "planejamento", prioridade: "media", entrega: ymd(somaDias(t, 40)), progresso: 10 },
    { nome: "Quadro de distribuição — Residência Aldeota", cliente: "Família Castro", setor: "Elétrica", status: "revisao", prioridade: "baixa", entrega: ymd(somaDias(t, 5)), progresso: 85 },
    { nome: "Manutenção preventiva — Mercado São José", cliente: "Mercado São José", setor: "Elétrica", status: "concluido", prioridade: "media", entrega: ymd(somaDias(t, -8)), progresso: 100 },
  ]).returning();

  await db.insert(projetoMembros).values([
    { projetoId: projs[0]!.id, nome: "Carlos Lima", tipo: "funcionario" },
    { projetoId: projs[0]!.id, nome: "Rafael Gomes", tipo: "funcionario" },
    { projetoId: projs[0]!.id, nome: "Elétrica Sul (parceira)", tipo: "terceiro" },
    { projetoId: projs[1]!.id, nome: "Maria Souza", tipo: "funcionario" },
  ]);

  // ---- Agendamentos ----
  await db.insert(agendamentos).values([
    { data: ymd(t), servico: "Instalação de painéis solares", cliente: "Condomínio Vila Verde", horario: "09:00", valor: "12500", status: "confirmado" },
    { data: ymd(t), servico: "Vistoria de geração solar", cliente: "Padaria Pão Quente", horario: "14:00", valor: "900", status: "confirmado" },
    { data: ymd(somaDias(t, 1)), servico: "Manutenção elétrica predial", cliente: "Mercado São José", horario: "10:30", valor: "1850", status: "pendente" },
    { data: ymd(somaDias(t, 2)), servico: "Troca de quadro de distribuição", cliente: "Residência Aldeota", horario: "08:00", valor: "2300", status: "confirmado" },
    { data: ymd(somaDias(t, 4)), servico: "Orçamento fotovoltaico", cliente: "Indústria Norte", horario: "16:00", valor: "0", status: "confirmado" },
  ]);

  // ---- Pagamentos ----
  await db.insert(pagamentos).values([
    { funcionarioId: funcs[0]!.id, tipo: "Salário", forma: "Transferência", data: dia(5), competencia: comp, valor: "8200" },
    { funcionarioId: funcs[1]!.id, tipo: "Salário", forma: "Transferência", data: dia(5), competencia: comp, valor: "3800" },
    { funcionarioId: funcs[3]!.id, tipo: "Comissão", forma: "Pix", data: dia(6), competencia: comp, valor: "950", obs: "Meta de vendas atingida" },
  ]);

  console.log(`Seed concluído: ${funcs.length} funcionários, ${lanc.length} lançamentos, ${projs.length} projetos, 5 agendamentos, 3 pagamentos.`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => { console.error("Falha no seed:", e); process.exit(1); });