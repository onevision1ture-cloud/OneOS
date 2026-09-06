"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { messageFor, type ActionResult } from "@/lib/action-result";
import { senhaFraca } from "@/lib/senha";
import { ADMIN_LEVEL, PAGES } from "@/lib/permissions";
import type { Page } from "@/generated/prisma";

/** Só ADM mexe em pessoas e cargos. */
async function requireAdminAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("NAO_AUTENTICADO");
  if (!session.user.isAdmin) throw new Error("SEM_PERMISSAO");
  return session;
}

const memberSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  roleId: z.string().optional(),
  isActive: z.boolean(),
  password: z.string().optional(),
});

export type MemberInput = {
  name: string;
  email: string;
  jobTitle?: string;
  phone?: string;
  roleId?: string;
  isActive: boolean;
  password?: string;
};

export async function saveMember(
  id: string | null,
  input: MemberInput,
): Promise<ActionResult> {
  try {
    const session = await requireAdminAction();
    const parsed = memberSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const { password, roleId, email, ...rest } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    if (id) {
      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return { ok: false, error: "Usuário não encontrado." };

      // O fundador só pode ser editado por ele mesmo.
      if (target.isFounder && target.id !== session.user.id) {
        throw new Error("PROTEGIDO");
      }

      // Senha em branco significa "manter a atual"; se veio preenchida,
      // precisa passar pela mesma regra de força.
      if (password) {
        const fraca = senhaFraca(password);
        if (fraca) return { ok: false, error: fraca };
      }

      await prisma.user.update({
        where: { id },
        data: {
          ...rest,
          email: normalizedEmail,
          roleId: roleId || null,
          ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
        },
      });
    } else {
      if (!password) {
        return { ok: false, error: "Defina uma senha inicial para a pessoa." };
      }

      const fraca = senhaFraca(password);
      if (fraca) return { ok: false, error: fraca };

      const exists = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (exists) throw new Error("EMAIL_EM_USO");

      await prisma.user.create({
        data: {
          ...rest,
          email: normalizedEmail,
          roleId: roleId || null,
          passwordHash: await bcrypt.hash(password, 12),
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: id ? "update" : "create",
        entity: "User",
        entityId: id ?? undefined,
        meta: { name: parsed.data.name },
      },
    });

    revalidatePath("/equipe");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

/** Remove alguém da equipe. Protege o fundador e o último ADM. */
export async function removeMember(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminAction();

    const target = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!target) return { ok: false, error: "Usuário não encontrado." };
    if (target.isFounder) throw new Error("PROTEGIDO");
    if (target.id === session.user.id) {
      return { ok: false, error: "Você não pode remover o próprio acesso." };
    }

    // Não deixa o sistema ficar sem administrador.
    if ((target.role?.level ?? 0) >= ADMIN_LEVEL) {
      const admins = await prisma.user.count({
        where: { isActive: true, role: { level: { gte: ADMIN_LEVEL } } },
      });
      if (admins <= 1) throw new Error("ULTIMO_ADM");
    }

    await prisma.user.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "delete",
        entity: "User",
        entityId: id,
        meta: { name: target.name },
      },
    });

    revalidatePath("/equipe");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function toggleMemberActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    const session = await requireAdminAction();

    const target = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!target) return { ok: false, error: "Usuário não encontrado." };
    if (target.isFounder) throw new Error("PROTEGIDO");
    if (target.id === session.user.id) {
      return { ok: false, error: "Você não pode desativar o próprio acesso." };
    }

    if (!isActive && (target.role?.level ?? 0) >= ADMIN_LEVEL) {
      const admins = await prisma.user.count({
        where: { isActive: true, role: { level: { gte: ADMIN_LEVEL } } },
      });
      if (admins <= 1) throw new Error("ULTIMO_ADM");
    }

    await prisma.user.update({ where: { id }, data: { isActive } });
    revalidatePath("/equipe");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

// ─────────────────────────── CARGOS ───────────────────────────

const roleSchema = z.object({
  name: z.string().min(1, "Informe o nome do cargo"),
  description: z.string().optional(),
  color: z.string().default("#E11D2E"),
  level: z.coerce.number().min(0).max(100),
});

export type RoleInput = {
  name: string;
  description?: string;
  color: string;
  level: number | string;
};

export type PermissionInput = Record<
  string,
  { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }
>;

export async function saveRole(
  id: string | null,
  input: RoleInput,
  permissions: PermissionInput,
): Promise<ActionResult> {
  try {
    const session = await requireAdminAction();
    const parsed = roleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const role = id
      ? await prisma.role.update({ where: { id }, data: parsed.data })
      : await prisma.role.create({ data: parsed.data });

    for (const page of PAGES) {
      const p = permissions[page] ?? {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      };
      await prisma.rolePermission.upsert({
        where: { roleId_page: { roleId: role.id, page: page as Page } },
        update: p,
        create: { roleId: role.id, page: page as Page, ...p },
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: id ? "update" : "create",
        entity: "Role",
        entityId: role.id,
        meta: { name: role.name },
      },
    });

    revalidatePath("/equipe");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function deleteRole(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdminAction();

    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) return { ok: false, error: "Cargo não encontrado." };
    if (role.isSystem) throw new Error("CARGO_DO_SISTEMA");
    if (role._count.users > 0) {
      return {
        ok: false,
        error: `Há ${role._count.users} pessoa(s) neste cargo. Mova-as antes de excluir.`,
      };
    }

    await prisma.role.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "delete",
        entity: "Role",
        entityId: id,
        meta: { name: role.name },
      },
    });

    revalidatePath("/equipe");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}
