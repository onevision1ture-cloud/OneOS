"use client";

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Plus,
  Search,
  Target,
  Pencil,
  Trash2,
  UserCheck,
  Building2,
  GripVertical,
  TrendingUp,
} from "lucide-react";

import { cn, formatBRL, formatCompactBRL } from "@/lib/utils";
import { LEAD_SOURCE, TEMPERATURE } from "@/lib/labels";
import type { LeadSource, Temperature } from "@/generated/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { InfoHint } from "@/components/ui/info-hint";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  saveLead,
  moveLead,
  deleteLead,
  convertLeadToClient,
  type LeadInput,
} from "./actions";

export type Stage = {
  id: string;
  name: string;
  color: string;
  position: number;
  isWon: boolean;
  isLost: boolean;
};

export type LeadCard = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  temperature: Temperature;
  estimatedValue: number;
  stageId: string;
  position: number;
  ownerId: string | null;
  ownerName: string | null;
  clientId: string | null;
  expectedCloseAt: string | null;
  notesCount: number;
};

export function KanbanView({
  stages,
  leads: initialLeads,
  members,
  canCreate,
  canEdit,
  canDelete,
}: {
  stages: Stage[];
  leads: LeadCard[];
  members: Array<{ id: string; name: string }>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  // cópia local para o card se mover na hora, sem esperar o servidor
  const [leads, setLeads] = useState(initialLeads);
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState<LeadCard | null>(null);
  const [editing, setEditing] = useState<LeadCard | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<LeadCard | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    // exige 6px de movimento antes de arrastar, senão o clique não funciona
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.company, l.email].filter(Boolean).some((v) =>
        v!.toLowerCase().includes(q),
      ),
    );
  }, [leads, query]);

  const byStage = useMemo(() => {
    const map: Record<string, LeadCard[]> = {};
    for (const stage of stages) {
      map[stage.id] = visible
        .filter((l) => l.stageId === stage.id)
        .sort((a, b) => a.position - b.position);
    }
    return map;
  }, [visible, stages]);

  const wonStage = stages.find((s) => s.isWon);
  const lostStage = stages.find((s) => s.isLost);
  const open = leads.filter(
    (l) => l.stageId !== wonStage?.id && l.stageId !== lostStage?.id,
  );
  const pipelineValue = open.reduce((s, l) => s + l.estimatedValue, 0);
  const wonCount = leads.filter((l) => l.stageId === wonStage?.id).length;
  const lostCount = leads.filter((l) => l.stageId === lostStage?.id).length;
  const closed = wonCount + lostCount;
  const conversion = closed > 0 ? (wonCount / closed) * 100 : 0;

  const onDragStart = (e: DragStartEvent) => {
    setDragging(leads.find((l) => l.id === e.active.id) ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const { active, over } = e;
    if (!over) return;

    const leadId = String(active.id);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // o alvo pode ser a coluna ou outro card dentro dela
    const overId = String(over.id);
    const targetStage = stages.find((s) => s.id === overId)
      ? overId
      : leads.find((l) => l.id === overId)?.stageId;

    if (!targetStage || targetStage === lead.stageId) return;

    const previous = leads;
    const moved = leads.map((l) =>
      l.id === leadId ? { ...l, stageId: targetStage } : l,
    );
    setLeads(moved);

    const orderedIds = moved
      .filter((l) => l.stageId === targetStage)
      .sort((a, b) => a.position - b.position)
      .map((l) => l.id);

    startTransition(async () => {
      const res = await moveLead(leadId, targetStage, orderedIds);
      if (!res.ok) {
        setLeads(previous); // desfaz se o servidor recusar
        toast.error(res.error);
      } else {
        const stage = stages.find((s) => s.id === targetStage);
        toast.success(`${lead.name} → ${stage?.name ?? "nova etapa"}`);
      }
    });
  };

  const handleDelete = () => {
    if (!removing) return;
    startTransition(async () => {
      const res = await deleteLead(removing.id);
      if (res.ok) {
        setLeads((ls) => ls.filter((l) => l.id !== removing.id));
        toast.success("Lead removido.");
        setRemoving(null);
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleConvert = (lead: LeadCard) => {
    startTransition(async () => {
      const res = await convertLeadToClient(lead.id);
      if (res.ok) {
        toast.success(`${lead.name} agora é cliente.`);
        setLeads((ls) =>
          ls.map((l) =>
            l.id === lead.id
              ? { ...l, clientId: "novo", stageId: wonStage?.id ?? l.stageId }
              : l,
          ),
        );
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div>
      <PageHeader
        title="CRM"
        subtitle="Da captação ao cliente. Arraste os cards entre as etapas"
        actions={
          canCreate && (
            <Button onClick={() => setCreating(stages[0]?.id ?? null)}>
              <Plus className="size-4" />
              Novo lead
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          index={0}
          accent
          label="Pipeline aberto"
          hint="Soma do valor estimado de todas as oportunidades que ainda não foram ganhas nem perdidas. É o potencial de receita em negociação."
          value={pipelineValue}
          format={formatBRL}
          icon={Target}
        />
        <KpiCard
          index={1}
          label="Em negociação"
          hint="Quantidade de leads ativos no funil, sem contar ganhos e perdidos."
          value={open.length}
          format={(n) => Math.round(n).toString()}
          icon={TrendingUp}
        />
        <KpiCard
          index={2}
          label="Convertidos"
          hint="Leads que chegaram na etapa de cliente."
          value={wonCount}
          format={(n) => Math.round(n).toString()}
          icon={UserCheck}
        />
        <KpiCard
          index={3}
          label="Taxa de conversão"
          hint="Dos leads já encerrados, quantos por cento viraram clientes. Mede a eficiência do processo comercial."
          value={conversion}
          format={(n) => `${n.toFixed(1)}%`}
          icon={TrendingUp}
        />
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar lead..."
          className="pl-10"
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              leads={byStage[stage.id] ?? []}
              canEdit={canEdit}
              canDelete={canDelete}
              canCreate={canCreate}
              onAdd={() => setCreating(stage.id)}
              onEdit={setEditing}
              onRemove={setRemoving}
              onConvert={handleConvert}
            />
          ))}
        </div>

        <DragOverlay>
          {dragging && (
            <div className="rotate-2 opacity-95">
              <LeadCardBody lead={dragging} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <LeadFormModal
        open={creating !== null || editing !== null}
        lead={editing}
        defaultStageId={creating ?? stages[0]?.id ?? ""}
        stages={stages}
        members={members}
        onClose={() => {
          setCreating(null);
          setEditing(null);
        }}
      />

      <ConfirmModal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={handleDelete}
        title="Excluir lead"
        message={`Remover ${removing?.name ?? ""} do funil? As anotações e tarefas ligadas a ele também serão apagadas.`}
        confirmLabel="Excluir"
      />
    </div>
  );
}

function Column({
  stage,
  leads,
  canCreate,
  canEdit,
  canDelete,
  onAdd,
  onEdit,
  onRemove,
  onConvert,
}: {
  stage: Stage;
  leads: LeadCard[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onAdd: () => void;
  onEdit: (lead: LeadCard) => void;
  onRemove: (lead: LeadCard) => void;
  onConvert: (lead: LeadCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = leads.reduce((s, l) => s + l.estimatedValue, 0);

  return (
    <div className="flex w-[290px] shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: stage.color }}
          />
          <span className="text-sm font-semibold">{stage.name}</span>
          <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-fg-muted">
            {leads.length}
          </span>
        </div>
        {canCreate && (
          <button
            onClick={onAdd}
            aria-label={`Adicionar lead em ${stage.name}`}
            className="flex h-6 w-6 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-3 hover:text-brand"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>

      <div className="mb-2 px-1 text-[11px] tabular-nums text-fg-muted">
        {formatCompactBRL(total)}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[420px] flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors",
          isOver
            ? "border-brand bg-brand-soft"
            : "border-line bg-surface-1/40",
        )}
      >
        <AnimatePresence mode="popLayout">
          {leads.map((lead) => (
            <DraggableCard
              key={lead.id}
              lead={lead}
              canEdit={canEdit}
              canDelete={canDelete}
              isWonStage={stage.isWon}
              onEdit={() => onEdit(lead)}
              onRemove={() => onRemove(lead)}
              onConvert={() => onConvert(lead)}
            />
          ))}
        </AnimatePresence>

        {leads.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-center text-[11px] text-fg-muted">
            Arraste um card para cá
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  lead,
  canEdit,
  canDelete,
  isWonStage,
  onEdit,
  onRemove,
  onConvert,
}: {
  lead: LeadCard;
  canEdit: boolean;
  canDelete: boolean;
  isWonStage: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onConvert: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    disabled: !canEdit,
  });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.35 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.18 }}
    >
      <LeadCardBody
        lead={lead}
        canEdit={canEdit}
        canDelete={canDelete}
        isWonStage={isWonStage}
        onEdit={onEdit}
        onRemove={onRemove}
        onConvert={onConvert}
        dragHandle={
          canEdit ? { ...attributes, ...listeners } : undefined
        }
      />
    </motion.div>
  );
}

function LeadCardBody({
  lead,
  canEdit,
  canDelete,
  isWonStage,
  onEdit,
  onRemove,
  onConvert,
  dragHandle,
}: {
  lead: LeadCard;
  canEdit?: boolean;
  canDelete?: boolean;
  isWonStage?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onConvert?: () => void;
  dragHandle?: Record<string, unknown>;
}) {
  const temp = TEMPERATURE[lead.temperature];

  return (
    <div className="group rounded-lg border border-line bg-surface-2 p-3 transition-colors hover:border-line-strong">
      <div className="flex items-start gap-2">
        {dragHandle && (
          <button
            {...dragHandle}
            aria-label="Arrastar"
            className="mt-0.5 cursor-grab touch-none text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-sm font-medium">{lead.name}</h4>
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{ background: temp.dot }}
              title={temp.label}
            />
          </div>

          {lead.company && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-fg-muted">
              <Building2 className="size-3 shrink-0" />
              {lead.company}
            </p>
          )}

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold tabular-nums text-brand">
              {formatCompactBRL(lead.estimatedValue)}
            </span>
            <Badge>{LEAD_SOURCE[lead.source]}</Badge>
          </div>

          {lead.ownerName && (
            <p className="mt-2 truncate text-[10px] text-fg-muted">
              {lead.ownerName}
            </p>
          )}

          {(canEdit || canDelete) && (
            <div className="mt-2.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              {canEdit && (
                <button
                  onClick={onEdit}
                  className="flex h-6 w-6 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
                  aria-label="Editar"
                >
                  <Pencil className="size-3" />
                </button>
              )}
              {canEdit && isWonStage && !lead.clientId && (
                <button
                  onClick={onConvert}
                  className="flex h-6 items-center gap-1 rounded px-1.5 text-[10px] font-medium text-success transition-colors hover:bg-success/10"
                >
                  <UserCheck className="size-3" />
                  Virar cliente
                </button>
              )}
              {lead.clientId && (
                <span className="text-[10px] font-medium text-success">
                  ✓ Cliente
                </span>
              )}
              {canDelete && (
                <button
                  onClick={onRemove}
                  className="ml-auto flex h-6 w-6 items-center justify-center rounded text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  aria-label="Excluir"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const EMPTY_LEAD: LeadInput = {
  name: "",
  company: "",
  email: "",
  phone: "",
  source: "OUTRO",
  temperature: "MORNO",
  estimatedValue: 0,
  stageId: "",
  ownerId: "",
  expectedCloseAt: "",
};

function LeadFormModal({
  open,
  lead,
  defaultStageId,
  stages,
  members,
  onClose,
}: {
  open: boolean;
  lead: LeadCard | null;
  defaultStageId: string;
  stages: Stage[];
  members: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<LeadInput>(EMPTY_LEAD);
  const [pending, startTransition] = useTransition();
  const [initialized, setInitialized] = useState<string | null>(null);

  const key = lead?.id ?? `novo-${defaultStageId}`;
  if (open && initialized !== key) {
    setInitialized(key);
    setForm(
      lead
        ? {
            name: lead.name,
            company: lead.company ?? "",
            email: lead.email ?? "",
            phone: lead.phone ?? "",
            source: lead.source,
            temperature: lead.temperature,
            estimatedValue: lead.estimatedValue,
            stageId: lead.stageId,
            ownerId: lead.ownerId ?? "",
            expectedCloseAt: lead.expectedCloseAt?.slice(0, 10) ?? "",
          }
        : { ...EMPTY_LEAD, stageId: defaultStageId },
    );
  }

  const set = <K extends keyof LeadInput>(k: K, v: LeadInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const close = () => {
    setInitialized(null);
    onClose();
  };

  const submit = () => {
    startTransition(async () => {
      const res = await saveLead(lead?.id ?? null, form);
      if (res.ok) {
        toast.success(lead ? "Lead atualizado." : "Lead criado.");
        close();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={lead ? "Editar lead" : "Novo lead"}
      description="Oportunidades em negociação. Ao fechar, converta em cliente."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={pending}>
            {lead ? "Salvar" : "Criar lead"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *" className="sm:col-span-2">
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Nome do contato"
          />
        </Field>

        <Field label="Empresa">
          <Input
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
          />
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
        <Field
          label="Valor estimado (R$)"
          hint={
            <InfoHint text="Quanto essa conta deve gerar de fee mensal se fechar. É o que soma no pipeline." />
          }
        >
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.estimatedValue}
            onChange={(e) => set("estimatedValue", e.target.value)}
          />
        </Field>

        <Field label="Origem">
          <Select
            value={form.source}
            onChange={(e) => set("source", e.target.value as LeadInput["source"])}
          >
            {Object.entries(LEAD_SOURCE).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Temperatura"
          hint={
            <InfoHint text="O quanto o lead está perto de fechar: frio (só conheceu), morno (em conversa), quente (negociando valor)." />
          }
        >
          <Select
            value={form.temperature}
            onChange={(e) =>
              set("temperature", e.target.value as LeadInput["temperature"])
            }
          >
            {Object.entries(TEMPERATURE).map(([key, v]) => (
              <option key={key} value={key}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Etapa">
          <Select
            value={form.stageId}
            onChange={(e) => set("stageId", e.target.value)}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Responsável">
          <Select
            value={form.ownerId}
            onChange={(e) => set("ownerId", e.target.value)}
          >
            <option value="">Ninguém</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
