import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

/**
 * Cliente do banco.
 *
 * A conexão só é aberta na primeira consulta, não quando o arquivo carrega.
 * Isso importa no build: o Next percorre as rotas para analisá-las, e nesse
 * momento as variáveis de ambiente do servidor ainda não existem. Criar o
 * cliente ali derrubava o build com "DATABASE_URL não definida".
 *
 * Em runtime, se a variável faltar mesmo, o erro aparece na primeira consulta
 * com a mensagem explicativa abaixo.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function criarCliente(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não definida. No seu computador, copie .env.example para " +
        ".env e preencha a conexão. Em produção, configure a variável no " +
        "serviço de hospedagem.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * O Proxy adia a criação do cliente até alguém usá-lo de fato. Enquanto
 * ninguém consulta, nada de banco é tocado.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_alvo, propriedade) {
    const cliente = (globalForPrisma.prisma ??= criarCliente());
    const valor = Reflect.get(cliente, propriedade);
    return typeof valor === "function" ? valor.bind(cliente) : valor;
  },
});
