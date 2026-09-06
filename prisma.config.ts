import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Configuração dos comandos da CLI do Prisma (db push, migrate, seed, studio).
 *
 * A CLI carrega este arquivo em TODOS os comandos, inclusive no `generate`,
 * que só lê o schema e não toca no banco. Por isso a conexão é lida direto de
 * `process.env`, e nunca com o helper `env()` do Prisma: aquele lança erro
 * quando a variável não existe, derrubando o build em serviços que só injetam
 * as variáveis em runtime (Railway, Render).
 *
 * `DIRECT_URL` tem prioridade: em bancos com pooler (Supabase, Neon), o modo
 * transaction não aceita comandos de migration, mas a conexão direta aceita.
 */
const conexao =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  // Sem nenhuma das duas, uma conexão de fachada mantém o arquivo carregável.
  // Comandos que não usam o banco (generate) seguem normalmente; os que usam
  // falham ao tentar conectar, com a mensagem do próprio Prisma.
  "postgresql://sem-conexao@localhost:5432/sem-conexao";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: conexao,
  },
});
