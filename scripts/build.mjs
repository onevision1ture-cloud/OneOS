/**
 * Compila o One OS.
 *
 * Gera o cliente do Prisma e depois compila o Next.
 *
 * O detalhe importante: serviços de hospedagem como o Railway injetam as
 * variáveis de ambiente só quando o sistema roda, não durante o build. Mas a
 * CLI do Prisma carrega o prisma.config.ts em qualquer comando, inclusive no
 * generate, que nem toca no banco.
 *
 * Para o build nunca depender disso, definimos aqui uma conexão de fachada
 * quando não há nenhuma. Ela só existe dentro deste processo e serve apenas
 * para o arquivo de configuração carregar; nenhuma consulta é feita.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ambiente = { ...process.env };

// No computador as variáveis moram no .env; em produção vêm do serviço.
// Lemos o arquivo quando ele existe, só para a mensagem abaixo fazer sentido.
if (existsSync(".env")) {
  for (const linha of readFileSync(".env", "utf8").split("\n")) {
    const par = linha.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/i);
    if (par && !ambiente[par[1]]) ambiente[par[1]] = par[2];
  }
}

if (!ambiente.DATABASE_URL) {
  ambiente.DATABASE_URL = "postgresql://build:build@localhost:5432/build";
  console.log(
    "[build] sem DATABASE_URL: usando uma conexão de fachada só para gerar o cliente.",
  );
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

const generate = await rodar("npx", [
  "prisma",
  "generate",
  "--schema=prisma/schema.prisma",
]);
if (generate !== 0) {
  console.error("[build] falhou ao gerar o cliente do Prisma.");
  process.exit(1);
}

const next = await rodar("npx", ["next", "build"]);
process.exit(next);
