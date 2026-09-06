"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  Users,
  Wrench,
  TrendingUp,
  TrendingDown,
  Check,
  ExternalLink,
} from "lucide-react";

import { cn, formatBRL, formatDate } from "@/lib/utils";
import { PAY_KIND, BILLING_CYCLE, INVOICE_STATUS } from "@/lib/labels";
import type { InvoiceStatus } from "@/generated/prisma";
import { PageHeader, EmptyState, SectionTitle } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { InfoHint } from "@/components/ui/info-hint";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  savePayroll,
  deletePayroll,
  saveTool,
  deleteTool,
  saveTransaction,
  deleteTransaction,
  toggleInvoicePaid,
  type PayrollInput,
  type ToolInput,
  type TransactionInput,
} from "./actions";

export type PayrollRow = {
  id: string;
  userId: string;
  userName: string;
  jobTitle: string | null;
  amount: number;
  kind: keyof typeof PAY_KIND;
  dueDay: number;
  isActive: boolean;
  notes: string | null;
};

export type ToolRow = {
  id: string;
  name: string;
  category: string | null;
  cost: number;
  cycle: keyof typeof BILLING_CYCLE;
  renewsAt: string | null;
  isActive: boolean;
  url: string | null;
  notes: string | null;
};

export type TxRow = {
  id: string;
  description: string;
  amount: number;
  type: "ENTRADA" | "SAIDA";
  category: string | null;
  date: string;
};

export type InvoiceRow = {
  id: string;
  clientName: string;
  amount: number;
  dueAt: string;
  paidAt: string | null;
  status: InvoiceStatus;
  reference: string | null;
};

export function FinanceView({
  mrr,
  payrolls,
  tools,
  transactions,
  invoices,
  members,
  canCreate,
  canEdit,
  canDelete,
}: {
  mrr: number;
  payrolls: PayrollRow[];
  tools: ToolRow[];
  transactions: TxRow[];
  invoices: InvoiceRow[];
  members: Array<{ id: string; name: string }>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [tab, setTab] = useState<"visao" | "folha" | "ferramentas" | "lancamentos">(
    "visao",
  );
  const [, startTransition] = useTransition();

  const [editingPayroll, setEditingPayroll] = useState<PayrollRow | null>(null);
  const [creatingPayroll, setCreatingPayroll] = useState(false);
  const [removingPayroll, setRemovingPayroll] = useState<PayrollRow | null>(null);

  const [editingTool, setEditingTool] = useState<ToolRow | null>(null);
  const [creatingTool, setCreatingTool] = useState(false);
  const [removingTool, setRemovingTool] = useState<ToolRow | null>(null);

  const [editingTx, setEditingTx] = useState<TxRow | null>(null);
  const [creatingTx, setCreatingTx] = useState(false);
  const [removingTx, setRemovingTx] = useState<TxRow | null>(null);

  const payrollTotal = payrolls
    .filter((p) => p.isActive)
    .reduce((s, p) => s + p.amount, 0);

  // assinatura anual entra dividida por 12 para comparar com o mês
  const toolsTotal = tools
    .filter((t) => t.isActive)
    .reduce((s, t) => {
      if (t.cycle === "ANUAL") return s + t.cost / 12;
      if (t.cycle === "UNICO") return s;
      return s + t.cost;
    }, 0);

  const fixedCost = payrollTotal + toolsTotal;
  const result = mrr - fixedCost;
  const marginPct = mrr > 0 ? (result / mrr) * 100 : 0;

  const pendingInvoices = invoices.filter((i) => i.status !== "PAGO");
  const toReceive = pendingInvoices.reduce((s, i) => s + i.amount, 0);

  const TABS = [
    { key: "visao", label: "Visão geral" },
    { key: "folha", label: `Folha (${payrolls.length})` },
    { key: "ferramentas", label: `Ferramentas (${tools.length})` },
    { key: "lancamentos", label: `Lançamentos (${transactions.length})` },
  ] as const;

  const addLabel = {
    visao: null,
    folha: "Adicionar à folha",
    ferramentas: "Nova ferramenta",
    lancamentos: "Novo lançamento",
  }[tab];

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Folha da equipe, ferramentas e resultado do mês"
        actions={
          canCreate &&
          addLabel && (
            <Button
              onClick={() => {
                if (tab === "folha") setCreatingPayroll(true);
                if (tab === "ferramentas") setCreatingTool(true);
                if (tab === "lancamentos") setCreatingTx(true);
              }}
            >
              <Plus className="size-4" />
              {addLabel}
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          index={0}
          accent
          label="Receita recorrente"
          hint="Soma dos fees mensais dos clientes ativos. É a base de tudo: a receita previsível da agência."
          value={mrr}
          format={formatBRL}
          icon={TrendingUp}
        />
        <KpiCard
          index={1}
          label="Custo fixo"
          hint="Folha da equipe somada às assinaturas de ferramentas. Assinaturas anuais entram divididas por 12 para comparar com o mês."
          value={fixedCost}
          format={formatBRL}
          icon={TrendingDown}
        />
        <KpiCard
          index={2}
          label="Resultado"
          hint="Receita menos custo fixo. É o que sobra antes de impostos e custos variáveis."
          value={result}
          format={formatBRL}
          delta={marginPct}
          deltaLabel="de margem"
          icon={Wallet}
        />
        <KpiCard
          index={3}
          label="A receber"
          hint="Faturas emitidas que ainda não foram pagas pelos clientes."
          value={toReceive}
          format={formatBRL}
          icon={Users}
        />
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface-1 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "text-brand-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {tab === t.key && (
              <motion.span
                layoutId="finance-tab"
                className="absolute inset-0 rounded-md bg-brand"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "visao" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle
              hint={
                <InfoHint text="Como o custo fixo se divide entre pagar pessoas e pagar softwares." />
              }
            >
              Composição do custo
            </SectionTitle>
            {fixedCost === 0 ? (
              <EmptyState icon={Wallet} title="Nenhum custo cadastrado" />
            ) : (
              <div className="space-y-4">
                {[
                  { label: "Folha da equipe", value: payrollTotal, color: "#E11D2E" },
                  { label: "Ferramentas", value: toolsTotal, color: "#F97316" },
                ].map((item, i) => {
                  const pct = fixedCost > 0 ? (item.value / fixedCost) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-fg-soft">
                          {item.label}
                        </span>
                        <span className="tabular-nums text-fg-muted">
                          {formatBRL(item.value)} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: item.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, delay: i * 0.1 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle
              hint={
                <InfoHint text="Faturas emitidas para os clientes. Marque como paga quando o dinheiro entrar." />
              }
            >
              Faturas do mês
            </SectionTitle>
            {invoices.length === 0 ? (
              <EmptyState icon={Wallet} title="Nenhuma fatura emitida" />
            ) : (
              <div className="space-y-2">
                {invoices.slice(0, 8).map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {inv.clientName}
                      </div>
                      <div className="text-[11px] text-fg-muted">
                        {inv.reference ?? formatDate(inv.dueAt)} · vence{" "}
                        {formatDate(inv.dueAt)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatBRL(inv.amount)}
                      </span>
                      <Badge className={INVOICE_STATUS[inv.status].className}>
                        {INVOICE_STATUS[inv.status].label}
                      </Badge>
                      {canEdit && (
                        <button
                          onClick={() =>
                            startTransition(async () => {
                              const res = await toggleInvoicePaid(
                                inv.id,
                                inv.status !== "PAGO",
                              );
                              if (res.ok) {
                                toast.success(
                                  inv.status === "PAGO"
                                    ? "Fatura reaberta."
                                    : "Fatura marcada como paga.",
                                );
                              } else toast.error(res.error);
                            })
                          }
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded border transition-colors",
                            inv.status === "PAGO"
                              ? "border-success bg-success text-white"
                              : "border-line-strong text-fg-muted hover:border-success hover:text-success",
                          )}
                          title={
                            inv.status === "PAGO"
                              ? "Reabrir fatura"
                              : "Marcar como paga"
                          }
                        >
                          <Check className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "folha" && (
        <Card className="overflow-hidden">
          {payrolls.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum pagamento cadastrado"
              message="Registre salários, pró-labore e freelas para acompanhar o custo da equipe."
              action={
                canCreate ? (
                  <Button onClick={() => setCreatingPayroll(true)}>
                    <Plus className="size-4" />
                    Adicionar à folha
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-xs text-fg-muted">
                    <th className="p-3 text-left font-medium">Pessoa</th>
                    <th className="p-3 text-left font-medium">Tipo</th>
                    <th className="p-3 text-right font-medium">Valor</th>
                    <th className="p-3 text-center font-medium">Dia</th>
                    <th className="p-3 text-center font-medium">Situação</th>
                    {(canEdit || canDelete) && <th className="w-20 p-3" />}
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-line last:border-0 hover:bg-surface-2/50"
                    >
                      <td className="p-3">
                        <div className="font-medium">{p.userName}</div>
                        {p.jobTitle && (
                          <div className="text-[11px] text-fg-muted">
                            {p.jobTitle}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-fg-soft">{PAY_KIND[p.kind]}</td>
                      <td className="p-3 text-right font-semibold tabular-nums">
                        {formatBRL(p.amount)}
                      </td>
                      <td className="p-3 text-center tabular-nums text-fg-muted">
                        {p.dueDay}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          className={
                            p.isActive
                              ? "border-success/30 bg-success/10 text-success"
                              : "border-line-strong bg-surface-3 text-fg-muted"
                          }
                        >
                          {p.isActive ? "Ativo" : "Pausado"}
                        </Badge>
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            {canEdit && (
                              <button
                                onClick={() => setEditingPayroll(p)}
                                className="flex h-7 w-7 items-center justify-center rounded text-fg-muted hover:bg-surface-3 hover:text-fg"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setRemovingPayroll(p)}
                                className="flex h-7 w-7 items-center justify-center rounded text-fg-muted hover:bg-danger/10 hover:text-danger"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-surface-2 font-semibold">
                    <td className="p-3" colSpan={2}>
                      Total mensal
                    </td>
                    <td className="p-3 text-right tabular-nums text-brand">
                      {formatBRL(payrollTotal)}
                    </td>
                    <td colSpan={canEdit || canDelete ? 3 : 2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "ferramentas" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tools.length === 0 ? (
            <div className="sm:col-span-2 xl:col-span-3">
              <EmptyState
                icon={Wrench}
                title="Nenhuma ferramenta cadastrada"
                message="Cadastre as assinaturas que a agência paga para ver o custo real."
              />
            </div>
          ) : (
            tools.map((tool, i) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: Math.min(i * 0.04, 0.3) }}
              >
                <Card
                  hover
                  className={cn("group h-full p-4", !tool.isActive && "opacity-55")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        {tool.name}
                        {tool.url && (
                          <a
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-fg-muted hover:text-brand"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </h3>
                      {tool.category && (
                        <p className="mt-0.5 text-[11px] text-fg-muted">
                          {tool.category}
                        </p>
                      )}
                    </div>
                    <Badge>{BILLING_CYCLE[tool.cycle]}</Badge>
                  </div>

                  <div className="mt-3 text-lg font-semibold tabular-nums text-brand">
                    {formatBRL(tool.cost)}
                  </div>
                  {tool.cycle === "ANUAL" && (
                    <div className="text-[11px] text-fg-muted">
                      {formatBRL(tool.cost / 12)}/mês equivalente
                    </div>
                  )}
                  {tool.renewsAt && (
                    <div className="mt-2 text-[11px] text-fg-muted">
                      Renova em {formatDate(tool.renewsAt)}
                    </div>
                  )}

                  {(canEdit || canDelete) && (
                    <div className="mt-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingTool(tool)}
                        >
                          <Pencil className="size-3.5" />
                          Editar
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRemovingTool(tool)}
                          className="ml-auto text-fg-muted hover:text-danger"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {tab === "lancamentos" && (
        <Card className="overflow-hidden">
          {transactions.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Nenhum lançamento"
              message="Registre entradas e saídas avulsas que não são fee nem folha."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-xs text-fg-muted">
                    <th className="p-3 text-left font-medium">Descrição</th>
                    <th className="p-3 text-left font-medium">Categoria</th>
                    <th className="p-3 text-left font-medium">Data</th>
                    <th className="p-3 text-right font-medium">Valor</th>
                    {(canEdit || canDelete) && <th className="w-20 p-3" />}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-line last:border-0 hover:bg-surface-2/50"
                    >
                      <td className="p-3 font-medium">{tx.description}</td>
                      <td className="p-3 text-fg-muted">{tx.category ?? ""}</td>
                      <td className="p-3 text-fg-muted">{formatDate(tx.date)}</td>
                      <td
                        className={cn(
                          "p-3 text-right font-semibold tabular-nums",
                          tx.type === "ENTRADA" ? "text-success" : "text-danger",
                        )}
                      >
                        {tx.type === "ENTRADA" ? "+" : "−"} {formatBRL(tx.amount)}
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            {canEdit && (
                              <button
                                onClick={() => setEditingTx(tx)}
                                className="flex h-7 w-7 items-center justify-center rounded text-fg-muted hover:bg-surface-3 hover:text-fg"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setRemovingTx(tx)}
                                className="flex h-7 w-7 items-center justify-center rounded text-fg-muted hover:bg-danger/10 hover:text-danger"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <PayrollModal
        open={creatingPayroll || editingPayroll !== null}
        payroll={editingPayroll}
        members={members}
        onClose={() => {
          setCreatingPayroll(false);
          setEditingPayroll(null);
        }}
      />
      <ToolModal
        open={creatingTool || editingTool !== null}
        tool={editingTool}
        onClose={() => {
          setCreatingTool(false);
          setEditingTool(null);
        }}
      />
      <TxModal
        open={creatingTx || editingTx !== null}
        tx={editingTx}
        onClose={() => {
          setCreatingTx(false);
          setEditingTx(null);
        }}
      />

      <ConfirmModal
        open={removingPayroll !== null}
        onClose={() => setRemovingPayroll(null)}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deletePayroll(removingPayroll!.id);
            if (res.ok) {
              toast.success("Removido da folha.");
              setRemovingPayroll(null);
            } else toast.error(res.error);
          })
        }
        title="Remover da folha"
        message={`O pagamento de ${removingPayroll?.userName ?? ""} sai do cálculo de custo fixo.`}
        confirmLabel="Remover"
      />
      <ConfirmModal
        open={removingTool !== null}
        onClose={() => setRemovingTool(null)}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteTool(removingTool!.id);
            if (res.ok) {
              toast.success("Ferramenta removida.");
              setRemovingTool(null);
            } else toast.error(res.error);
          })
        }
        title="Excluir ferramenta"
        message={`"${removingTool?.name ?? ""}" sai do cálculo de custo.`}
        confirmLabel="Excluir"
      />
      <ConfirmModal
        open={removingTx !== null}
        onClose={() => setRemovingTx(null)}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteTransaction(removingTx!.id);
            if (res.ok) {
              toast.success("Lançamento excluído.");
              setRemovingTx(null);
            } else toast.error(res.error);
          })
        }
        title="Excluir lançamento"
        message="Este registro será apagado do histórico."
        confirmLabel="Excluir"
      />
    </div>
  );
}

function PayrollModal({
  open,
  payroll,
  members,
  onClose,
}: {
  open: boolean;
  payroll: PayrollRow | null;
  members: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PayrollInput>({
    userId: "",
    amount: 0,
    kind: "SALARIO",
    dueDay: 5,
    isActive: true,
    notes: "",
  });
  const [pending, startTransition] = useTransition();
  const [init, setInit] = useState<string | null>(null);

  const key = payroll?.id ?? "novo";
  if (open && init !== key) {
    setInit(key);
    setForm(
      payroll
        ? {
            userId: payroll.userId,
            amount: payroll.amount,
            kind: payroll.kind,
            dueDay: payroll.dueDay,
            isActive: payroll.isActive,
            notes: payroll.notes ?? "",
          }
        : {
            userId: members[0]?.id ?? "",
            amount: 0,
            kind: "SALARIO",
            dueDay: 5,
            isActive: true,
            notes: "",
          },
    );
  }

  const close = () => {
    setInit(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={payroll ? "Editar pagamento" : "Adicionar à folha"}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await savePayroll(payroll?.id ?? null, form);
                if (res.ok) {
                  toast.success("Folha atualizada.");
                  close();
                } else toast.error(res.error);
              })
            }
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pessoa *" className="sm:col-span-2">
          <Select
            value={form.userId}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
          >
            <option value="">Selecione</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valor (R$)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
        </Field>
        <Field
          label="Tipo"
          hint={
            <InfoHint text="Pró-labore é a retirada dos sócios; comissão varia com vendas; freela é pontual." />
          }
        >
          <Select
            value={form.kind}
            onChange={(e) =>
              setForm((f) => ({ ...f, kind: e.target.value as PayrollInput["kind"] }))
            }
          >
            {Object.entries(PAY_KIND).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Dia do pagamento">
          <Input
            type="number"
            min={1}
            max={31}
            value={form.dueDay}
            onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value }))}
          />
        </Field>
        <Field label="Situação">
          <Select
            value={form.isActive ? "1" : "0"}
            onChange={(e) =>
              setForm((f) => ({ ...f, isActive: e.target.value === "1" }))
            }
          >
            <option value="1">Ativo</option>
            <option value="0">Pausado</option>
          </Select>
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="min-h-16"
          />
        </Field>
      </div>
    </Modal>
  );
}

function ToolModal({
  open,
  tool,
  onClose,
}: {
  open: boolean;
  tool: ToolRow | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ToolInput>({
    name: "",
    category: "",
    cost: 0,
    cycle: "MENSAL",
    renewsAt: "",
    isActive: true,
    url: "",
    notes: "",
  });
  const [pending, startTransition] = useTransition();
  const [init, setInit] = useState<string | null>(null);

  const key = tool?.id ?? "novo";
  if (open && init !== key) {
    setInit(key);
    setForm(
      tool
        ? {
            name: tool.name,
            category: tool.category ?? "",
            cost: tool.cost,
            cycle: tool.cycle,
            renewsAt: tool.renewsAt?.slice(0, 10) ?? "",
            isActive: tool.isActive,
            url: tool.url ?? "",
            notes: tool.notes ?? "",
          }
        : {
            name: "",
            category: "",
            cost: 0,
            cycle: "MENSAL",
            renewsAt: "",
            isActive: true,
            url: "",
            notes: "",
          },
    );
  }

  const close = () => {
    setInit(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={tool ? "Editar ferramenta" : "Nova ferramenta"}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await saveTool(tool?.id ?? null, form);
                if (res.ok) {
                  toast.success("Ferramenta salva.");
                  close();
                } else toast.error(res.error);
              })
            }
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *" className="sm:col-span-2">
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex.: Adobe Creative Cloud"
          />
        </Field>
        <Field label="Categoria">
          <Input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Criação, Mídia, Infra..."
          />
        </Field>
        <Field label="Custo (R$)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.cost}
            onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
          />
        </Field>
        <Field
          label="Ciclo"
          hint={
            <InfoHint text="Anual é dividido por 12 no cálculo mensal. Único não entra no custo recorrente." />
          }
        >
          <Select
            value={form.cycle}
            onChange={(e) =>
              setForm((f) => ({ ...f, cycle: e.target.value as ToolInput["cycle"] }))
            }
          >
            {Object.entries(BILLING_CYCLE).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Renova em">
          <Input
            type="date"
            value={form.renewsAt}
            onChange={(e) => setForm((f) => ({ ...f, renewsAt: e.target.value }))}
          />
        </Field>
        <Field label="Link" className="sm:col-span-2">
          <Input
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://"
          />
        </Field>
        <Field label="Situação">
          <Select
            value={form.isActive ? "1" : "0"}
            onChange={(e) =>
              setForm((f) => ({ ...f, isActive: e.target.value === "1" }))
            }
          >
            <option value="1">Ativa</option>
            <option value="0">Cancelada</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function TxModal({
  open,
  tx,
  onClose,
}: {
  open: boolean;
  tx: TxRow | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<TransactionInput>({
    description: "",
    amount: 0,
    type: "ENTRADA",
    category: "",
    date: "",
  });
  const [pending, startTransition] = useTransition();
  const [init, setInit] = useState<string | null>(null);

  const key = tx?.id ?? "novo";
  if (open && init !== key) {
    setInit(key);
    setForm(
      tx
        ? {
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            category: tx.category ?? "",
            date: tx.date.slice(0, 10),
          }
        : {
            description: "",
            amount: 0,
            type: "ENTRADA",
            category: "",
            date: new Date().toISOString().slice(0, 10),
          },
    );
  }

  const close = () => {
    setInit(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={tx ? "Editar lançamento" : "Novo lançamento"}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await saveTransaction(tx?.id ?? null, form);
                if (res.ok) {
                  toast.success("Lançamento salvo.");
                  close();
                } else toast.error(res.error);
              })
            }
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Descrição *" className="sm:col-span-2">
          <Input
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </Field>
        <Field label="Valor (R$)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
        </Field>
        <Field label="Tipo">
          <Select
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                type: e.target.value as TransactionInput["type"],
              }))
            }
          >
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
          </Select>
        </Field>
        <Field label="Categoria">
          <Input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
        </Field>
        <Field label="Data">
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </Field>
      </div>
    </Modal>
  );
}
