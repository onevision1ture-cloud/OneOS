import type { Metadata } from "next";

import { requirePage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";
import { ContractsView, type ContractRow } from "./contracts-view";

export const metadata: Metadata = { title: "Contratos" };

export default async function ContratosPage() {
  const session = await requirePage("CONTRATOS");

  const [contracts, clients] = await Promise.all([
    prisma.contract.findMany({
      orderBy: [{ status: "asc" }, { endAt: "asc" }],
      include: {
        client: { select: { name: true } },
        owner: { select: { name: true } },
      },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: ContractRow[] = contracts.map((c) => ({
    id: c.id,
    title: c.title,
    clientId: c.clientId,
    clientName: c.client?.name ?? null,
    value: num(c.value),
    startAt: c.startAt?.toISOString() ?? null,
    endAt: c.endAt?.toISOString() ?? null,
    status: c.status,
    fileUrl: c.fileUrl,
    notes: c.notes,
    ownerName: c.owner?.name ?? null,
  }));

  const perms = session.user.permissions.CONTRATOS;

  return (
    <ContractsView
      contracts={rows}
      clients={clients}
      canCreate={perms.canCreate}
      canEdit={perms.canEdit}
      canDelete={perms.canDelete}
    />
  );
}
