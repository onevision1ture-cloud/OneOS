import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Page } from "../src/generated/prisma";

// O seed roda pela conexão direta (DIRECT_URL) quando ela existe:
// o pooler do Supabase em modo transaction não aceita todos os comandos.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Defina DATABASE_URL (e opcionalmente DIRECT_URL) no .env");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const PAGES: Page[] = [
  "INICIO",
  "CLIENTES",
  "CRM",
  "TAREFAS",
  "EQUIPE",
  "FINANCEIRO",
  "CONTRATOS",
  "ARQUIVOS",
  "CONFIGURACOES",
];

type Access = "full" | "read" | "edit" | "none";

const ACCESS: Record<Access, {
  canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean;
}> = {
  full: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  edit: { canView: true, canCreate: true, canEdit: true, canDelete: false },
  read: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  none: { canView: false, canCreate: false, canEdit: false, canDelete: false },
};

/** Cargos base do sistema. ADM em nível 100 enxerga tudo. */
const ROLES: Array<{
  name: string;
  description: string;
  color: string;
  level: number;
  perms: Partial<Record<Page, Access>>;
}> = [
  {
    name: "ADM",
    description: "Controle total do sistema, da equipe e das permissões.",
    color: "#E11D2E",
    level: 100,
    perms: Object.fromEntries(PAGES.map((p) => [p, "full"])),
  },
  {
    name: "Gestor",
    description: "Acompanha operação, clientes e financeiro. Não altera cargos.",
    color: "#F97316",
    level: 70,
    perms: {
      INICIO: "full", CLIENTES: "full", CRM: "full", TAREFAS: "full", EQUIPE: "read",
      FINANCEIRO: "edit", CONTRATOS: "edit", ARQUIVOS: "full",
      CONFIGURACOES: "read",
    },
  },
  {
    name: "Comercial",
    description: "Foco em CRM: capta, negocia e converte leads em clientes.",
    color: "#22C55E",
    level: 40,
    perms: {
      INICIO: "read", CLIENTES: "edit", CRM: "full", TAREFAS: "full", EQUIPE: "read",
      CONTRATOS: "read", ARQUIVOS: "edit", CONFIGURACOES: "none",
      FINANCEIRO: "none",
    },
  },
  {
    name: "Operação",
    description: "Executa entregas dos clientes. Sem acesso a financeiro.",
    color: "#3B82F6",
    level: 20,
    perms: {
      INICIO: "read", CLIENTES: "read", CRM: "read", TAREFAS: "full", EQUIPE: "read",
      ARQUIVOS: "edit", CONTRATOS: "none", FINANCEIRO: "none",
      CONFIGURACOES: "none",
    },
  },
];

const STAGES = [
  { name: "Captação", color: "#64748B", position: 0 },
  { name: "Contato feito", color: "#3B82F6", position: 1 },
  { name: "Reunião agendada", color: "#8B5CF6", position: 2 },
  { name: "Proposta enviada", color: "#F97316", position: 3 },
  { name: "Negociação", color: "#EAB308", position: 4 },
  { name: "Cliente", color: "#22C55E", position: 5, isWon: true },
  { name: "Perdido", color: "#EF4444", position: 6, isLost: true },
];

async function main() {
  console.log("→ Semeando cargos...");
  const roleIds: Record<string, string> = {};

  for (const def of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: def.name },
      update: { description: def.description, color: def.color, level: def.level },
      create: {
        name: def.name,
        description: def.description,
        color: def.color,
        level: def.level,
        isSystem: true,
      },
    });
    roleIds[def.name] = role.id;

    for (const page of PAGES) {
      const access = ACCESS[def.perms[page] ?? "none"];
      await prisma.rolePermission.upsert({
        where: { roleId_page: { roleId: role.id, page } },
        update: access,
        create: { roleId: role.id, page, ...access },
      });
    }
  }

  console.log("→ Criando acesso ADM...");
  const email = (process.env.SEED_ADMIN_EMAIL ?? "gabrieltobar@onevision.com")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      "SEED_ADMIN_PASSWORD não definida no .env. " +
        "Copie .env.example para .env e preencha a senha do primeiro acesso.",
    );
  }
  const name = process.env.SEED_ADMIN_NAME ?? "Gabriel Tobar";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { roleId: roleIds.ADM, isActive: true, isFounder: true },
    create: {
      email,
      name,
      passwordHash,
      jobTitle: "Fundador",
      roleId: roleIds.ADM,
      isFounder: true,
      isActive: true,
    },
  });
  console.log(`   ADM pronto: ${admin.email}`);

  console.log("→ Montando pipeline do CRM...");
  const existingStages = await prisma.pipelineStage.count();
  if (existingStages === 0) {
    for (const stage of STAGES) {
      await prisma.pipelineStage.create({ data: stage });
    }
  }

  console.log("→ Configurações iniciais...");
  await prisma.setting.upsert({
    where: { key: "company" },
    update: {},
    create: {
      key: "company",
      value: {
        name: "Onevision1ture",
        shortName: "Onevision",
        city: "Florianópolis",
        state: "SC",
        email: "contato@onevision1ture.com.br",
        phone: "(54) 98875-7114",
        site: "https://onevisionmkt.com",
      },
    },
  });

  console.log("\n✅ Seed concluído.");
  console.log(`   Login: ${email}`);
}

main()
  .catch((e) => {
    console.error("❌ Falha no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
