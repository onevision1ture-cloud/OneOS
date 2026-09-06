/**
 * Compila o One OS.
 *
 * O cliente do Prisma já vem versionado em `src/generated/prisma`, e no
 * Prisma 7 ele é portátil (a conexão vem de um driver adapter, não de um
 * binário compilado para o sistema). Então o `prisma generate` aqui é só
 * uma atualização de cortesia: se falhar, o build segue com o cliente que
 * já está no repositório.
 *
 * Isso importa porque a CLI do Prisma carrega o prisma.config.ts em qualquer
 * comando, e serviços de hospedagem injetam as variáveis de ambiente apenas
 * em runtime. Deixar o generate obrigatório fazia o build inteiro depender
 * de uma variável que não existe naquele momento.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

console.log("[build] One OS · build 2026-09-06-c");

const ambiente = { ...process.env };

// No computador as variáveis moram no .env; em produção vêm do serviço.
if (existsSync(".env")) {
  for (const linha of readFileSync(".env", "utf8").split("\n")) {
    const par = linha.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/i);
    if (par && !ambiente[par[1]]) ambiente[par[1]] = par[2];
  }
}

// Conexão de fachada só para o prisma.config.ts carregar. Nenhuma consulta
// é feita durante o build.
if (!ambiente.DATABASE_URL) {
  ambiente.DATABASE_URL = "postgresql://build:build@localhost:5432/build";
}
if (!ambiente.DIRECT_URL) ambiente.DIRECT_URL = ambiente.DATABASE_URL;

function rodar(comando, args) {
  return new Promise((resolve) => {
    const proc = spawn(comando, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: ambiente,
    });
    proc.on("exit", (code) => resolve(code ?? 1));
    proc.on("error", () => resolve(1));
  });
}

// Etapa opcional: mantém o cliente em dia com o schema.
const generate = await rodar("npx", [
  "prisma",
  "generate",
  "--schema=prisma/schema.prisma",
]);

if (generate !== 0) {
  console.log(
    "[build] não atualizei o cliente do Prisma; usando o que está no repositório.",
  );
}

// Etapa que realmente importa.
const next = await rodar("npx", ["next", "build"]);

if (next !== 0) {
  console.error("[build] a compilação falhou.");
  process.exit(next);
}

console.log("[build] pronto.");
