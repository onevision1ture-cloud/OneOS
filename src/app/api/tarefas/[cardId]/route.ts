import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

/**
 * Checklist e comentários de uma tarefa.
 * O painel de detalhes busca sob demanda, para a lista do quadro
 * não precisar carregar tudo de uma vez.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  if (!can(session.user.permissions, "TAREFAS", "view")) {
    return NextResponse.json({ error: "sem permissão" }, { status: 403 });
  }

  const { cardId } = await params;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      assigneeId: true,
      checklist: {
        orderBy: { position: "asc" },
        select: { id: true, text: true, done: true },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      },
    },
  });

  if (!card) {
    return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    assigneeId: card.assigneeId,
    itens: card.checklist,
    comentarios: card.comments.map((c) => ({
      id: c.id,
      body: c.body,
      autor: c.author?.name ?? "Alguém",
      criadoEm: c.createdAt.toISOString(),
    })),
  });
}
