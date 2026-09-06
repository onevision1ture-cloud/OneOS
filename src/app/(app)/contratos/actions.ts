"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/guard";
import { messageFor, type ActionResult } from "@/lib/action-result";

const contractSchema = z.object({
  title: z.string().min(1, "Informe o título"),
  clientId: z.string().optional(),
  value: z.coerce.number().min(0),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  status: z.enum(["ATIVO", "RENOVACAO", "ENCERRADO", "RASCUNHO"]),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
});

export type ContractInput = {
  title: string;
  clientId?: string;
  value: number | string;
  startAt?: string;
  endAt?: string;
  status: "ATIVO" | "RENOVACAO" | "ENCERRADO" | "RASCUNHO";
  fileUrl?: string;
  notes?: string;
};

export async function saveContract(
  id: string | null,
  input: ContractInput,
): Promise<ActionResult> {
  try {
    const session = await assertPermission("CONTRATOS", id ? "edit" : "create");
    const parsed = contractSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const { startAt, endAt, clientId, ...rest } = parsed.data;
    const data = {
      ...rest,
      clientId: clientId || null,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
    };

    const contract = id
      ? await prisma.contract.update({ where: { id }, data })
      : await prisma.contract.create({
          data: { ...data, ownerId: session.user.id },
        });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: id ? "update" : "create",
        entity: "Contract",
        entityId: contract.id,
        meta: { title: contract.title },
      },
    });

    revalidatePath("/contratos");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function deleteContract(id: string): Promise<ActionResult> {
  try {
    const session = await assertPermission("CONTRATOS", "delete");
    const contract = await prisma.contract.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "delete",
        entity: "Contract",
        entityId: id,
        meta: { title: contract.title },
      },
    });

    revalidatePath("/contratos");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}
