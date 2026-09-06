import type { Metadata } from "next";

import { requirePage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";
import { KanbanClient } from "./kanban-client";
import type { LeadCard, Stage } from "./kanban-view";

export const metadata: Metadata = { title: "CRM" };

export default async function CrmPage() {
  const session = await requirePage("CRM");

  const [stages, leads, members] = await Promise.all([
    prisma.pipelineStage.findMany({ orderBy: { position: "asc" } }),
    prisma.lead.findMany({
      orderBy: [{ stageId: "asc" }, { position: "asc" }],
      include: {
        owner: { select: { name: true } },
        _count: { select: { notes: true } },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const stageRows: Stage[] = stages.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    position: s.position,
    isWon: s.isWon,
    isLost: s.isLost,
  }));

  const leadRows: LeadCard[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    company: l.company,
    email: l.email,
    phone: l.phone,
    source: l.source,
    temperature: l.temperature,
    estimatedValue: num(l.estimatedValue),
    stageId: l.stageId,
    position: l.position,
    ownerId: l.ownerId,
    ownerName: l.owner?.name ?? null,
    clientId: l.clientId,
    expectedCloseAt: l.expectedCloseAt?.toISOString() ?? null,
    notesCount: l._count.notes,
  }));

  const perms = session.user.permissions.CRM;

  return (
    <KanbanClient
      stages={stageRows}
      leads={leadRows}
      members={members}
      canCreate={perms.canCreate}
      canEdit={perms.canEdit}
      canDelete={perms.canDelete}
    />
  );
}
