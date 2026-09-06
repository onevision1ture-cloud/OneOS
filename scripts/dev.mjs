/**
 * Sobe o One OS inteiro com um comando só: banco + sistema.
 *
 *   npm run dev
 *
 * Se a DATABASE_URL apontar para um servidor externo (Supabase), o banco
 * local não é iniciado — vai direto para o Next.
 */
import { spawn } from "node:child_process";

import net from "node:net";
import path from "node:path";
import "dotenv/config";

const root = process.cwd();
const url = process.env.DATABASE_URL ?? "";
const isLocal = /@(localhost|127\.0\.0\.1):/.test(url);
const port = Number(url.match(/@(?:localhost|127\.0\.0\.1):(\d+)/)?.[1] ?? 5432);

const filhos = [];
let encerrando = false;

function log(msg) {
  console.log(`\x1b[31m▌\x1b[0m ${msg}`);
}

/** A porta já está ocupada? Então o banco já está de pé. */
function portaOcupada(porta) {
  return new Promise((resolve) => {
    const socket = net.connect({ port: porta, host: "127.0.0.1" });
    socket.setTimeout(700);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function esperarPorta(porta, tentativas = 40) {
  for (let i = 0; i < tentativas; i++) {
    if (await portaOcupada(porta)) return true;
    await new Promise((r) => setTimeout(r, 350));
  }
  return false;
}

/**
 * As tabelas já existem e há pelo menos um usuário?
 * Uma consulta direta pelo driver do Postgres, sem depender do Prisma.
 */
async function bancoPreparado() {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const r = await client.query('SELECT COUNT(*)::int AS n FROM "User"');
    return r.rows[0].n > 0;
  } catch {
    return false; // tabela ausente ou banco vazio
  } finally {
    await client.end().catch(() => {});
  }
}

function iniciar(comando, args, nome, { shell = false } = {}) {
  // `shell: true` quebra quando o caminho do executável tem espaço
  // ("C:\Program Files\..."), então só usamos onde é indispensável —
  // no npx/npm do Windows, que são arquivos .cmd.
  const proc = spawn(comando, args, {
    cwd: root,
    stdio: ["ignore", "inherit", "inherit"],
    shell,
  });

  proc.on("exit", (code) => {
    if (encerrando) return;
    if (code !== 0) {
      log(`${nome} encerrou com código ${code}.`);
      parar(code ?? 1);
    }
  });

  filhos.push(proc);
  return proc;
}

/**
 * Encerra os processos filhos dando tempo para o banco fechar os arquivos.
 * Matar o banco à força corrompe os dados, então mandamos o sinal educado
 * primeiro e só insistimos se ele travar.
 */
async function parar(code = 0) {
  if (encerrando) return;
  encerrando = true;

  for (const p of filhos) {
    try {
      p.kill("SIGINT");
    } catch {
      // já morreu
    }
  }

  // Espera até 5 segundos pelo encerramento limpo.
  const limite = Date.now() + 5000;
  while (Date.now() < limite && filhos.some((p) => p.exitCode === null)) {
    await new Promise((r) => setTimeout(r, 150));
  }

  for (const p of filhos) {
    if (p.exitCode === null) {
      try {
        p.kill("SIGKILL");
      } catch {
        // já morreu
      }
    }
  }

  process.exit(code);
}

for (const sinal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  process.on(sinal, () => {
    console.log("");
    log("encerrando...");
    void parar(0);
  });
}

// ── 1. Banco ──
if (isLocal) {
  if (await portaOcupada(port)) {
    log(`banco já está rodando na porta ${port}.`);
  } else {
    log(`iniciando banco local na porta ${port}...`);
    iniciar(process.execPath, [path.join("scripts", "dev-db.mjs")], "banco");

    if (!(await esperarPorta(port))) {
      log("o banco não respondeu a tempo. Verifique o erro acima.");
      parar(1);
    }
    log("banco pronto.");
  }

  // O banco pode estar de pé mas ainda vazio (primeira vez, ou depois de
  // apagar a pasta .pglite). Conferimos se o usuário ADM já existe.
  if (!(await bancoPreparado())) {
    log("primeira execução — criando tabelas e seu acesso...");
    const setup = spawn("npm", ["run", "setup"], {
      cwd: root,
      stdio: "inherit",
      shell: true,
    });
    const code = await new Promise((r) => setup.on("exit", r));
    if (code !== 0) {
      log("não consegui preparar o banco. Veja o erro acima.");
      parar(1);
    }
    log("banco preparado.");
  }
} else if (url) {
  log("usando banco remoto (Supabase).");
} else {
  log("DATABASE_URL não definida — copie .env.example para .env.");
  parar(1);
}

// ── 2. Sistema ──
/**
 * Backup automático a cada partida. Guarda uma cópia em JSON de tudo o que
 * está no banco, para que um problema no arquivo do banco não leve o
 * trabalho junto. Os backups antigos são podados: ficam os 20 mais recentes.
 */
async function backupAutomatico() {
  try {
    const backup = spawn("npm", ["run", "backup"], {
      cwd: root,
      stdio: "ignore",
      shell: true,
    });
    const code = await new Promise((r) => backup.on("exit", r));
    if (code === 0) log("backup do dia guardado em backups/");
  } catch {
    // backup é rede de segurança: se falhar, o sistema sobe do mesmo jeito
  }
}

await backupAutomatico();

log("iniciando o One OS em http://localhost:3000 ...");
iniciar("npx", ["next", "dev"], "next", { shell: true });
