/**
 * Cópia de segurança dos dados do One OS.
 *
 *   npm run backup            → salva em backups/AAAA-MM-DD-HHmm.json
 *   npm run backup restaurar backups/arquivo.json
 *
 * Exporta tudo o que foi cadastrado (clientes, leads, equipe, financeiro,
 * contratos, arquivos) num JSON legível. Serve tanto para o banco local
 * quanto para o Supabase.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida no .env");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

// A ordem importa na restauração: quem é referenciado vem primeiro.
const TABELAS = [
  "role",
  "rolePermission",
  "user",
  "client",
  "clientService",
  "pipelineStage",
  "lead",
  "leadNote",
  "leadTask",
  "payroll",
  "tool",
  "transaction",
  "invoice",
  "contract",
  "fileNode",
  // Tarefas: os quadros da equipe
  "board",
  "boardColumn",
  "boardLabel",
  "card",
  "cardLabel",
  "cardCheckItem",
  "cardComment",
  "setting",
];

async function salvar() {
  const dados = {};
  for (const tabela of TABELAS) {
    dados[tabela] = await prisma[tabela].findMany();
  }

  const agora = new Date();
  const carimbo = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}-${String(agora.getHours()).padStart(2, "0")}${String(agora.getMinutes()).padStart(2, "0")}`;

  const dir = path.join(process.cwd(), "backups");
  await mkdir(dir, { recursive: true });
  const destino = path.join(dir, `${carimbo}.json`);

  await writeFile(
    destino,
    JSON.stringify({ criadoEm: agora.toISOString(), dados }, null, 2),
    "utf8",
  );

  // Mantém os 20 backups mais recentes; o resto sai para não acumular.
  const { readdir, unlink } = await import("node:fs/promises");
  const arquivos = (await readdir(dir))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();
  for (const velho of arquivos.slice(20)) {
    await unlink(path.join(dir, velho)).catch(() => {});
  }

  const total = Object.values(dados).reduce((s, linhas) => s + linhas.length, 0);
  console.log(`\nBackup salvo: backups/${carimbo}.json`);
  console.log(`${total} registros de ${TABELAS.length} tabelas.\n`);
  for (const [t, linhas] of Object.entries(dados)) {
    if (linhas.length) console.log(`  ${t.padEnd(16)} ${linhas.length}`);
  }
}

async function restaurar(arquivo) {
  const conteudo = JSON.parse(await readFile(arquivo, "utf8"));
  const dados = conteudo.dados ?? conteudo;

  console.log(`\nRestaurando de ${arquivo}`);
  console.log(`(backup de ${conteudo.criadoEm ?? "data desconhecida"})\n`);

  // Apaga na ordem inversa para não esbarrar nas referências.
  for (const tabela of [...TABELAS].reverse()) {
    await prisma[tabela].deleteMany({});
  }

  for (const tabela of TABELAS) {
    const linhas = dados[tabela] ?? [];
    if (!linhas.length) continue;
    for (const linha of linhas) {
      await prisma[tabela].create({ data: linha });
    }
    console.log(`  ${tabela.padEnd(16)} ${linhas.length}`);
  }
  console.log("\nRestauração concluída.\n");
}

const [acao, arquivo] = process.argv.slice(2);

try {
  if (acao === "restaurar") {
    if (!arquivo) {
      console.error("Informe o arquivo: npm run backup restaurar backups/....json");
      process.exit(1);
    }
    await restaurar(arquivo);
  } else {
    await salvar();
  }
} finally {
  await prisma.$disconnect();
}
