import type { Metadata } from "next";

import { requirePage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "Início" };

export default async function InicioPage() {
  const session = await requirePage("INICIO");

  const [clients, stages, leads, payrolls, tools, activities] =
    await Promise.all([
      prisma.client.findMany({
        select: {
          id: true,
          name: true,
          company: true,
          status: true,
          monthlyFee: true,
          monthlyBudget: true,
          segment: true,
        },
      }),
      prisma.pipelineStage.findMany({ orderBy: { position: "asc" } }),
      prisma.lead.findMany({
        select: {
          id: true,
          name: true,
          company: true,
          estimatedValue: true,
          stageId: true,
          temperature: true,
          createdAt: true,
        },
      }),
      prisma.payroll.findMany({ where: { isActive: true } }),
      prisma.tool.findMany({ where: { isActive: true } }),
      prisma.activityLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, avatarUrl: true } } },
      }),
    ]);

  const active = clients.filter((c) => c.status === "ATIVO");

  const mrr = active.reduce((sum, c) => sum + num(c.monthlyFee), 0);
  const managedSpend = active.reduce((sum, c) => sum + num(c.monthlyBudget), 0);

  const wonStage = stages.find((s) => s.isWon);
  const lostStage = stages.find((s) => s.isLost);
  const openLeads = leads.filter(
    (l) => l.stageId !== wonStage?.id && l.stageId !== lostStage?.id,
  );
  const pipeline = openLeads.reduce((sum, l) => sum + num(l.estimatedValue), 0);

  const won = leads.filter((l) => l.stageId === wonStage?.id).length;
  const lost = leads.filter((l) => l.stageId === lostStage?.id).length;
  const closed = won + lost;
  const conversion = closed > 0 ? (won / closed) * 100 : 0;

  // Custo fixo mensal: folha + ferramentas (anual dividido por 12).
  const payrollCost = payrolls.reduce((sum, p) => sum + num(p.amount), 0);
  const toolsCost = tools.reduce((sum, t) => {
    const c = num(t.cost);
    if (t.cycle === "ANUAL") return sum + c / 12;
    if (t.cycle === "UNICO") return sum;
    return sum + c;
  }, 0);
  const fixedCost = payrollCost + toolsCost;

  const ticket = active.length > 0 ? mrr / active.length : 0;
  const margin = mrr - fixedCost;
  const marginPct = mrr > 0 ? (margin / mrr) * 100 : 0;

  // distribuição do pipeline por etapa, para o gráfico
  const funnel = stages
    .filter((s) => !s.isLost)
    .map((s) => ({
      name: s.name,
      color: s.color,
      count: leads.filter((l) => l.stageId === s.id).length,
      value: leads
        .filter((l) => l.stageId === s.id)
        .reduce((sum, l) => sum + num(l.estimatedValue), 0),
    }));

  const bySegment = Object.entries(
    active.reduce<Record<string, number>>((acc, c) => {
      const key = c.segment ?? "Outros";
      acc[key] = (acc[key] ?? 0) + num(c.monthlyFee);
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const canSeeFinance = session.user.permissions.FINANCEIRO?.canView ?? false;

  return (
    <DashboardView
      userName={session.user.name ?? "Usuário"}
      canSeeFinance={canSeeFinance}
      kpis={{
        mrr,
        managedSpend,
        activeClients: active.length,
        pipeline,
        ticket,
        conversion,
        fixedCost,
        margin,
        marginPct,
        openLeads: openLeads.length,
      }}
      funnel={funnel}
      bySegment={bySegment}
      topClients={active
        .slice()
        .sort((a, b) => num(b.monthlyFee) - num(a.monthlyFee))
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          name: c.name,
          company: c.company,
          fee: num(c.monthlyFee),
          budget: num(c.monthlyBudget),
        }))}
      activities={activities.map((a) => ({
        id: a.id,
        action: a.action,
        entity: a.entity,
        userName: a.user?.name ?? "Sistema",
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
