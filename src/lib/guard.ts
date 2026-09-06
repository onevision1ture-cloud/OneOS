import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_LEVEL,
  buildPermissionMap,
  can,
  emptyPermissionMap,
  type PageKey,
  type PermissionAction,
  type PermissionMap,
} from "@/lib/permissions";

export type SessaoAtual = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  locale: string;
  theme: string;
  roleId: string | null;
  roleName: string | null;
  roleLevel: number;
  isAdmin: boolean;
  isFounder: boolean;
  permissions: PermissionMap;
};

/**
 * Lê o usuário logado com o cargo e as permissões que estão no banco AGORA.
 *
 * O token da sessão guarda um retrato do cargo, mas ele envelhece: se um ADM
 * mudar as permissões, ou o sistema ganhar uma página nova, quem já estava
 * logado continuaria com o acesso antigo até sair e entrar. Por isso a fonte
 * da verdade é o banco.
 *
 * `cache` do React garante uma consulta por requisição, mesmo que várias
 * partes da página peçam a sessão.
 */
export const sessaoAtual = cache(async (): Promise<SessaoAtual | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: { include: { permissions: true } } },
  });

  if (!user || !user.isActive) return null;

  const level = user.isFounder ? ADMIN_LEVEL : (user.role?.level ?? 0);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
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
});

/** Sessão obrigatória. Sem login, volta para a tela de entrada. */
export async function requireSession() {
  const user = await sessaoAtual();
  if (!user) redirect("/login");
  return { user };
}

/**
 * Exige permissão na página. Sem acesso, manda para o 403,
 * uma tela explicando o bloqueio, não um erro seco.
 */
export async function requirePage(
  page: PageKey,
  action: PermissionAction = "view",
) {
  const session = await requireSession();
  if (!can(session.user.permissions, page, action)) {
    redirect(`/sem-acesso?page=${page}`);
  }
  return session;
}

/** Só ADM. Usado nas ações destrutivas de Equipe e Configurações. */
export async function requireAdmin() {
  const session = await requireSession();
  if (!session.user.isAdmin) redirect("/sem-acesso?page=EQUIPE");
  return session;
}

/** Versão para server actions: lança em vez de redirecionar. */
export async function assertPermission(
  page: PageKey,
  action: PermissionAction = "view",
) {
  const user = await sessaoAtual();
  if (!user) throw new Error("NAO_AUTENTICADO");
  if (!can(user.permissions, page, action)) {
    throw new Error("SEM_PERMISSAO");
  }
  return { user };
}
