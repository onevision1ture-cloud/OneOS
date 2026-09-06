import type { Metadata } from "next";

import { requirePage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { FilesClient } from "./files-client";
import type { FileRow } from "./files-view";

export const metadata: Metadata = { title: "Arquivos" };

export default async function ArquivosPage() {
  const session = await requirePage("ARQUIVOS");

  const [nodes, clients] = await Promise.all([
    prisma.fileNode.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: {
        client: { select: { name: true } },
        uploader: { select: { name: true } },
      },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: FileRow[] = nodes.map((n) => ({
    id: n.id,
    name: n.name,
    kind: n.kind,
    url: n.url,
    parentId: n.parentId,
    position: n.position,
    clientId: n.clientId,
    clientName: n.client?.name ?? null,
    uploaderName: n.uploader?.name ?? null,
    createdAt: n.createdAt.toISOString(),
  }));

  const perms = session.user.permissions.ARQUIVOS;

  return (
    <FilesClient
      nodes={rows}
      clients={clients}
      canCreate={perms.canCreate}
      canEdit={perms.canEdit}
      canDelete={perms.canDelete}
    />
  );
}
