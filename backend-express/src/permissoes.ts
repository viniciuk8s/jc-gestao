/** Autorização por papel (role). O papel vem do app_metadata do JWT do Supabase,
 *  que NÃO é editável pelo próprio usuário (diferente do user_metadata). */
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "./http";

/** Lê o papel do usuário a partir do JWT. Padrão: "viewer". */
export function papelDoUsuario(req: Request): string {
  const claims = (((req as any).user && (req as any).user.claims) || {}) as Record<string, unknown>;
  const meta = (claims["app_metadata"] || {}) as Record<string, unknown>;
  const papel = meta["role"];
  return typeof papel === "string" ? papel : "viewer";
}

export function ehAdmin(req: Request): boolean {
  return papelDoUsuario(req) === "admin";
}

/** Gate de escrita: leitura (GET/HEAD/OPTIONS) liberada a qualquer autenticado;
 *  qualquer alteração (POST/PUT/PATCH/DELETE) exige papel "admin". */
export function gateEscrita(req: Request, _res: Response, next: NextFunction): void {
  const m = req.method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") { next(); return; }
  if (ehAdmin(req)) { next(); return; }
  next(new ApiError(403, "Seu perfil tem permissão apenas de visualização."));
}