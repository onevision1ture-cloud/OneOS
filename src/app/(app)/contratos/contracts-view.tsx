"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Search,
  FileSignature,
  Pencil,
  Trash2,
  ExternalLink,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";

import { cn, formatBRL, formatDate } from "@/lib/utils";
import { CONTRACT_STATUS } from "@/lib/labels";
import type { ContractStatus } from "@/generated/prisma";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { InfoHint } from "@/components/ui/info-hint";
import { KpiCard } from "@/components/ui/kpi-card";
import { saveContract, deleteContract, type ContractInput } from "./actions";

export type ContractRow = {
  id: string;
  title: string;
  clientId: string | null;
  clientName: string | null;
  value: number;
  startAt: string | null;
  endAt: string | null;
  status: ContractStatus;
  fileUrl: string | null;
  notes: string | null;
  ownerName: string | null;
};

/** Dias até o fim do contrato — negativo quando já venceu. */
function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export function ContractsView({
  contracts,
  clients,
  canCreate,
  canEdit,
  canDelete,
}: {
  contracts: ContractRow[];
  clients: Array<{ id: string; name: string }>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"TODOS" | ContractStatus>("TODOS");
  const [editing, setEditing] = useState<ContractRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<ContractRow | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contracts.filter((c) => {
      if (status !== "TODOS" && c.status !== status) return false;
      if (!q) return true;
      return [c.title, c.clientName].filter(Boolean).some((v) =>
        v!.toLowerCase().includes(q),
      );
    });
  }, [contracts, query, status]);

  const active = contracts.filter((c) => c.status === "ATIVO");
  const totalValue = active.reduce((s, c) => s + c.value, 0);

  // vencendo nos próximos 30 dias
  const expiring = active.filter((c) => {
    const d = daysUntil(c.endAt);
    return d !== null && d >= 0 && d <= 30;
  });

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle="Documentos, valores e vigências"
        actions={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              Novo contrato
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard
          index={0}
          accent
          label="Valor contratado"
          hint="Soma do valor de todos os contratos ativos. Representa o compromisso firmado com os clientes."
          value={totalValue}
          format={formatBRL}
          icon={FileSignature}
        />
        <KpiCard
          index={1}
          label="Contratos ativos"
          hint="Contratos vigentes no momento, sem contar rascunhos e encerrados."
          value={active.length}
          format={(n) => Math.round(n).toString()}
          icon={FileSignature}
        />
        <KpiCard
          index={2}
          label="Vencendo em 30 dias"
          hint="Contratos ativos cuja vigência termina no próximo mês. Renove antes de perder a conta."
          value={expiring.length}
          format={(n) => Math.round(n).toString()}
          icon={CalendarClock}
        />
      </div>

      {expiring.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <strong className="font-semibold">
              {expiring.length}{" "}
              {expiring.length === 1 ? "contrato vence" : "contratos vencem"} nos
              próximos 30 dias:
            </strong>{" "}
            {expiring.map((c) => c.clientName ?? c.title).join(", ")}.
          </div>
        </motion.div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título ou cliente..."
            className="pl-10"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-44"
        >
          <option value="TODOS">Todos os status</option>
          {Object.entries(CONTRACT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title={
            contracts.length === 0
              ? "Nenhum contrato cadastrado"
              : "Nada encontrado"
          }
          message={
            contracts.length === 0
              ? "Guarde aqui os contratos importantes com prazo, valor e link do documento."
              : "Ajuste a busca ou o filtro."
          }
          action={
            canCreate && contracts.length === 0 ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Novo contrato
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((c, i) => {
            const days = daysUntil(c.endAt);
            const soon = days !== null && days >= 0 && days <= 30;
            const expired = days !== null && days < 0;

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3) }}
              >
                <Card hover className="group h-full p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{c.title}</h3>
                      {c.clientName && (
                        <p className="mt-0.5 truncate text-xs text-fg-muted">
                          {c.clientName}
                        </p>
                      )}
                    </div>
                    <Badge className={CONTRACT_STATUS[c.status].className}>
                      {CONTRACT_STATUS[c.status].label}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-fg-muted">
                        Valor
                      </div>
                      <div className="text-lg font-semibold tabular-nums text-brand">
                        {formatBRL(c.value)}
                      </div>
                    </div>
                    {c.fileUrl && (
                      <a
                        href={c.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs text-fg-soft transition-colors hover:border-brand hover:text-brand"
                      >
                        <ExternalLink className="size-3.5" />
                        Abrir documento
                      </a>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-[11px] text-fg-muted">
                    <span>Início: {formatDate(c.startAt)}</span>
                    <span
                      className={cn(
                        soon && "font-medium text-warning",
                        expired && "font-medium text-danger",
                      )}
                    >
                      Fim: {formatDate(c.endAt)}
                      {soon && ` · vence em ${days} dia${days === 1 ? "" : "s"}`}
                      {expired && " · vencido"}
                    </span>
                  </div>

                  {(canEdit || canDelete) && (
                    <div className="mt-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditing(c)}
                        >
                          <Pencil className="size-3.5" />
                          Editar
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRemoving(c)}
                          className="ml-auto text-fg-muted hover:text-danger"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <ContractModal
        open={creating || editing !== null}
        contract={editing}
        clients={clients}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <ConfirmModal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteContract(removing!.id);
            if (res.ok) {
              toast.success("Contrato excluído.");
              setRemoving(null);
            } else toast.error(res.error);
          })
        }
        loading={pending}
        title="Excluir contrato"
        message={`"${removing?.title ?? ""}" será removido do sistema. O arquivo no link externo não é apagado.`}
        confirmLabel="Excluir"
      />
    </div>
  );
}

function ContractModal({
  open,
  contract,
  clients,
  onClose,
}: {
  open: boolean;
  contract: ContractRow | null;
  clients: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ContractInput>({
    title: "",
    clientId: "",
    value: 0,
    startAt: "",
    endAt: "",
    status: "ATIVO",
    fileUrl: "",
    notes: "",
  });
  const [pending, startTransition] = useTransition();
  const [init, setInit] = useState<string | null>(null);

  const key = contract?.id ?? "novo";
  if (open && init !== key) {
    setInit(key);
    setForm(
      contract
        ? {
            title: contract.title,
            clientId: contract.clientId ?? "",
            value: contract.value,
            startAt: contract.startAt?.slice(0, 10) ?? "",
            endAt: contract.endAt?.slice(0, 10) ?? "",
            status: contract.status,
            fileUrl: contract.fileUrl ?? "",
            notes: contract.notes ?? "",
          }
        : {
            title: "",
            clientId: "",
            value: 0,
            startAt: "",
            endAt: "",
            status: "ATIVO",
            fileUrl: "",
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
      title={contract ? "Editar contrato" : "Novo contrato"}
      description="Guarde o link do documento assinado para achar rápido depois."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await saveContract(contract?.id ?? null, form);
                if (res.ok) {
                  toast.success("Contrato salvo.");
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
        <Field label="Título *" className="sm:col-span-2">
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ex.: Contrato de prestação Casa Nobre"
          />
        </Field>

        <Field label="Cliente">
          <Select
            value={form.clientId}
            onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
          >
            <option value="">Sem cliente vinculado</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valor (R$)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
          />
        </Field>

        <Field label="Início da vigência">
          <Input
            type="date"
            value={form.startAt}
            onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
          />
        </Field>
        <Field
          label="Fim da vigência"
          hint={
            <InfoHint text="O sistema avisa quando faltarem 30 dias para o contrato vencer." />
          }
        >
          <Input
            type="date"
            value={form.endAt}
            onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
          />
        </Field>

        <Field label="Status">
          <Select
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as ContractInput["status"],
              }))
            }
          >
            {Object.entries(CONTRACT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Link do documento"
          hint={
            <InfoHint text="Cole o link do Drive, Dropbox ou de onde o PDF assinado estiver guardado." />
          }
        >
          <Input
            value={form.fileUrl}
            onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
            placeholder="https://"
          />
        </Field>

        <Field label="Observações" className="sm:col-span-2">
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Cláusulas importantes, condições de reajuste..."
          />
        </Field>
      </div>
    </Modal>
  );
}
