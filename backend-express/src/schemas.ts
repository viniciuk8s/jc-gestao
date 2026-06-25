/** Validação de entrada com zod (espelha os schemas Pydantic do backend Python).
 *  Cada recurso tem um schema de criação e um de atualização (parcial).
 *  z.infer dá os tipos de entrada usados pelos routers.
 */
import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD");
const compStr = z.string().regex(/^\d{4}-\d{2}$/, "Competência deve estar no formato AAAA-MM");
const money = z.coerce.number({ invalid_type_error: "Valor inválido" })
  .nonnegative("Valor não pode ser negativo");

// Paginação opcional (retrocompatível): sem limit, retorna tudo como antes.
const limit = z.coerce.number().int().positive().max(1000).optional();
const offset = z.coerce.number().int().nonnegative().optional();

// ---------- Funcionários ----------
export const funcionarioCreate = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(120),
  funcao: z.string().max(120).nullish(),
  setor: z.enum(["Elétrica", "Solar", "Administrativo", "Comercial"]).nullish(),
  contrato: z.enum(["CLT", "PJ", "Temporário"]).nullish(),
  admissao: dateStr.nullish(),
  salario: money.optional(),
  status: z.enum(["ativo", "ferias", "afastado", "inativo"]).optional(),
  email: z.union([z.string().email("E-mail inválido").max(160), z.literal("")]).nullish(),
  telefone: z.string().max(40).nullish(),
  foto: z.string().nullish(),                  // URL ou dataURL (sem validação estrita)
  cpf: z.string().max(20).nullish(),
  nascimento: dateStr.nullish(),
  endereco: z.string().max(200).nullish(),
});
export const funcionarioUpdate = funcionarioCreate.partial();
export const funcionarioQuery = z.object({
  setor: z.string().optional(),
  status: z.string().optional(),
  limit, offset,
});

// ---------- Lançamentos (fluxo de caixa) ----------
export const lancamentoCreate = z.object({
  data: dateStr,
  descricao: z.string().trim().min(1, "Descrição é obrigatória").max(200),
  categoria: z.string().max(80).nullish(),
  forma: z.string().max(40).nullish(),
  tipo: z.enum(["entrada", "saida"], { message: "Tipo deve ser entrada ou saida" }),
  status: z.enum(["pago", "pendente", "agendado"]).optional(),
  valor: money,
});
export const lancamentoUpdate = lancamentoCreate.partial();
export const lancamentoQuery = z.object({
  tipo: z.enum(["entrada", "saida"]).optional(),
  status: z.string().optional(),
  dias: z.coerce.number().int().positive().optional(),
  limit, offset,
});

// ---------- Projetos (com membros) ----------
export const projetoMembroInput = z.object({
  nome: z.string().trim().min(1).max(120),
  tipo: z.enum(["funcionario", "terceiro"]).optional(),
});
export const projetoCreate = z.object({
  nome: z.string().trim().min(1, "Nome do projeto é obrigatório").max(160),
  cliente: z.string().max(120).nullish(),
  setor: z.string().max(60).nullish(),
  status: z.enum(["planejamento", "andamento", "revisao", "concluido"]).optional(),
  prioridade: z.enum(["alta", "media", "baixa"]).optional(),
  entrega: dateStr.nullish(),
  progresso: z.coerce.number().int().min(0).max(100).optional(),
  descricao: z.string().nullish(),
  membros: z.array(projetoMembroInput).optional(),
});
export const projetoUpdate = projetoCreate.partial();

// ---------- Agendamentos ----------
export const agendamentoCreate = z.object({
  data: dateStr,
  servico: z.string().trim().min(1, "Serviço é obrigatório").max(160),
  cliente: z.string().max(120).nullish(),
  horario: z.string().max(10).nullish(),
  valor: money.optional(),
  status: z.enum(["confirmado", "pendente", "cancelado", "concluido"]).optional(),
  obs: z.string().nullish(),
});
export const agendamentoUpdate = agendamentoCreate.partial();
export const agendamentoQuery = z.object({
  de: dateStr.optional(),
  ate: dateStr.optional(),
  status: z.string().optional(),
  limit, offset,
});

// ---------- Pagamentos ----------
export const pagamentoCreate = z.object({
  funcionarioId: z.coerce.number({ invalid_type_error: "Funcionário inválido" }).int().positive(),
  tipo: z.string().max(40).nullish(),
  forma: z.string().max(40).nullish(),
  data: dateStr,
  competencia: compStr.nullish(),
  valor: money.optional(),
  obs: z.string().nullish(),
});
export const pagamentoUpdate = pagamentoCreate.partial();
export const pagamentoQuery = z.object({
  funcionario_id: z.coerce.number().int().positive().optional(),
  competencia: z.string().optional(),
  limit, offset,
});

// ---------- Jornadas (registro de trabalho) ----------
const timeStr = z.string().regex(/^\d{1,2}:\d{2}$/, "Horário deve ser HH:MM");
export const jornadaCreate = z.object({
  funcionarioId: z.coerce.number({ invalid_type_error: "Funcionário inválido" }).int().positive(),
  data: dateStr,
  entrada: timeStr.nullish(),
  saida: timeStr.nullish(),
  atividade: z.string().trim().max(500).nullish(),
  despesa: money.optional(),
  despesaDesc: z.string().max(160).nullish(),
});
export const jornadaUpdate = jornadaCreate.partial();
export const jornadaQuery = z.object({
  funcionario_id: z.coerce.number().int().positive().optional(),
  de: dateStr.optional(),
  ate: dateStr.optional(),
  limit, offset,
});

// ---------- Clientes ----------
export const clienteCreate = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(120),
  tipo: z.enum(["pessoa", "empresa"]).optional(),
  documento: z.string().max(20).nullish(),
  email: z.union([z.string().email("E-mail inválido").max(160), z.literal("")]).nullish(),
  telefone: z.string().max(40).nullish(),
  endereco: z.string().max(200).nullish(),
  cidade: z.string().max(80).nullish(),
  obs: z.string().nullish(),
  status: z.enum(["ativo", "inativo"]).optional(),
});
export const clienteUpdate = clienteCreate.partial();
export const clienteQuery = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  limit, offset,
});
export type ClienteInput = z.infer<typeof clienteCreate>;

// Tipos de entrada
export type FuncionarioInput = z.infer<typeof funcionarioCreate>;
export type JornadaInput = z.infer<typeof jornadaCreate>;
export type LancamentoInput = z.infer<typeof lancamentoCreate>;
export type ProjetoInput = z.infer<typeof projetoCreate>;
export type AgendamentoInput = z.infer<typeof agendamentoCreate>;
export type PagamentoInput = z.infer<typeof pagamentoCreate>;
