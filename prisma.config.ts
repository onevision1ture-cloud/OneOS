import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Configuração dos comandos da CLI do Prisma (db push, migrate, seed, studio).
 *
 * A conexão é lida direto de `process.env`, e nunca com o helper `env()` do
 * Prisma: aquele exige a variável no instante em que este arquivo carrega, o
 * que quebra o `prisma generate` durante o build. No Railway as variáveis só
 * existem em runtime, e o build falhava com
 * "PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL".
 *
 * `DIRECT_URL` tem prioridade: em bancos com pooler (Supabase, Neon), o modo
 * transaction não aceita comandos de migration, mas a conexão direta aceita.
 *
 * Quando nenhuma das duas existe, a string fica vazia. Comandos que não tocam
 * no banco (como o generate) seguem normalmente; os que precisam falham com a
 * mensagem do próprio Prisma, dizendo qual variável configurar.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
