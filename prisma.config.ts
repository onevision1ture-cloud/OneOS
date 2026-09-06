import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

/**
 * Supabase entrega duas strings de conexão:
 *  - DATABASE_URL  → pooler (porta 6543), usada pelo app em runtime
 *  - DIRECT_URL    → conexão direta (porta 5432), exigida pelas migrations
 * Se DIRECT_URL não existir, caímos de volta na DATABASE_URL.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // A CLI (migrate/seed/studio) usa a conexão direta quando ela existe:
    // o pooler em modo transaction não suporta os comandos de migration.
    url: process.env.DIRECT_URL ? env("DIRECT_URL") : env("DATABASE_URL"),
  },
});
