import type { Metadata } from "next";

import { requirePage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { BoardsView, type BoardRow } from "./boards-view";

export const metadata: Metadata = { title: "Tarefas" };

export default async function TarefasPage() {
  const session = await requirePage("TAREFAS");

  // Os quadros são da equipe: quem tem acesso a Tarefas vê todos.
  const boards = await prisma.board.findMany({
    orderBy: { position: "asc" },
    include: {
      _count: { select: { cards: true, columns: true } },
    },
  });

  const rows: BoardRow[] = boards.map((b) => ({
    id: b.id,
    name: b.name,
    icon: b.icon,
    color: b.color,
    bannerUrl: b.bannerUrl,
    background: b.background,
    description: b.description,
    totalCards: b._count.cards,
    totalColumns: b._count.columns,
  }));

  const perms = session.user.permissions.TAREFAS;

  return (
    <BoardsView
      boards={rows}
      canCreate={perms.canCreate}
      canEdit={perms.canEdit}
      canDelete={perms.canDelete}
    />
  );
}
