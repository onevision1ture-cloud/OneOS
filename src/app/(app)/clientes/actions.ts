"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/guard";
import { messageFor, type ActionResult } from "@/lib/action-result";
import type { Service } from "@/generated/prisma";

const clientSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  company: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  segment: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  status: z.enum(["ATIVO", "PAUSADO", "ENCERRADO", "PROSPECCAO"]),
  monthlyBudget: z.coerce.number().min(0),
  monthlyFee: z.coerce.number().min(0),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  notes: z.string().optional(),
  services: z.array(z.string()).optional(),
});

/**
 * O formulário trabalha com strings nos campos numéricos e de data
 * (é o que o <input> devolve); o schema faz a coerção ao salvar.
 */
export type ClientInput = {
  name: string;
  company?: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  website?: string;
  segment?: string;
  city?: string;
  state?: string;
  status: "ATIVO" | "PAUSADO" | "ENCERRADO" | "PROSPECCAO";
  monthlyBudget: number | string;
  monthlyFee: number | string;
  contractStart?: string;
  contractEnd?: string;
  notes?: string;
  services?: string[];
};

function optionalDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function saveClient(
  id: string | null,
  input: ClientInput,
): Promise<ActionResult> {
  try {
    const session = await assertPermission("CLIENTES", id ? "edit" : "create");
    const parsed = clientSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }

    const { services, contractStart, contractEnd, email, ...rest } = parsed.data;

    const data = {
      ...rest,
      email: email || null,
      contractStart: optionalDate(contractStart),
      contractEnd: optionalDate(contractEnd),
    };

    const client = id
      ? await prisma.client.update({ where: { id }, data })
      : await prisma.client.create({
          data: { ...data, ownerId: session.user.id },
        });

    // Reescreve a lista de serviços: apaga os antigos e grava os marcados.
    if (services) {
      await prisma.clientService.deleteMany({ where: { clientId: client.id } });
      if (services.length > 0) {
        await prisma.clientService.createMany({
          data: services.map((service) => ({
            clientId: client.id,
            service: service as Service,
            value: 0,
          })),
        });
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: id ? "update" : "create",
        entity: "Client",
        entityId: client.id,
        meta: { name: client.name },
      },
    });

    revalidatePath("/clientes");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function deleteClient(id: string): Promise<ActionResult> {
  try {
    const session = await assertPermission("CLIENTES", "delete");
    const client = await prisma.client.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "delete",
        entity: "Client",
        entityId: id,
        meta: { name: client.name },
      },
    });

    revalidatePath("/clientes");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}
