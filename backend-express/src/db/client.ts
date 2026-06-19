/** Conexão com o Postgres (Supabase) via Drizzle + postgres.js. */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config";
import * as schema from "./schema";

const isLocal =
  config.databaseUrl.includes("localhost") || config.databaseUrl.includes("127.0.0.1");

// Supabase exige SSL; local não.
const queryClient = postgres(config.databaseUrl, {
  ssl: isLocal ? false : "require",
});

export const db = drizzle(queryClient, { schema });
