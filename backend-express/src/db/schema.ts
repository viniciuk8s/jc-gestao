/** Schema do banco (Drizzle ORM). Os tipos das tabelas são inferidos daqui. */
import {
  pgTable, serial, varchar, text, numeric, date, timestamp, integer,
} from "drizzle-orm/pg-core";

export const funcionarios = pgTable("funcionarios", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 120 }).notNull(),
  funcao: varchar("funcao", { length: 120 }),
  setor: varchar("setor", { length: 60 }),                 // Elétrica | Solar | Administrativo | Comercial
  contrato: varchar("contrato", { length: 40 }),           // CLT | PJ | Temporário
  admissao: date("admissao", { mode: "string" }),
  salario: numeric("salario", { precision: 12, scale: 2 }).default("0"),
  status: varchar("status", { length: 20 }).default("ativo"), // ativo | ferias | afastado | inativo
  email: varchar("email", { length: 160 }),
  telefone: varchar("telefone", { length: 40 }),
  foto: text("foto"),                                      // URL pública (Storage) ou dataURL
  cpf: varchar("cpf", { length: 20 }),                     // '000.000.000-00'
  nascimento: date("nascimento", { mode: "string" }),
  endereco: varchar("endereco", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientes = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 120 }).notNull(),
  tipo: varchar("tipo", { length: 12 }).default("pessoa"),     // pessoa | empresa
  documento: varchar("documento", { length: 20 }),             // CPF ou CNPJ
  email: varchar("email", { length: 160 }),
  telefone: varchar("telefone", { length: 40 }),
  endereco: varchar("endereco", { length: 200 }),
  cidade: varchar("cidade", { length: 80 }),
  obs: text("obs"),
  status: varchar("status", { length: 20 }).default("ativo"),  // ativo | inativo
  createdAt: timestamp("created_at").defaultNow(),
});

export const lancamentos = pgTable("lancamentos", {
  id: serial("id").primaryKey(),
  data: date("data", { mode: "string" }).notNull(),
  descricao: varchar("descricao", { length: 200 }).notNull(),
  categoria: varchar("categoria", { length: 80 }),
  forma: varchar("forma", { length: 40 }),                 // Pix | Dinheiro | Cartão | ...
  tipo: varchar("tipo", { length: 10 }).notNull(),         // entrada | saida
  status: varchar("status", { length: 12 }).default("pago"), // pago | pendente | agendado
  valor: numeric("valor", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projetos = pgTable("projetos", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 160 }).notNull(),
  cliente: varchar("cliente", { length: 120 }),
  clienteId: integer("cliente_id").references(() => clientes.id, { onDelete: "set null" }),
  setor: varchar("setor", { length: 60 }),
  status: varchar("status", { length: 20 }).default("planejamento"), // planejamento | andamento | revisao | concluido
  prioridade: varchar("prioridade", { length: 10 }).default("media"), // alta | media | baixa
  entrega: date("entrega", { mode: "string" }),
  progresso: integer("progresso").default(0),
  descricao: text("descricao"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projetoMembros = pgTable("projeto_membros", {
  id: serial("id").primaryKey(),
  projetoId: integer("projeto_id")
    .notNull()
    .references(() => projetos.id, { onDelete: "cascade" }),
  nome: varchar("nome", { length: 120 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).default("funcionario"), // funcionario | terceiro
});

export const agendamentos = pgTable("agendamentos", {
  id: serial("id").primaryKey(),
  data: date("data", { mode: "string" }).notNull(),
  servico: varchar("servico", { length: 160 }).notNull(),
  cliente: varchar("cliente", { length: 120 }),
  clienteId: integer("cliente_id").references(() => clientes.id, { onDelete: "set null" }),
  horario: varchar("horario", { length: 10 }),
  valor: numeric("valor", { precision: 12, scale: 2 }).default("0"),
  status: varchar("status", { length: 12 }).default("confirmado"), // confirmado | pendente | cancelado
  obs: text("obs"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agendamentoMembros = pgTable("agendamento_membros", {
  id: serial("id").primaryKey(),
  agendamentoId: integer("agendamento_id")
    .notNull()
    .references(() => agendamentos.id, { onDelete: "cascade" }),
  nome: varchar("nome", { length: 120 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).default("funcionario"), // funcionario | terceiro
});

export const pagamentos = pgTable("pagamentos", {
  id: serial("id").primaryKey(),
  funcionarioId: integer("funcionario_id")
    .references(() => funcionarios.id, { onDelete: "set null" }),
  tipo: varchar("tipo", { length: 40 }),                   // Salário | Adiantamento | Bônus | ...
  forma: varchar("forma", { length: 40 }),
  data: date("data", { mode: "string" }).notNull(),
  competencia: varchar("competencia", { length: 7 }),      // 'AAAA-MM'
  valor: numeric("valor", { precision: 12, scale: 2 }).default("0"),
  obs: text("obs"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jornadas = pgTable("jornadas", {
  id: serial("id").primaryKey(),
  funcionarioId: integer("funcionario_id")
    .references(() => funcionarios.id, { onDelete: "set null" }),
  data: date("data", { mode: "string" }).notNull(),
  entrada: varchar("entrada", { length: 5 }),              // 'HH:MM'
  saida: varchar("saida", { length: 5 }),                  // 'HH:MM'
  atividade: text("atividade"),
  despesa: numeric("despesa", { precision: 12, scale: 2 }).default("0"),
  despesaDesc: varchar("despesa_desc", { length: 160 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tipos inferidos (linha lida / linha para inserir) — usados pelos routers.
export type Funcionario = typeof funcionarios.$inferSelect;
export type NovoFuncionario = typeof funcionarios.$inferInsert;
export type Cliente = typeof clientes.$inferSelect;
export type NovoCliente = typeof clientes.$inferInsert;
export type Lancamento = typeof lancamentos.$inferSelect;
export type NovoLancamento = typeof lancamentos.$inferInsert;
export type Projeto = typeof projetos.$inferSelect;
export type NovoProjeto = typeof projetos.$inferInsert;
export type ProjetoMembro = typeof projetoMembros.$inferSelect;
export type Agendamento = typeof agendamentos.$inferSelect;
export type NovoAgendamento = typeof agendamentos.$inferInsert;
export type AgendamentoMembro = typeof agendamentoMembros.$inferSelect;
export type NovoAgendamentoMembro = typeof agendamentoMembros.$inferInsert;
export type Pagamento = typeof pagamentos.$inferSelect;
export type NovoPagamento = typeof pagamentos.$inferInsert;
export type Jornada = typeof jornadas.$inferSelect;
export type NovaJornada = typeof jornadas.$inferInsert;
