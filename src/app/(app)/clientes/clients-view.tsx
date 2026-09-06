"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Users,
  Pencil,
  Trash2,
  Megaphone,
  Wallet,
  Building2,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

import { formatBRL, formatDate, cn } from "@/lib/utils";
import { CLIENT_STATUS, SERVICE_LABEL } from "@/lib/labels";
import type { ClientStatus, Service } from "@/generated/prisma";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { InfoHint } from "@/components/ui/info-hint";
import { KpiCard } from "@/components/ui/kpi-card";
import { saveClient, deleteClient, type ClientInput } from "./actions";

export type ClientRow = {
  id: string;
  name: string;
  company: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  segment: string | null;
  city: string | null;
  state: string | null;
  status: ClientStatus;
  monthlyBudget: number;
  monthlyFee: number;
  contractStart: string | null;
  contractEnd: string | null;
  notes: string | null;
  services: Service[];
  ownerName: string | null;
};

const ALL_SERVICES = Object.keys(SERVICE_LABEL) as Service[];

const EMPTY: ClientInput = {
  name: "",
  company: "",
  cnpj: "",
  email: "",
  phone: "",
  website: "",
  segment: "",
  city: "",
  state: "",
  status: "ATIVO",
  monthlyBudget: 0,
  monthlyFee: 0,
  contractStart: "",
  contractEnd: "",
  notes: "",
  services: [],
};

export function ClientsView({
  clients,
  canCreate,
  canEdit,
  canDelete,
}: {
  clients: ClientRow[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"TODOS" | ClientStatus>("TODOS");
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<ClientRow | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (status !== "TODOS" && c.status !== status) return false;
      if (!q) return true;
      return [c.name, c.company, c.segment, c.city, c.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [clients, query, status]);

  const active = clients.filter((c) => c.status === "ATIVO");
  const totalFee = active.reduce((s, c) => s + c.monthlyFee, 0);
  const totalBudget = active.reduce((s, c) => s + c.monthlyBudget, 0);

  const handleDelete = () => {
    if (!removing) return;
    startTransition(async () => {
      const res = await deleteClient(removing.id);
      if (res.ok) {
        toast.success(`${removing.name} foi removido.`);
        setRemoving(null);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Carteira, verba mensal e serviços contratados"
        actions={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              Novo cliente
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard
          index={0}
          accent
          label="Fee recorrente"
          hint="Soma dos fees mensais dos clientes ativos. É a receita fixa da agência, sem contar a verba de mídia."
          value={totalFee}
          format={formatBRL}
          icon={Wallet}
        />
        <KpiCard
          index={1}
          label="Verba sob gestão"
          hint="Total de investimento em anúncios que a agência administra por mês. É dinheiro do cliente, não receita nossa."
          value={totalBudget}
          format={formatBRL}
          icon={Megaphone}
        />
        <KpiCard
          index={2}
          label="Clientes ativos"
          hint="Contratos em andamento. Pausados e encerrados não entram nesta conta."
          value={active.length}
          format={(n) => Math.round(n).toString()}
          icon={Users}
        />
      </div>

      {/* filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, empresa, segmento..."
            className="pl-10"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-44"
        >
          <option value="TODOS">Todos os status</option>
          {Object.entries(CLIENT_STATUS).map(([key, v]) => (
            <option key={key} value={key}>
              {v.label}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={clients.length === 0 ? "Nenhum cliente cadastrado" : "Nada encontrado"}
          message={
            clients.length === 0
              ? "Cadastre o primeiro cliente para acompanhar verba, fee e serviços aqui."
              : "Ajuste a busca ou o filtro de status."
          }
          action={
            canCreate && clients.length === 0 ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Novo cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: Math.min(i * 0.04, 0.3),
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Card hover className="group h-full p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">
                      {client.name}
                    </h3>
                    {client.company && (
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-fg-muted">
                        <Building2 className="size-3" />
                        {client.company}
                      </p>
                    )}
                  </div>
                  <Badge className={CLIENT_STATUS[client.status].className}>
                    {CLIENT_STATUS[client.status].label}
                  </Badge>
                </div>

                {/* verba e fee, o dado que você pediu em destaque */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-line bg-surface-2 p-3">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-fg-muted">
                      Verba/mês
                      <InfoHint
                        text="Quanto o cliente investe em anúncios por mês. Esse valor é gerido pela agência, mas pertence ao cliente."
                        side="top"
                      />
                    </div>
                    <div className="mt-1 text-sm font-semibold tabular-nums text-fg">
                      {formatBRL(client.monthlyBudget)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-brand/25 bg-brand-soft p-3">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-brand/80">
                      Fee/mês
                      <InfoHint
                        text="O que a agência recebe pelo serviço, separado da verba de mídia. É esta parte que vira receita."
                        side="top"
                      />
                    </div>
                    <div className="mt-1 text-sm font-semibold tabular-nums text-brand">
                      {formatBRL(client.monthlyFee)}
                    </div>
                  </div>
                </div>

                {client.services.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {client.services.map((s) => (
                      <Badge key={s}>{SERVICE_LABEL[s]}</Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-xs text-fg-muted">
                  {client.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="size-3 shrink-0" />
                      {client.email}
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3 shrink-0" />
                      {client.phone}
                    </div>
                  )}
                  {(client.city || client.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3 shrink-0" />
                      {[client.city, client.state].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {client.contractStart && (
                    <div className="text-[11px]">
                      Cliente desde {formatDate(client.contractStart)}
                    </div>
                  )}
                </div>

                {(canEdit || canDelete) && (
                  <div className="mt-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditing(client)}
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRemoving(client)}
                        className="text-fg-muted hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <ClientFormModal
        open={creating || editing !== null}
        client={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <ConfirmModal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={handleDelete}
        loading={pending}
        title="Excluir cliente"
        message={`Isto remove ${removing?.name ?? ""} e todo o histórico ligado a ele: faturas, arquivos e serviços. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir definitivamente"
      />
    </div>
  );
}

function ClientFormModal({
  open,
  client,
  onClose,
}: {
  open: boolean;
  client: ClientRow | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ClientInput>(EMPTY);
  const [pending, startTransition] = useTransition();
  const [initialized, setInitialized] = useState<string | null>(null);

  // carrega os dados do cliente ao abrir para edição
  const key = client?.id ?? "novo";
  if (open && initialized !== key) {
    setInitialized(key);
    setForm(
      client
        ? {
            name: client.name,
            company: client.company ?? "",
            cnpj: client.cnpj ?? "",
            email: client.email ?? "",
            phone: client.phone ?? "",
            website: client.website ?? "",
            segment: client.segment ?? "",
            city: client.city ?? "",
            state: client.state ?? "",
            status: client.status,
            monthlyBudget: client.monthlyBudget,
            monthlyFee: client.monthlyFee,
            contractStart: client.contractStart?.slice(0, 10) ?? "",
            contractEnd: client.contractEnd?.slice(0, 10) ?? "",
            notes: client.notes ?? "",
            services: client.services,
          }
        : EMPTY,
    );
  }

  const set = <K extends keyof ClientInput>(k: K, v: ClientInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleService = (service: Service) => {
    const current = (form.services ?? []) as string[];
    set(
      "services",
      current.includes(service)
        ? current.filter((s) => s !== service)
        : [...current, service],
    );
  };

  const submit = () => {
    startTransition(async () => {
      const res = await saveClient(client?.id ?? null, form);
      if (res.ok) {
        toast.success(client ? "Cliente atualizado." : "Cliente criado.");
        setInitialized(null);
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setInitialized(null);
        onClose();
      }}
      title={client ? "Editar cliente" : "Novo cliente"}
      description="A verba é o investimento em mídia; o fee é o que a agência recebe."
      size="lg"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              setInitialized(null);
              onClose();
            }}
          >
            Cancelar
          </Button>
          <Button onClick={submit} loading={pending}>
            {client ? "Salvar alterações" : "Criar cliente"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *" className="sm:col-span-2">
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Nome do cliente ou responsável"
          />
        </Field>

        <Field label="Empresa">
          <Input
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
          />
        </Field>
        <Field label="CNPJ">
          <Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
        </Field>

        <Field label="E-mail">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field label="Telefone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>

        <Field label="Segmento">
          <Input
            value={form.segment}
            onChange={(e) => set("segment", e.target.value)}
            placeholder="Ex.: Estética, Imobiliário"
          />
        </Field>
        <Field label="Site">
          <Input
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </Field>

        <Field label="Cidade">
          <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="Estado">
          <Input
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
            maxLength={2}
            placeholder="SC"
          />
        </Field>

        <Field
          label="Verba mensal (R$)"
          hint={
            <InfoHint text="Investimento em anúncios por mês. Entra no total 'verba sob gestão' do painel." />
          }
        >
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.monthlyBudget}
            onChange={(e) => set("monthlyBudget", e.target.value)}
          />
        </Field>
        <Field
          label="Fee mensal (R$)"
          hint={
            <InfoHint text="Valor que a agência recebe. É o que forma o MRR." />
          }
        >
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.monthlyFee}
            onChange={(e) => set("monthlyFee", e.target.value)}
          />
        </Field>

        <Field label="Status">
          <Select
            value={form.status}
            onChange={(e) =>
              set("status", e.target.value as ClientInput["status"])
            }
          >
            {Object.entries(CLIENT_STATUS).map(([key, v]) => (
              <option key={key} value={key}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Início do contrato">
          <Input
            type="date"
            value={form.contractStart}
            onChange={(e) => set("contractStart", e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Serviços contratados">
            <div className="flex flex-wrap gap-2">
              {ALL_SERVICES.map((service) => {
                const checked = (form.services ?? []).includes(service);
                return (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      checked
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-line bg-surface-2 text-fg-muted hover:border-line-strong hover:text-fg",
                    )}
                  >
                    {SERVICE_LABEL[service]}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <Field label="Observações" className="sm:col-span-2">
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Contexto do cliente, combinados, histórico..."
          />
        </Field>
      </div>
    </Modal>
  );
}
