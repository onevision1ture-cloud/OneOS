"use client";

import { motion } from "framer-motion";
import {
  Wallet,
  Megaphone,
  Users,
  Target,
  Receipt,
  PieChart as PieIcon,
  TrendingUp,
  Activity,
} from "lucide-react";

import { formatBRL, formatCompactBRL } from "@/lib/utils";
import { KpiCard } from "@/components/ui/kpi-card";
import { InfoHint } from "@/components/ui/info-hint";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, SectionTitle, EmptyState } from "@/components/ui/page-header";

type Kpis = {
  mrr: number;
  managedSpend: number;
  activeClients: number;
  pipeline: number;
  ticket: number;
  conversion: number;
  fixedCost: number;
  margin: number;
  marginPct: number;
  openLeads: number;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardView({
  userName,
  canSeeFinance,
  kpis,
  funnel,
  bySegment,
  topClients,
  activities,
}: {
  userName: string;
  canSeeFinance: boolean;
  kpis: Kpis;
  funnel: Array<{ name: string; color: string; count: number; value: number }>;
  bySegment: Array<{ name: string; value: number }>;
  topClients: Array<{
    id: string;
    name: string;
    company: string | null;
    fee: number;
    budget: number;
  }>;
  activities: Array<{
    id: string;
    action: string;
    entity: string | null;
    userName: string;
    createdAt: string;
  }>;
}) {
  const firstName = userName.split(" ")[0];
  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);
  const totalSegment = bySegment.reduce((s, x) => s + x.value, 0);

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle="Aqui está o panorama da operação hoje."
      />

      {/* KPIs principais */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          index={0}
          accent
          label="MRR"
          hint="Receita Recorrente Mensal: a soma dos fees fixos de todos os clientes ativos. É o dinheiro que entra todo mês sem depender de venda nova."
          value={kpis.mrr}
          format={formatBRL}
          icon={Wallet}
        />
        <KpiCard
          index={1}
          label="Verba sob gestão"
          hint="Total de investimento em mídia que a agência administra por mês, somando a verba de todos os clientes ativos. Não é receita da agência. É o dinheiro do cliente que passa pela nossa mão."
          value={kpis.managedSpend}
          format={formatBRL}
          icon={Megaphone}
        />
        <KpiCard
          index={2}
          label="Clientes ativos"
          hint="Clientes com contrato em andamento neste momento. Não inclui pausados nem encerrados."
          value={kpis.activeClients}
          format={(n) => Math.round(n).toString()}
          icon={Users}
        />
        <KpiCard
          index={3}
          label="Pipeline"
          hint="Valor somado de todas as oportunidades ainda em aberto no CRM. Não conta o que já foi ganho ou perdido."
          value={kpis.pipeline}
          format={formatBRL}
          icon={Target}
        />
      </div>

      {/* segunda linha */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          index={4}
          label="Ticket médio"
          hint="Fee médio por cliente ativo: o MRR dividido pelo número de clientes. Serve para saber se a carteira está subindo de patamar."
          value={kpis.ticket}
          format={formatBRL}
          icon={Receipt}
        />
        <KpiCard
          index={5}
          label="Conversão"
          hint="Percentual de leads que viraram clientes, considerando só os leads já encerrados (ganhos + perdidos). Mede a eficiência do comercial."
          value={kpis.conversion}
          format={(n) => `${n.toFixed(1)}%`}
          icon={TrendingUp}
        />
        {canSeeFinance && (
          <>
            <KpiCard
              index={6}
              label="Custo fixo"
              hint="Soma mensal da folha da equipe com as assinaturas de ferramentas. Assinaturas anuais entram divididas por 12."
              value={kpis.fixedCost}
              format={formatBRL}
              icon={PieIcon}
            />
            <KpiCard
              index={7}
              label="Margem"
              hint="O que sobra do MRR depois de descontar o custo fixo mensal. É o resultado antes de impostos e custos variáveis."
              value={kpis.margin}
              format={formatBRL}
              delta={kpis.marginPct}
              deltaLabel="do MRR"
              icon={Activity}
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* funil */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="lg:col-span-2"
        >
          <Card className="h-full">
            <CardContent className="pt-5">
              <SectionTitle
                hint={
                  <InfoHint text="Quantas oportunidades estão paradas em cada etapa do CRM. Etapas travadas indicam onde o processo comercial está perdendo tempo." />
                }
              >
                Funil de captação
              </SectionTitle>

              {funnel.every((f) => f.count === 0) ? (
                <EmptyState
                  icon={Target}
                  title="Nenhum lead no funil"
                  message="Cadastre oportunidades no CRM para acompanhar a evolução aqui."
                />
              ) : (
                <div className="space-y-3">
                  {funnel.map((stage, i) => (
                    <div key={stage.name}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-medium text-fg-soft">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: stage.color }}
                          />
                          {stage.name}
                        </span>
                        <span className="tabular-nums text-fg-muted">
                          {stage.count} · {formatCompactBRL(stage.value)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: stage.color }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(stage.count / maxFunnel) * 100}%`,
                          }}
                          transition={{
                            duration: 0.7,
                            delay: 0.25 + i * 0.07,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* receita por segmento */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.45 }}
        >
          <Card className="h-full">
            <CardContent className="pt-5">
              <SectionTitle
                hint={
                  <InfoHint text="Como o MRR se divide entre os segmentos de mercado dos clientes. Concentração alta em um segmento é um risco se aquele mercado esfriar." />
                }
              >
                Receita por segmento
              </SectionTitle>

              {bySegment.length === 0 ? (
                <EmptyState icon={PieIcon} title="Sem dados ainda" />
              ) : (
                <div className="space-y-3">
                  {bySegment.map((seg, i) => {
                    const pct =
                      totalSegment > 0 ? (seg.value / totalSegment) * 100 : 0;
                    return (
                      <div key={seg.name}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-fg-soft">
                            {seg.name}
                          </span>
                          <span className="tabular-nums text-fg-muted">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                          <motion.div
                            className="h-full rounded-full bg-brand"
                            style={{ opacity: 1 - i * 0.13 }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{
                              duration: 0.7,
                              delay: 0.3 + i * 0.07,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* maiores clientes */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.45 }}
        >
          <Card className="h-full">
            <CardContent className="pt-5">
              <SectionTitle
                hint={
                  <InfoHint text="Os cinco clientes com maior fee mensal. Se os dois primeiros somam muito do total, a agência está exposta à saída de poucos contratos." />
                }
              >
                Maiores contas
              </SectionTitle>

              {topClients.length === 0 ? (
                <EmptyState icon={Users} title="Nenhum cliente ativo" />
              ) : (
                <div className="space-y-1">
                  {topClients.map((c, i) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-2"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-3 text-[11px] font-semibold tabular-nums text-fg-muted">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {c.name}
                          </div>
                          <div className="truncate text-xs text-fg-muted">
                            Verba {formatCompactBRL(c.budget)}/mês
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-brand">
                        {formatBRL(c.fee)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* atividade */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.45 }}
        >
          <Card className="h-full">
            <CardContent className="pt-5">
              <SectionTitle
                hint={
                  <InfoHint text="Registro do que aconteceu no sistema: quem entrou, o que foi criado, alterado ou removido. Serve para auditoria." />
                }
              >
                Atividade recente
              </SectionTitle>

              {activities.length === 0 ? (
                <EmptyState icon={Activity} title="Nada registrado ainda" />
              ) : (
                <div className="space-y-3">
                  {activities.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 text-xs">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-fg">{a.userName}</span>{" "}
                        <span className="text-fg-muted">
                          {describeAction(a.action, a.entity)}
                        </span>
                        <div className="mt-0.5 text-[11px] text-fg-muted">
                          {new Date(a.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function describeAction(action: string, entity: string | null) {
  const map: Record<string, string> = {
    login: "entrou no sistema",
    create: "criou",
    update: "atualizou",
    delete: "removeu",
  };
  const verb = map[action] ?? action;
  const target: Record<string, string> = {
    User: "um usuário",
    Client: "um cliente",
    Lead: "um lead",
    Contract: "um contrato",
    Role: "um cargo",
    FileNode: "um arquivo",
    Tool: "uma ferramenta",
  };
  if (action === "login") return verb;
  return entity ? `${verb} ${target[entity] ?? entity}` : verb;
}
