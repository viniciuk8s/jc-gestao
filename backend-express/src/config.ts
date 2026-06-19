/** Configuração lida de variáveis de ambiente (.env). */
import "dotenv/config";

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  // URL do projeto Supabase — usada para descobrir as chaves públicas (JWKS).
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  // Segredo HS256 (só projetos antigos). Projeto novo é assimétrico (JWKS).
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? "",
  jwtAud: process.env.JWT_AUD ?? "authenticated",
  allowedOrigins: process.env.ALLOWED_ORIGINS ?? "*",
  port: Number(process.env.PORT ?? 8000),
};

/** "*" ou lista de origens para o CORS. */
export function originsList(): string | string[] {
  const v = config.allowedOrigins.trim();
  if (v === "*") return "*";
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}
