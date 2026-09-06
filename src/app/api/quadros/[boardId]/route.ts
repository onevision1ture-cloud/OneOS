import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

/**
 * Estado atual do quadro: colunas, tarefas e etiquetas.
 *
 * O quadro é renderizado só no cliente (o dnd-kit não sobrevive à
 * hidratação), então `router.refresh()` não devolve dados novos para ele.
 * Depois de cada alteração a tela busca aqui o retrato atualizado.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  if (!can(session.user.permissions, "TAREFAS", "view")) {
    return NextResponse.json({ error: "sem permissão" }, { status: 403 });
  }

  const { boardId } = await params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: { orderBy: { position: "asc" } },
      labels: { orderBy: { name: "asc" } },
      cards: {
        orderBy: { position: "asc" },
        include: {
          assignee: { select: { name: true } },
          labels: { include: { label: true } },
          _count: { select: { checklist: true, comments: true } },
          checklist: { where: { done: true }, select: { id: true } },
        },
      },
    },
  });

  if (!board) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    board: {
      id: board.id,
      name: board.name,
      icon: board.icon,
      color: board.color,
      background: board.background,
      bannerUrl: board.bannerUrl,
      description: board.description,
    },
    columns: board.columns.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      position: c.position,
    })),
    labels: board.labels.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
    })),
    cards: board.cards.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      columnId: c.columnId,
      position: c.position,
      dueAt: c.dueAt?.toISOString() ?? null,
      isDone: c.isDone,
      coverColor: c.coverColor,
      assigneeName: c.assignee?.name ?? null,
      labels: c.labels.map((cl) => ({
        id: cl.label.id,
        name: cl.label.name,
        color: cl.label.color,
      })),
      totalItens: c._count.checklist,
      itensFeitos: c.checklist.length,
      totalComentarios: c._count.comments,
    })),
  });
}
