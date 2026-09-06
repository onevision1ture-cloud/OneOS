import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Conexão usada pelos comandos da CLI (db push, migrate, seed, studio).
 *
 * `DIRECT_URL` tem prioridade: em bancos com pooler (Supabase, Neon), o modo
 * transaction não aceita os comandos de migration, e a conexão direta sim.
 *
 * A leitura é feita aqui, e não com o helper `env()` do Prisma, porque aquele
 * exige a variável no momento em que o arquivo carrega. Isso quebra o
 * `prisma generate` durante o build, que só lê o schema e não toca no banco:
 * no Railway as variáveis existem apenas em runtime, e o build falhava com
 * "PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL".
 */
const conexao = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // String vazia deixa o generate passar; os comandos que precisam de banco
    // falham com a mensagem do próprio Prisma se a variável estiver faltando.
    url: conexao,
  },
});
