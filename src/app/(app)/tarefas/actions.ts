"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/guard";
import { auth } from "@/lib/auth";
import { messageFor, type ActionResult } from "@/lib/action-result";

/**
 * Os quadros são da equipe, não de uma pessoa: quem tem permissão em
 * Tarefas enxerga e edita todos. O `ownerId` fica guardado apenas como
 * registro de quem criou o quadro.
 *
 * A checagem confirma a permissão e que o quadro existe.
 */
async function quadroAcessivel(boardId: string, acao: "edit" | "delete" = "edit") {
  const session = await assertPermission("TAREFAS", acao);
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true },
  });
  if (!board) throw new Error("QUADRO_NAO_ENCONTRADO");
  return session;
}

// ─────────────────────────── QUADROS ───────────────────────────

const boardSchema = z.object({
  name: z.string().min(1, "Dê um nome ao quadro"),
  icon: z.string().default("📋"),
  color: z.string().default("#E11D2E"),
  bannerUrl: z.string().optional(),
  background: z.string().optional(),
  description: z.string().optional(),
});

export type BoardInput = {
  name: string;
  icon: string;
  color: string;
  bannerUrl?: string;
  background?: string;
  description?: string;
};

/** Colunas que todo quadro novo ganha, para não nascer vazio. */
const COLUNAS_INICIAIS = [
  { name: "A fazer", color: "#64748B", position: 0 },
  { name: "Em andamento", color: "#3B82F6", position: 1 },
  { name: "Revisão", color: "#F59E0B", position: 2 },
  { name: "Concluído", color: "#22C55E", position: 3 },
];

const ETIQUETAS_INICIAIS = [
  { name: "Urgente", color: "#EF4444" },
  { name: "Cliente", color: "#3B82F6" },
  { name: "Interno", color: "#8B5CF6" },
  { name: "Criativo", color: "#EC4899" },
  { name: "Aguardando", color: "#F59E0B" },
];

export type CriarQuadroResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function criarQuadro(
  input: BoardInput,
): Promise<CriarQuadroResult> {
  try {
    const session = await assertPermission("TAREFAS", "create");
    const parsed = boardSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }

    const ultimo = await prisma.board.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const board = await prisma.board.create({
      data: {
        ...parsed.data,
        bannerUrl: parsed.data.bannerUrl || null,
        background: parsed.data.background || null,
        description: parsed.data.description || null,
        ownerId: session.user.id,
        position: (ultimo?.position ?? -1) + 1,
        columns: { create: COLUNAS_INICIAIS },
        labels: { create: ETIQUETAS_INICIAIS },
      },
    });

    revalidatePath("/tarefas");
    return { ok: true, id: board.id };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function salvarQuadro(
  id: string,
  input: BoardInput,
): Promise<ActionResult> {
  try {
    await quadroAcessivel(id);
    const parsed = boardSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }

    await prisma.board.update({
      where: { id },
      data: {
        ...parsed.data,
        bannerUrl: parsed.data.bannerUrl || null,
        background: parsed.data.background || null,
        description: parsed.data.description || null,
      },
    });

    revalidatePath("/tarefas");
    revalidatePath(`/tarefas/${id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function excluirQuadro(id: string): Promise<ActionResult> {
  try {
    await quadroAcessivel(id, "delete");
    await prisma.board.delete({ where: { id } });
    revalidatePath("/tarefas");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

// ─────────────────────────── COLUNAS ───────────────────────────

export async function criarColuna(
  boardId: string,
  name: string,
  color = "#64748B",
): Promise<ActionResult> {
  try {
    await quadroAcessivel(boardId);
    if (!name.trim()) return { ok: false, error: "Dê um nome à coluna." };

    const ultima = await prisma.boardColumn.findFirst({
      where: { boardId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    await prisma.boardColumn.create({
      data: {
        boardId,
        name: name.trim(),
        color,
        position: (ultima?.position ?? -1) + 1,
      },
    });

    revalidatePath(`/tarefas/${boardId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function salvarColuna(
  columnId: string,
  name: string,
  color: string,
): Promise<ActionResult> {
  try {
    const coluna = await prisma.boardColumn.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    });
    if (!coluna) return { ok: false, error: "Coluna não encontrada." };
    await quadroAcessivel(coluna.boardId);

    if (!name.trim()) return { ok: false, error: "Dê um nome à coluna." };

    await prisma.boardColumn.update({
      where: { id: columnId },
      data: { name: name.trim(), color },
    });

    revalidatePath(`/tarefas/${coluna.boardId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function excluirColuna(columnId: string): Promise<ActionResult> {
  try {
    const coluna = await prisma.boardColumn.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    });
    if (!coluna) return { ok: false, error: "Coluna não encontrada." };
    await quadroAcessivel(coluna.boardId);

    await prisma.boardColumn.delete({ where: { id: columnId } });
    revalidatePath(`/tarefas/${coluna.boardId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

/** Reordena as colunas depois de arrastar. */
export async function reordenarColunas(
  boardId: string,
  ordem: string[],
): Promise<ActionResult> {
  try {
    await quadroAcessivel(boardId);
    await prisma.$transaction(
      ordem.map((id, index) =>
        prisma.boardColumn.update({ where: { id }, data: { position: index } }),
      ),
    );
    revalidatePath(`/tarefas/${boardId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

// ─────────────────────────── TAREFAS (cards) ───────────────────────────

const cardSchema = z.object({
  title: z.string().min(1, "Dê um nome à tarefa"),
  description: z.string().optional(),
  dueAt: z.string().optional(),
  startAt: z.string().optional(),
  assigneeId: z.string().optional(),
  coverColor: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  isDone: z.boolean().optional(),
});

export type CardInput = {
  title: string;
  description?: string;
  dueAt?: string;
  startAt?: string;
  assigneeId?: string;
  coverColor?: string;
  labelIds?: string[];
  isDone?: boolean;
};

function paraData(valor?: string) {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type CriarTarefaResult =
  | { ok: true; card: { id: string; title: string; position: number } }
  | { ok: false; error: string };

export async function criarTarefa(
  columnId: string,
  input: CardInput,
): Promise<CriarTarefaResult> {
  try {
    const coluna = await prisma.boardColumn.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    });
    if (!coluna) return { ok: false, error: "Coluna não encontrada." };
    await quadroAcessivel(coluna.boardId);

    const parsed = cardSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }

    const primeira = await prisma.card.findFirst({
      where: { columnId },
      orderBy: { position: "asc" },
      select: { position: true },
    });

    const { labelIds, dueAt, startAt, assigneeId, ...resto } = parsed.data;

    const card = await prisma.card.create({
      data: {
        ...resto,
        description: resto.description || null,
        coverColor: resto.coverColor || null,
        boardId: coluna.boardId,
        columnId,
        assigneeId: assigneeId || null,
        dueAt: paraData(dueAt),
        startAt: paraData(startAt),
        position: (primeira?.position ?? 0) - 1,
        ...(labelIds?.length
          ? { labels: { create: labelIds.map((labelId) => ({ labelId })) } }
          : {}),
      },
      select: { id: true, title: true, position: true },
    });

    revalidatePath(`/tarefas/${coluna.boardId}`);
    return { ok: true, card };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function salvarTarefa(
  cardId: string,
  input: CardInput,
): Promise<ActionResult> {
  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { boardId: true },
    });
    if (!card) return { ok: false, error: "Tarefa não encontrada." };
    await quadroAcessivel(card.boardId);

    const parsed = cardSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }

    const { labelIds, dueAt, startAt, assigneeId, ...resto } = parsed.data;

    await prisma.card.update({
      where: { id: cardId },
      data: {
        ...resto,
        description: resto.description || null,
        coverColor: resto.coverColor || null,
        assigneeId: assigneeId || null,
        dueAt: paraData(dueAt),
        startAt: paraData(startAt),
      },
    });

    // Reescreve as etiquetas: apaga as antigas e grava as marcadas.
    if (labelIds) {
      await prisma.cardLabel.deleteMany({ where: { cardId } });
      if (labelIds.length) {
        await prisma.cardLabel.createMany({
          data: labelIds.map((labelId) => ({ cardId, labelId })),
        });
      }
    }

    revalidatePath(`/tarefas/${card.boardId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function excluirTarefa(cardId: string): Promise<ActionResult> {
  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { boardId: true },
    });
    if (!card) return { ok: false, error: "Tarefa não encontrada." };
    await quadroAcessivel(card.boardId);

    await prisma.card.delete({ where: { id: cardId } });
    revalidatePath(`/tarefas/${card.boardId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

/** Move a tarefa entre colunas e grava a nova ordem de uma vez. */
export async function moverTarefa(
  cardId: string,
  columnId: string,
  ordem: string[],
): Promise<ActionResult> {
  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { boardId: true },
    });
    if (!card) return { ok: false, error: "Tarefa não encontrada." };
    await quadroAcessivel(card.boardId);

    await prisma.$transaction([
      prisma.card.update({ where: { id: cardId }, data: { columnId } }),
      ...ordem.map((id, index) =>
        prisma.card.update({ where: { id }, data: { position: index } }),
      ),
    ]);

    revalidatePath(`/tarefas/${card.boardId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

// ─────────────────────────── CHECKLIST ───────────────────────────

export async function adicionarItem(
  cardId: string,
  text: string,
): Promise<ActionResult> {
  try {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { boardId: true },
    });
    if (!card) return { ok: false, error: "Tarefa não encontrada." };
    await quadroAcessivel(card.boardId);
    if (!text.trim()) return { ok: false, error: "Escreva o item." };

    const ultimo = await prisma.cardCheckItem.findFirst({
      where: { cardId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    await prisma.cardCheckItem.create({
      data: { cardId, text: text.trim(), position: (ultimo?.position ?? -1) + 1 },
    });

    revalidatePath(`/tarefas/${card.boardId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function marcarItem(
  itemId: string,
  done: boolean,
): Promise<ActionResult> {
  try {
    const item = await prisma.cardCheckItem.findUnique({
      where: { id: itemId },
      select: { card: { select: { boardId: true } } },
    });
    if (!item) return { ok: false, error: "Item não encontrado." };
    await quadroAcessivel(item.card.boardId);

    await prisma.cardCheckItem.update({ where: { id: itemId }, data: { done } });
    revalidatePath(`/tarefas/${item.card.boardId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function excluirItem(itemId: string): Promise<ActionResult> {
  try {
    const item = await prisma.cardCheckItem.findUnique({
      where: { id: itemId },
      select: { card: { select: { boardId: true } } },
    });
    if (!item) return { ok: false, error: "Item não encontrado." };
    await quadroAcessivel(item.card.boardId);

    await prisma.cardCheckItem.delete({ where: { id: itemId } });
    revalidatePath(`/tarefas/${item.card.boardId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

// ─────────────────────────── ETIQUETAS ───────────────────────────

export async function salvarEtiqueta(
  boardId: string,
  id: string | null,
  name: string,
  color: string,
): Promise<ActionResult> {
  try {
    await quadroAcessivel(boardId);
    if (!name.trim()) return { ok: false, error: "Dê um nome à etiqueta." };

    if (id) {
      await prisma.boardLabel.update({
        where: { id },
        data: { name: name.trim(), color },
      });
    } else {
      await prisma.boardLabel.create({
        data: { boardId, name: name.trim(), color },
      });
    }

    revalidatePath(`/tarefas/${boardId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function excluirEtiqueta(labelId: string): Promise<ActionResult> {
  try {
    const label = await prisma.boardLabel.findUnique({
      where: { id: labelId },
      select: { boardId: true },
    });
    if (!label) return { ok: false, error: "Etiqueta não encontrada." };
    await quadroAcessivel(label.boardId);

    await prisma.boardLabel.delete({ where: { id: labelId } });
    revalidatePath(`/tarefas/${label.boardId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

// ─────────────────────────── COMENTÁRIOS ───────────────────────────

export async function comentar(
  cardId: string,
  body: string,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("NAO_AUTENTICADO");

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { boardId: true },
    });
    if (!card) return { ok: false, error: "Tarefa não encontrada." };
    await quadroAcessivel(card.boardId);

    if (!body.trim()) return { ok: false, error: "Escreva o comentário." };

    await prisma.cardComment.create({
      data: { cardId, body: body.trim(), authorId: session.user.id },
    });

    revalidatePath(`/tarefas/${card.boardId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}
