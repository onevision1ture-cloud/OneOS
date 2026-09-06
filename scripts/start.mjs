/**
 * Inicia o One OS em produção.
 *
 * Antes de subir o servidor, garante que o banco está pronto:
 *   1. cria/atualiza as tabelas conforme o schema
 *   2. cria os cargos, as etapas do CRM e o primeiro acesso
 *
 * As duas etapas são seguras de repetir: `db push` só aplica o que falta,
 * e o seed usa upsert. Assim o primeiro deploy já sobe com o banco pronto,
 * sem depender de alguém lembrar de rodar um comando à mão.
 */
import { spawn } from "node:child_process";

const log = (msg) => console.log(`[one-os] ${msg}`);

function rodar(comando, args) {
  return new Promise((resolve) => {
    const proc = spawn(comando, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });
    proc.on("exit", (code) => resolve(code ?? 1));
    proc.on("error", () => resolve(1));
  });
}

if (!process.env.DATABASE_URL) {
  console.error(
    "[one-os] DATABASE_URL não está definida.\n" +
      "          Configure a variável no serviço antes de iniciar.",
  );
  process.exit(1);
}

log("preparando o banco de dados...");

// Prisma 7 não aceita --skip-generate: o cliente já foi gerado no build.
const push = await rodar("npx", ["prisma", "db", "push"]);
if (push !== 0) {
  console.error(
    "[one-os] não consegui criar as tabelas.\n" +
      "          Confira se a DATABASE_URL aponta para um Postgres acessível.",
  );
  process.exit(1);
}
log("tabelas em dia.");

// O seed cria cargos, etapas do CRM e o primeiro acesso. Se falhar, o
// sistema ainda sobe: talvez já esteja tudo criado de um deploy anterior.
const seed = await rodar("npx", ["tsx", "prisma/seed.ts"]);
if (seed === 0) log("cargos e acesso inicial prontos.");
else log("seed não completou; seguindo (o banco pode já estar preenchido).");

/**
 * Cria os dois acessos da equipe. O seed sozinho cria só o primeiro,
 * então sem esta etapa o segundo sócio não conseguiria entrar.
 *
 * Só roda quando a senha padrão está configurada; sem ela, o sistema sobe
 * com o que o seed já criou.
 */
if (process.env.ACESSO_SENHA_PADRAO) {
  const acessos = await rodar("node", ["scripts/acessos.mjs"]);
  if (acessos === 0) log("acessos da equipe em dia.");
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
