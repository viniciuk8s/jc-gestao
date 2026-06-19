/** Erros da API e tratamento central de erros (incl. erros de validação do zod). */
import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodSchema } from "zod";

/** Erro com status HTTP explícito (ex.: 404, 409). */
export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
    this.name = "ApiError";
  }
}

export const naoEncontrado = (msg = "Recurso não encontrado") => new ApiError(404, msg);

/** Valida e já devolve o dado tipado. Lança ZodError em caso de erro
 *  (o Express 5 encaminha para o errorHandler). */
export function parse<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/** 404 para rotas não mapeadas. */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ detail: "Rota não encontrada" });
}

/** Tratador central — padroniza a resposta de erro. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      detail: "Dados inválidos",
      erros: err.issues.map((i) => ({ campo: i.path.join("."), msg: i.message })),
    });
    return;
  }
  if (err instanceof ApiError) {
    res.status(err.status).json({ detail: err.detail });
    return;
  }
  console.error("Erro não tratado:", err);
  res.status(500).json({ detail: "Erro interno do servidor" });
}