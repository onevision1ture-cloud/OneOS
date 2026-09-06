import type { Metadata } from "next";

import { requirePage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";
import { ClientsView, type ClientRow } from "./clients-view";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const session = await requirePage("CLIENTES");

  const clients = await prisma.client.findMany({
    orderBy: [{ status: "asc" }, { monthlyFee: "desc" }],
    include: {
      services: { select: { service: true } },
      owner: { select: { name: true } },
    },
  });

  const rows: ClientRow[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    cnpj: c.cnpj,
    email: c.email,
    phone: c.phone,
    website: c.website,
    segment: c.segment,
    city: c.city,
    state: c.state,
    status: c.status,
    monthlyBudget: num(c.monthlyBudget),
    monthlyFee: num(c.monthlyFee),
    contractStart: c.contractStart?.toISOString() ?? null,
    contractEnd: c.contractEnd?.toISOString() ?? null,
    notes: c.notes,
    services: c.services.map((s) => s.service),
    ownerName: c.owner?.name ?? null,
  }));

  const perms = session.user.permissions.CLIENTES;

  return (
    <ClientsView
      clients={rows}
      canCreate={perms.canCreate}
      canEdit={perms.canEdit}
      canDelete={perms.canDelete}
    />
  );
}
