/**
 * Define quem entra no One OS.
 *
 *   npm run acessos
 *
 * Renomeia o acesso do fundador para o e-mail da empresa e cria o segundo
 * ADM. Qualquer outro usuário é desativado: só estes dois entram.
 *
 * As senhas vêm do .env (ACESSO_SENHA_PADRAO), que nunca vai para o
 * repositório. Assim a senha real não fica escrita no código.
 *
 * Nada do que já existe no sistema é apagado. Como o acesso do fundador é
 * atualizado (e não recriado), tudo o que está vinculado a ele continua no
 * lugar: quadros, tarefas, clientes, contratos e histórico.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida no .env");
  process.exit(1);
}

const senhaPadrao = process.env.ACESSO_SENHA_PADRAO;
if (!senhaPadrao) {
  console.error(
    "ACESSO_SENHA_PADRAO não definida no .env.\n" +
      "Adicione a linha:  ACESSO_SENHA_PADRAO=\"sua-senha\"",
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

/** Os dois únicos acessos do sistema. */
const ACESSOS = [
  {
    email: process.env.ACESSO_1_EMAIL ?? "gabrieltobar@onevision.com",
    nome: "Gabriel Tobar",
    cargo: "Sócio e Desenvolvedor",
    fundador: false,
    // e-mail antigo, para renomear em vez de criar um usuário novo
    emailAnterior: "tobar.s.gabriell@gmail.com",
  },
  {
    email: process.env.ACESSO_2_EMAIL ?? "alissonmachado@onevision.com",
    nome: "Alisson Machado",
    cargo: "Fundador",
    fundador: true,
    emailAnterior: null,
  },
];

const adm = await prisma.role.findUnique({ where: { name: "ADM" } });
if (!adm) {
  console.error("Cargo ADM não encontrado. Rode `npm run db:seed` antes.");
  process.exit(1);
}

console.log("\nConfigurando os acessos do sistema...\n");

const idsMantidos = [];

for (const acesso of ACESSOS) {
  const senhaHash = await bcrypt.hash(senhaPadrao, 12);

  // Se o e-mail antigo existe, renomeia: preserva tudo o que está ligado a ele.
  const anterior = acesso.emailAnterior
    ? await prisma.user.findUnique({ where: { email: acesso.emailAnterior } })
    : null;

  const jaExiste = await prisma.user.findUnique({
    where: { email: acesso.email },
  });

  let user;

  if (anterior && !jaExiste) {
    user = await prisma.user.update({
      where: { id: anterior.id },
      data: {
        email: acesso.email,
        name: acesso.nome,
        jobTitle: acesso.cargo,
        passwordHash: senhaHash,
        roleId: adm.id,
        isFounder: acesso.fundador,
        isActive: true,
      },
    });
    console.log(`  ${acesso.emailAnterior}`);
    console.log(`    → ${acesso.email} (dados preservados)`);
  } else {
    user = await prisma.user.upsert({
      where: { email: acesso.email },
      update: {
        name: acesso.nome,
        jobTitle: acesso.cargo,
        passwordHash: senhaHash,
        roleId: adm.id,
        isFounder: acesso.fundador,
        isActive: true,
      },
      create: {
        email: acesso.email,
        name: acesso.nome,
        jobTitle: acesso.cargo,
        passwordHash: senhaHash,
        roleId: adm.id,
        isFounder: acesso.fundador,
        isActive: true,
      },
    });
    console.log(`  ${acesso.email} ${jaExiste ? "(atualizado)" : "(criado)"}`);
  }

  idsMantidos.push(user.id);
}

// Qualquer outro acesso perde a entrada. Desativamos em vez de apagar,
// para não perder o histórico de quem fez o quê.
const outros = await prisma.user.updateMany({
  where: { id: { notIn: idsMantidos }, isActive: true },
  data: { isActive: false },
});

if (outros.count > 0) {
  console.log(`\n  ${outros.count} outro(s) acesso(s) desativado(s).`);
}

console.log("\nAcessos ativos:");
for (const u of await prisma.user.findMany({
  where: { isActive: true },
  include: { role: true },
  orderBy: { name: "asc" },
})) {
  console.log(`  ${u.email}  ·  ${u.name}  ·  ${u.role?.name}`);
}

console.log("\nA senha dos dois é a que está em ACESSO_SENHA_PADRAO no .env.");
console.log("Troque em Perfil → Alterar senha depois do primeiro acesso.\n");

await prisma.$disconnect();
