import type { Metadata } from "next";

import { requirePage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";
import {
  FinanceView,
  type PayrollRow,
  type ToolRow,
  type TxRow,
  type InvoiceRow,
} from "./finance-view";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  const session = await requirePage("FINANCEIRO");

  const [clients, payrolls, tools, transactions, invoices, members] =
    await Promise.all([
      prisma.client.findMany({
        where: { status: "ATIVO" },
        select: { monthlyFee: true },
      }),
      prisma.payroll.findMany({
        orderBy: { amount: "desc" },
        include: { user: { select: { name: true, jobTitle: true } } },
      }),
      prisma.tool.findMany({ orderBy: [{ isActive: "desc" }, { cost: "desc" }] }),
      prisma.transaction.findMany({ orderBy: { date: "desc" }, take: 50 }),
      prisma.invoice.findMany({
        orderBy: { dueAt: "asc" },
        include: { client: { select: { name: true } } },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const mrr = clients.reduce((s, c) => s + num(c.monthlyFee), 0);

  const payrollRows: PayrollRow[] = payrolls.map((p) => ({
    id: p.id,
    userId: p.userId,
    userName: p.user.name,
    jobTitle: p.user.jobTitle,
    amount: num(p.amount),
    kind: p.kind,
    dueDay: p.dueDay,
    isActive: p.isActive,
    notes: p.notes,
  }));

  const toolRows: ToolRow[] = tools.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    cost: num(t.cost),
    cycle: t.cycle,
    renewsAt: t.renewsAt?.toISOString() ?? null,
    isActive: t.isActive,
    url: t.url,
    notes: t.notes,
  }));

  const txRows: TxRow[] = transactions.map((t) => ({
    id: t.id,
    description: t.description,
    amount: num(t.amount),
    type: t.type,
    category: t.category,
    date: t.date.toISOString(),
  }));

  const invoiceRows: InvoiceRow[] = invoices.map((i) => ({
    id: i.id,
    clientName: i.client.name,
    amount: num(i.amount),
    dueAt: i.dueAt.toISOString(),
    paidAt: i.paidAt?.toISOString() ?? null,
    status: i.status,
    reference: i.reference,
  }));

  const perms = session.user.permissions.FINANCEIRO;

  return (
    <FinanceView
      mrr={mrr}
      payrolls={payrollRows}
      tools={toolRows}
      transactions={txRows}
      invoices={invoiceRows}
      members={members}
      canCreate={perms.canCreate}
      canEdit={perms.canEdit}
      canDelete={perms.canDelete}
    />
  );
}
