/** Servidor Express — JC Elétrica & Solar. */
import cors from "cors";
import express from "express";
import { requireAuth } from "./auth";
import { gateEscrita } from "./permissoes";
import { config, originsList } from "./config";
import { errorHandler, notFound } from "./http";
import agendamentosRouter from "./routers/agendamentos";
import dashboardRouter from "./routers/dashboard";
import funcionariosRouter from "./routers/funcionarios";
import jornadasRouter from "./routers/jornadas";
import lancamentosRouter from "./routers/lancamentos";
import pagamentosRouter from "./routers/pagamentos";
import projetosRouter from "./routers/projetos";
import relatoriosRouter from "./routers/relatorios";
import clientesRouter from "./routers/clientes";

const app = express();

app.use(express.json());
app.use(cors({ origin: originsList(), credentials: false }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Autenticação + autorização (papéis) para TODA a API.
// Leitura (GET) liberada a qualquer usuário autenticado;
// escrita (POST/PUT/PATCH/DELETE) exige papel "admin" (CEO/TI).
app.use("/api", requireAuth, gateEscrita);

// Rotas da API.
app.use("/api/funcionarios", funcionariosRouter);
app.use("/api/lancamentos", lancamentosRouter);
app.use("/api/agendamentos", agendamentosRouter);
app.use("/api/projetos", projetosRouter);
app.use("/api/pagamentos", pagamentosRouter);
app.use("/api/jornadas", jornadasRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/relatorios", relatoriosRouter);
app.use("/api/clientes", clientesRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API ouvindo na porta ${config.port}`);
});
