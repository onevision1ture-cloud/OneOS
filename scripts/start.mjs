/**
 * Inicia o One OS em produção.
 *
 * Antes de subir o servidor, garante que o banco está pronto:
 *   1. confere que o banco é seguro para este sistema
 *   2. cria/atualiza as tabelas conforme o schema
 *   3. cria os cargos, as etapas do CRM e os acessos da equipe
 *
 * As etapas são seguras de repetir, então valem no primeiro deploy e em
 * todos os seguintes, sem passo manual e sem duplicar nada.
 */
import { spawn } from "node:child_process";

const log = (msg) => console.log(`[one-os] ${msg}`);
const erro = (msg) => console.error(`[one-os] ${msg}`);

function rodar(comando, args, opcoes = {}) {
  return new Promise((resolve) => {
    const proc = spawn(comando, args, {
      stdio: opcoes.silencioso ? ["ignore", "pipe", "pipe"] : "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });

    let saida = "";
    if (opcoes.silencioso) {
      proc.stdout?.on("data", (d) => (saida += d));
      proc.stderr?.on("data", (d) => (saida += d));
    }

    proc.on("exit", (code) => resolve({ code: code ?? 1, saida }));
    proc.on("error", () => resolve({ code: 1, saida }));
  });
}

if (!process.env.DATABASE_URL) {
  erro("DATABASE_URL não está definida. Configure a variável antes de iniciar.");
  process.exit(1);
}

log("preparando o banco de dados...");

/**
 * `prisma db push` trata o schema como a verdade absoluta: qualquer tabela
 * que exista no banco e não esteja no schema é considerada sobra e removida.
 *
 * Se o banco tiver tabelas de outro sistema, isso apagaria os dados de
 * alguém. Por isso rodamos primeiro em modo de conferência: se o Prisma
 * avisar sobre perda de dados, paramos e explicamos, em vez de forçar.
 */
const conferencia = await rodar("npx", ["prisma", "db", "push"], {
  silencioso: true,
});

const querApagar = /data loss|about to drop/i.test(conferencia.saida);

if (querApagar) {
  const tabelas = [
    ...new Set(
      [...conferencia.saida.matchAll(/drop the `([^`]+)` table/g)].map(
        (m) => m[1],
      ),
    ),
  ];

  erro("");
  erro("PAREI: este banco tem tabelas de outro sistema.");
  erro("");
  erro("Aplicar o schema aqui apagaria estas tabelas e os dados delas:");
  for (const t of tabelas) erro(`   - ${t}`);
  erro("");
  erro("Nada foi alterado. Para resolver, use um banco vazio para este");
  erro("sistema: crie um Postgres novo e aponte a DATABASE_URL para ele.");
  erro("Assim o banco antigo continua intacto, com os dados preservados.");
  erro("");
  process.exit(1);
}

if (conferencia.code !== 0) {
  erro("não consegui criar as tabelas.");
  erro(conferencia.saida.trim().split("\n").slice(-6).join("\n"));
  erro("Confira se a DATABASE_URL aponta para um Postgres acessível.");
  process.exit(1);
}

log("tabelas em dia.");

// Cargos, etapas do CRM e o primeiro acesso.
const seed = await rodar("npx", ["tsx", "prisma/seed.ts"]);
if (seed.code === 0) log("cargos e acesso inicial prontos.");
else log("seed não completou; seguindo (o banco pode já estar preenchido).");

/**
 * Cria os dois acessos da equipe. O seed sozinho cria só o primeiro,
 * então sem esta etapa o segundo sócio não conseguiria entrar.
 */
if (process.env.ACESSO_SENHA_PADRAO) {
  const acessos = await rodar("node", ["scripts/acessos.mjs"]);
  if (acessos.code === 0) log("acessos da equipe em dia.");
  else log("não consegui configurar os acessos; seguindo.");
}

log("iniciando o servidor...");
const next = spawn("npx", ["next", "start"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

next.on("exit", (code) => process.exit(code ?? 0));

for (const sinal of ["SIGINT", "SIGTERM"]) {
  process.on(sinal, () => next.kill(sinal));
}
