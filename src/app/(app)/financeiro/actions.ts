"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/guard";
import { messageFor, type ActionResult } from "@/lib/action-result";

// ── Folha da equipe ──

const payrollSchema = z.object({
  userId: z.string().min(1, "Escolha a pessoa"),
  amount: z.coerce.number().min(0),
  kind: z.enum(["SALARIO", "PRO_LABORE", "FREELA", "COMISSAO", "BONUS"]),
  dueDay: z.coerce.number().min(1).max(31),
  isActive: z.boolean(),
  notes: z.string().optional(),
});

export type PayrollInput = {
  userId: string;
  amount: number | string;
  kind: "SALARIO" | "PRO_LABORE" | "FREELA" | "COMISSAO" | "BONUS";
  dueDay: number | string;
  isActive: boolean;
  notes?: string;
};

export async function savePayroll(
  id: string | null,
  input: PayrollInput,
): Promise<ActionResult> {
  try {
    await assertPermission("FINANCEIRO", id ? "edit" : "create");
    const parsed = payrollSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    if (id) {
      await prisma.payroll.update({ where: { id }, data: parsed.data });
    } else {
      await prisma.payroll.create({ data: parsed.data });
    }

    revalidatePath("/financeiro");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function deletePayroll(id: string): Promise<ActionResult> {
  try {
    await assertPermission("FINANCEIRO", "delete");
    await prisma.payroll.delete({ where: { id } });
    revalidatePath("/financeiro");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

// ── Ferramentas ──

const toolSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  category: z.string().optional(),
  cost: z.coerce.number().min(0),
  cycle: z.enum(["MENSAL", "ANUAL", "UNICO"]),
  renewsAt: z.string().optional(),
  isActive: z.boolean(),
  url: z.string().optional(),
  notes: z.string().optional(),
});

export type ToolInput = {
  name: string;
  category?: string;
  cost: number | string;
  cycle: "MENSAL" | "ANUAL" | "UNICO";
  renewsAt?: string;
  isActive: boolean;
  url?: string;
  notes?: string;
};

export async function saveTool(
  id: string | null,
  input: ToolInput,
): Promise<ActionResult> {
  try {
    await assertPermission("FINANCEIRO", id ? "edit" : "create");
    const parsed = toolSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const { renewsAt, ...rest } = parsed.data;
    const data = {
      ...rest,
      renewsAt: renewsAt ? new Date(renewsAt) : null,
    };

    if (id) {
      await prisma.tool.update({ where: { id }, data });
    } else {
      await prisma.tool.create({ data });
    }

    revalidatePath("/financeiro");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function deleteTool(id: string): Promise<ActionResult> {
  try {
    await assertPermission("FINANCEIRO", "delete");
    await prisma.tool.delete({ where: { id } });
    revalidatePath("/financeiro");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

// ── Lançamentos ──

const txSchema = z.object({
  description: z.string().min(1, "Descreva o lançamento"),
  amount: z.coerce.number().min(0),
  type: z.enum(["ENTRADA", "SAIDA"]),
  category: z.string().optional(),
  date: z.string().optional(),
});

export type TransactionInput = {
  description: string;
  amount: number | string;
  type: "ENTRADA" | "SAIDA";
  category?: string;
  date?: string;
};

export async function saveTransaction(
  id: string | null,
  input: TransactionInput,
): Promise<ActionResult> {
  try {
    await assertPermission("FINANCEIRO", id ? "edit" : "create");
    const parsed = txSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const { date, ...rest } = parsed.data;
    const data = { ...rest, date: date ? new Date(date) : new Date() };

    if (id) {
      await prisma.transaction.update({ where: { id }, data });
    } else {
      await prisma.transaction.create({ data });
    }

    revalidatePath("/financeiro");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  try {
    await assertPermission("FINANCEIRO", "delete");
    await prisma.transaction.delete({ where: { id } });
    revalidatePath("/financeiro");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

/** Marca uma fatura como paga ou volta para pendente. */
export async function toggleInvoicePaid(
  id: string,
  paid: boolean,
): Promise<ActionResult> {
  try {
    await assertPermission("FINANCEIRO", "edit");
    await prisma.invoice.update({
      where: { id },
      data: {
        status: paid ? "PAGO" : "PENDENTE",
        paidAt: paid ? new Date() : null,
      },
    });
    revalidatePath("/financeiro");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}
