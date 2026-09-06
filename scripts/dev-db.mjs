/**
 * Banco Postgres local para desenvolvimento, sem instalar nada.
 *
 * Usa PGlite (Postgres compilado em WebAssembly) e expõe na porta 5432
 * pelo protocolo do Postgres, então o Prisma conecta como conectaria
 * no Supabase. Os dados ficam em .pglite/ dentro do projeto.
 *
 *   node scripts/dev-db.mjs
 *
 * Em produção isto não é usado: lá vale a DATABASE_URL do Supabase.
 */
import { createServer } from "node:net";
import { PGlite } from "@electric-sql/pglite";
import { fromNodeSocket } from "pg-gateway/node";

const PORT = Number(process.env.DEV_DB_PORT ?? 5432);
const DIR = ".pglite";

const db = new PGlite(DIR);
await db.waitReady;
console.log(`[dev-db] PGlite pronto (dados em ${DIR}/)`);

const server = createServer(async (socket) => {
  await fromNodeSocket(socket, {
    serverVersion: "16.3",
    auth: { method: "trust" },
    async onStartup() {
      await db.waitReady;
    },
    async onMessage(data, { isAuthenticated }) {
      if (!isAuthenticated) return;
      return await db.execProtocolRaw(data);
    },
  });
});

server.listen(PORT, () => {
  console.log(`[dev-db] escutando em postgres://postgres@localhost:${PORT}/postgres`);
  console.log("[dev-db] Ctrl+C para parar.");
});

/**
 * Encerramento limpo.
 *
 * `db.close()` grava o que está em memória e libera os arquivos. Sem isso,
 * matar o processo à força deixa o banco num estado que o PGlite não
 * consegue mais abrir — os dados ficam ilegíveis.
 */
let encerrando = false;

async function encerrar(motivo) {
  if (encerrando) return;
  encerrando = true;

  console.log(`\n[dev-db] encerrando (${motivo})...`);
  server.close();

  try {
    await db.close();
    console.log("[dev-db] banco fechado com segurança.");
  } catch (e) {
    console.error("[dev-db] erro ao fechar o banco:", e);
  }

  process.exit(0);
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  process.on(sig, () => encerrar(sig));
}

// Quando roda dentro de um terminal, fechar a janela chega como fim da
// entrada padrão. Só vale se a entrada for mesmo um terminal: como filho
// de outro processo ela já nasce fechada, e isso derrubaria o banco na hora.
if (process.platform === "win32" && process.stdin.isTTY) {
  process.stdin.on("end", () => encerrar("terminal fechado"));
  process.stdin.resume();
}

// Um erro não tratado também deve fechar o banco antes de derrubar tudo.
process.on("uncaughtException", async (e) => {
  console.error("[dev-db] erro inesperado:", e);
  await encerrar("erro");
});
