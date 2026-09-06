"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertPermission } from "@/lib/guard";
import { messageFor, type ActionResult } from "@/lib/action-result";
import { senhaFraca } from "@/lib/senha";

/** Preferências pessoais: valem para quem está logado, sem exigir permissão. */
export async function savePreferences(input: {
  locale?: string;
  theme?: string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("NAO_AUTENTICADO");

    const parsed = z
      .object({
        locale: z.enum(["pt", "en"]).optional(),
        theme: z.enum(["dark", "light"]).optional(),
      })
      .safeParse(input);

    if (!parsed.success) return { ok: false, error: "Preferência inválida." };

    await prisma.user.update({
      where: { id: session.user.id },
      data: parsed.data,
    });

    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

const companySchema = z.object({
  name: z.string().min(1),
  shortName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  site: z.string().optional(),
  cnpj: z.string().optional(),
});

export type CompanyInput = z.infer<typeof companySchema>;

/** Dados da empresa: exige permissão de edição em Configurações. */
export async function saveCompany(input: CompanyInput): Promise<ActionResult> {
  try {
    const session = await assertPermission("CONFIGURACOES", "edit");
    const parsed = companySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    await prisma.setting.upsert({
      where: { key: "company" },
      update: { value: parsed.data },
      create: { key: "company", value: parsed.data },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "update",
        entity: "Setting",
        entityId: "company",
      },
    });

    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

// ─────────────────────────── PERFIL ───────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, "Informe seu nome"),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export async function saveProfile(input: ProfileInput): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("NAO_AUTENTICADO");

    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...parsed.data,
        avatarUrl: parsed.data.avatarUrl || null,
      },
    });

    revalidatePath("/perfil");
    revalidatePath("/equipe");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

/** Troca a própria senha, conferindo a atual antes. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("NAO_AUTENTICADO");

    const fraca = senhaFraca(newPassword);
    if (fraca) return { ok: false, error: fraca };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) throw new Error("NAO_AUTENTICADO");

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new Error("SENHA_INCORRETA");

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "update",
        entity: "User",
        entityId: user.id,
        meta: { passwordChanged: true },
      },
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}
