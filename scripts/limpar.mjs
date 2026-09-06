/**
 * Zera os dados operacionais do sistema, deixando-o em branco para uso real.
 *
 *   npm run limpar
 *
 * Apaga: clientes, leads, contratos, faturas, folha, ferramentas,
 * lançamentos, arquivos, quadros de tarefas e histórico de atividade.
 *
 * Mantém: seu acesso, os cargos com as permissões, as etapas do CRM
 * e os dados da empresa. Sem isso o sistema não funcionaria.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida no .env");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

// Ordem de baixo para cima: filhos antes dos pais.
const APAGAR = [
  ["cardComment", "comentários de tarefas"],
  ["cardCheckItem", "itens de checklist"],
  ["cardLabel", "etiquetas aplicadas"],
  ["card", "tarefas"],
  ["boardLabel", "etiquetas de quadro"],
  ["boardColumn", "colunas de quadro"],
  ["board", "quadros"],
  ["leadTask", "tarefas de lead"],
  ["leadNote", "anotações de lead"],
  ["lead", "leads"],
  ["invoice", "faturas"],
  ["contract", "contratos"],
  ["clientService", "serviços contratados"],
  ["client", "clientes"],
  ["payroll", "folha"],
  ["tool", "ferramentas"],
  ["transaction", "lançamentos"],
  ["fileNode", "arquivos e pastas"],
  ["activityLog", "histórico de atividade"],
];

console.log("\nLimpando os dados operacionais...\n");

let total = 0;
for (const [tabela, rotulo] of APAGAR) {
  const r = await prisma[tabela].deleteMany({});
  if (r.count > 0) {
    console.log(`  ${String(r.count).padStart(4)}  ${rotulo}`);
    total += r.count;
  }
}

const usuarios = await prisma.user.count();
const cargos = await prisma.role.count();
const etapas = await prisma.pipelineStage.count();

console.log(`\n${total} registros apagados.`);
console.log("\nMantidos (o sistema precisa deles):");
console.log(`  ${usuarios} usuário(s)`);
console.log(`  ${cargos} cargos com permissões`);
console.log(`  ${etapas} etapas do CRM`);
console.log("\nO sistema está em branco. O que você cadastrar a partir de agora fica salvo.\n");

await prisma.$disconnect();
