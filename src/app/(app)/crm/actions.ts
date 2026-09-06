"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/guard";
import { messageFor, type ActionResult } from "@/lib/action-result";

const leadSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  company: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.enum([
    "INDICACAO",
    "INSTAGRAM",
    "GOOGLE",
    "SITE",
    "PROSPECCAO_ATIVA",
    "EVENTO",
    "OUTRO",
  ]),
  temperature: z.enum(["FRIO", "MORNO", "QUENTE"]),
  estimatedValue: z.coerce.number().min(0),
  stageId: z.string().min(1),
  ownerId: z.string().optional(),
  expectedCloseAt: z.string().optional(),
});

export type LeadInput = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  source:
    | "INDICACAO"
    | "INSTAGRAM"
    | "GOOGLE"
    | "SITE"
    | "PROSPECCAO_ATIVA"
    | "EVENTO"
    | "OUTRO";
  temperature: "FRIO" | "MORNO" | "QUENTE";
  estimatedValue: number | string;
  stageId: string;
  ownerId?: string;
  expectedCloseAt?: string;
};

export async function saveLead(
  id: string | null,
  input: LeadInput,
): Promise<ActionResult> {
  try {
    const session = await assertPermission("CRM", id ? "edit" : "create");
    const parsed = leadSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const { expectedCloseAt, email, ownerId, ...rest } = parsed.data;
    const data = {
      ...rest,
      email: email || null,
      ownerId: ownerId || null,
      expectedCloseAt: expectedCloseAt ? new Date(expectedCloseAt) : null,
    };

    if (id) {
      await prisma.lead.update({ where: { id }, data });
    } else {
      // novo lead entra no topo da coluna
      const first = await prisma.lead.findFirst({
        where: { stageId: data.stageId },
        orderBy: { position: "asc" },
        select: { position: true },
      });
      await prisma.lead.create({
        data: { ...data, position: (first?.position ?? 0) - 1 },
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: id ? "update" : "create",
        entity: "Lead",
        entityId: id ?? undefined,
        meta: { name: parsed.data.name },
      },
    });

    revalidatePath("/crm");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

/**
 * Move um card entre colunas do kanban.
 * Recebe a ordem completa da coluna de destino para gravar as posições
 * de uma vez — evita ficar recalculando índice a índice.
 */
export async function moveLead(
  leadId: string,
  toStageId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  try {
    const session = await assertPermission("CRM", "edit");

    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: { stageId: toStageId },
      }),
      ...orderedIds.map((id, index) =>
        prisma.lead.update({ where: { id }, data: { position: index } }),
      ),
    ]);

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "update",
        entity: "Lead",
        entityId: leadId,
        meta: { moved: true },
      },
    });

    revalidatePath("/crm");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function deleteLead(id: string): Promise<ActionResult> {
  try {
    const session = await assertPermission("CRM", "delete");
    const lead = await prisma.lead.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "delete",
        entity: "Lead",
        entityId: id,
        meta: { name: lead.name },
      },
    });

    revalidatePath("/crm");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

/** Converte um lead ganho em cliente da carteira. */
export async function convertLeadToClient(
  leadId: string,
): Promise<ActionResult> {
  try {
    const session = await assertPermission("CRM", "edit");

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { ok: false, error: "Lead não encontrado." };
    if (lead.clientId) return { ok: false, error: "Este lead já virou cliente." };

    const wonStage = await prisma.pipelineStage.findFirst({
      where: { isWon: true },
    });

    const client = await prisma.client.create({
      data: {
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        status: "ATIVO",
        monthlyFee: lead.estimatedValue,
        contractStart: new Date(),
        ownerId: lead.ownerId ?? session.user.id,
      },
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: { clientId: client.id, stageId: wonStage?.id ?? lead.stageId },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "create",
        entity: "Client",
        entityId: client.id,
        meta: { fromLead: leadId, name: client.name },
      },
    });

    revalidatePath("/crm");
    revalidatePath("/clientes");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function addLeadNote(
  leadId: string,
  body: string,
): Promise<ActionResult> {
  try {
    const session = await assertPermission("CRM", "edit");
    if (!body.trim()) return { ok: false, error: "Escreva alguma coisa." };

    await prisma.leadNote.create({
      data: { leadId, body: body.trim(), authorId: session.user.id },
    });

    revalidatePath("/crm");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}
