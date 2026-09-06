import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { verificar, registrarFalha, limparFalhas } from "@/lib/rate-limit";
import {
  ADMIN_LEVEL,
  buildPermissionMap,
  emptyPermissionMap,
  type PermissionMap,
} from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleId: string | null;
      roleName: string | null;
      roleLevel: number;
      isAdmin: boolean;
      isFounder: boolean;
      permissions: PermissionMap;
      avatarUrl: string | null;
      jobTitle: string | null;
      locale: string;
      theme: string;
    } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Consulta o usuário e devolve o que a sessão precisa carregar. */
async function loadSessionUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: true } } },
  });

  if (!user || !user.isActive) return null;

  const level = user.isFounder ? ADMIN_LEVEL : (user.role?.level ?? 0);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.avatarUrl,
    avatarUrl: user.avatarUrl,
    jobTitle: user.jobTitle,
    locale: user.locale,
    theme: user.theme,
    roleId: user.roleId,
    roleName: user.role?.name ?? (user.isFounder ? "Fundador" : null),
    roleLevel: level,
    isAdmin: level >= ADMIN_LEVEL,
    isFounder: user.isFounder,
    permissions: user.role
      ? buildPermissionMap(level, user.role.permissions)
      : level >= ADMIN_LEVEL
        ? buildPermissionMap(level, [])
        : emptyPermissionMap(),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();

        // Trava contra tentativas repetidas de senha no mesmo e-mail.
        const freio = verificar(email);
        if (freio.bloqueado) {
          throw new Error(`MUITAS_TENTATIVAS:${freio.faltamSegundos}`);
        }

        let user;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (error) {
          // Banco fora do ar, credencial de conexão errada, rede caída...
          // Isso NÃO é senha inválida: se devolvêssemos null aqui, a tela
          // acusaria "senha incorreta" e mandaria a pessoa caçar o erro
          // no lugar errado.
          console.error("[One OS] falha ao consultar o banco no login:", error);
          throw new Error("BANCO_INDISPONIVEL");
        }

        // Daqui em diante, mesma resposta para usuário inexistente e senha
        // errada, para não revelar quais e-mails existem no sistema.
        if (!user || !user.isActive) {
          registrarFalha(email);
          return null;
        }

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) {
          registrarFalha(email);
          return null;
        }

        // Entrou: zera as falhas acumuladas.
        limparFalhas(email);

        // Registro de acesso: útil, mas não pode impedir a entrada.
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
          await prisma.activityLog.create({
            data: {
              userId: user.id,
              action: "login",
              entity: "User",
              entityId: user.id,
            },
          });
        } catch (error) {
          console.error("[One OS] não consegui registrar o acesso:", error);
        }

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) token.uid = user.id;

      /**
       * O token guarda um retrato do cargo só para o menu do topo aparecer
       * rápido. Ele envelhece, então NÃO é a fonte da verdade das permissões:
       * quem decide o que a pessoa acessa é `sessaoAtual()` em lib/guard.ts,
       * que lê o banco a cada requisição.
       */
      if (user?.id || trigger === "update" || !token.snapshot) {
        const uid = (user?.id ?? token.uid) as string | undefined;
        token.snapshot = uid ? await loadSessionUser(uid) : null;
      }
      return token;
    },
    async session({ session, token }) {
      const snapshot = token.snapshot as Awaited<ReturnType<typeof loadSessionUser>>;
      if (!snapshot) return session;

      session.user = { ...session.user, ...snapshot };
      return session;
    },
  },
});
