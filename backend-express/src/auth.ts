/** Autenticação: valida o JWT de login emitido pelo Supabase.
 *
 * Projetos novos (out/2025+) assinam o token com chaves ASSIMÉTRICAS (RS256/ES256)
 * — verificamos pela chave pública publicada no JWKS do projeto.
 * Projetos antigos assinam com segredo compartilhado (HS256) — usamos
 * SUPABASE_JWT_SECRET nesse caso.
 */
import type { NextFunction, Request, Response } from "express";
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  jwtVerify,
  type JWTPayload,
} from "jose";
import { config } from "./config";

export interface CurrentUser {
  id: string;
  email?: string;
  claims: JWTPayload;
}

// Adiciona `req.user` ao tipo do Express.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: CurrentUser;
    }
  }
}

// Conjunto de chaves públicas do projeto (jose cuida do cache e da rotação).
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    if (!config.supabaseUrl) {
      throw new Error("SUPABASE_URL não configurado (necessário para o JWKS)");
    }
    const base = config.supabaseUrl.replace(/\/$/, "");
    jwks = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

function unauthorized(res: Response): void {
  res.status(401).json({ detail: "Token inválido ou expirado" });
}

/** Middleware: exige um Bearer token válido e popula req.user. */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    unauthorized(res);
    return;
  }

  try {
    const { alg } = decodeProtectedHeader(token);
    let payload: JWTPayload;

    if (alg === "HS256") {
      if (!config.supabaseJwtSecret) {
        throw new Error("Token HS256 mas SUPABASE_JWT_SECRET não configurado");
      }
      const secret = new TextEncoder().encode(config.supabaseJwtSecret);
      ({ payload } = await jwtVerify(token, secret, { audience: config.jwtAud }));
    } else {
      ({ payload } = await jwtVerify(token, getJwks(), { audience: config.jwtAud }));
    }

    if (!payload.sub) {
      unauthorized(res);
      return;
    }

    req.user = {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      claims: payload,
    };
    next();
  } catch {
    unauthorized(res);
  }
}