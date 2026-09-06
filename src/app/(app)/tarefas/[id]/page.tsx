import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { BoardClient } from "./board-client";
import type { Coluna, Etiqueta, Tarefa } from "./board-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const board = await prisma.board.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: board?.name ?? "Quadro" };
}

export default async function QuadroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePage("TAREFAS");
  const { id } = await params;

  const board = await prisma.board.findUnique({
    where: { id },
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

  if (!board) notFound();

  const colunas: Coluna[] = board.columns.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    position: c.position,
  }));

  const etiquetas: Etiqueta[] = board.labels.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
  }));

  const tarefas: Tarefa[] = board.cards.map((c) => ({
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
  }));

  const members = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const perms = session.user.permissions.TAREFAS;

  return (
    <BoardClient
      board={{
        id: board.id,
        name: board.name,
        icon: board.icon,
        color: board.color,
        background: board.background,
        bannerUrl: board.bannerUrl,
        description: board.description,
      }}
      columns={colunas}
      cards={tarefas}
      labels={etiquetas}
      members={members}
      canEdit={perms.canEdit}
      canDelete={perms.canDelete}
    />
  );
}
