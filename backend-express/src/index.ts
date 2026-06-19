/** Servidor Express — JC Elétrica & Solar. */
import cors from "cors";
import express from "express";
import { requireAuth } from "./auth";
import { config, originsList } from "./config";
import { errorHandler, notFound } from "./http";
import agendamentosRouter from "./routers/agendamentos";
import dashboardRouter from "./routers/dashboard";
import funcionariosRouter from "./routers/funcionarios";
import lancamentosRouter from "./routers/lancamentos";
import pagamentosRouter from "./routers/pagamentos";
import projetosRouter from "./routers/projetos";
import relatoriosRouter from "./routers/relatorios";

const app = express();

app.use(express.json());
app.use(cors({ origin: originsList(), credentials: false }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Rotas da API — todas exigem autenticação.
app.use("/api/funcionarios", requireAuth, funcionariosRouter);
app.use("/api/lancamentos", requireAuth, lancamentosRouter);
app.use("/api/agendamentos", requireAuth, agendamentosRouter);
app.use("/api/projetos", requireAuth, projetosRouter);
app.use("/api/pagamentos", requireAuth, pagamentosRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/relatorios", requireAuth, relatoriosRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API ouvindo na porta ${config.port}`);
});