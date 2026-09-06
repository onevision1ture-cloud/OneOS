"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
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
  ArrowLeft,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  Calendar,
  AlignLeft,
  CheckSquare,
  MessageSquare,
  GripVertical,
} from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/modal";
import { CardDetail } from "./card-detail";
import { FUNDOS, CORES } from "../board-form";
import {
  criarColuna,
  salvarColuna,
  excluirColuna,
  criarTarefa,
  moverTarefa,
  salvarQuadro,
} from "../actions";

export type Etiqueta = { id: string; name: string; color: string };

export type Tarefa = {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  position: number;
  dueAt: string | null;
  isDone: boolean;
  coverColor: string | null;
  assigneeName: string | null;
  labels: Etiqueta[];
  totalItens: number;
  itensFeitos: number;
  totalComentarios: number;
};

export type Coluna = {
  id: string;
  name: string;
  color: string;
  position: number;
};

export type Quadro = {
  id: string;
  name: string;
  icon: string;
  color: string;
  background: string | null;
  bannerUrl: string | null;
  description: string | null;
};

export function BoardView({
  board,
  columns: colunasIniciais,
  cards: tarefasIniciais,
  labels,
  members,
  canEdit,
  canDelete,
}: {
  board: Quadro;
  columns: Coluna[];
  cards: Tarefa[];
  labels: Etiqueta[];
  members: Array<{ id: string; name: string }>;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [colunas, setColunas] = useState(colunasIniciais);
  const [tarefas, setTarefas] = useState(tarefasIniciais);
  const [etiquetas, setEtiquetas] = useState(labels);
  const [quadro, setQuadro] = useState(board);

  /**
   * Busca o retrato atual do quadro. O componente roda só no cliente, então
   * router.refresh() não repassa dados novos: recarregamos por aqui.
   */
  const recarregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/quadros/${board.id}`);
      if (!r.ok) return;
      const d = await r.json();
      setColunas(d.columns);
      setTarefas(d.cards);
      setEtiquetas(d.labels);
      setQuadro(d.board);
    } catch {
      // sem rede: a tela segue com o que já tem
    }
  }, [board.id]);
  const [arrastando, setArrastando] = useState<Tarefa | null>(null);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [novaColuna, setNovaColuna] = useState(false);
  const [nomeColuna, setNomeColuna] = useState("");
  const [editandoColuna, setEditandoColuna] = useState<Coluna | null>(null);
  const [removendoColuna, setRemovendoColuna] = useState<Coluna | null>(null);
  const [painelFundo, setPainelFundo] = useState(false);
  const [, iniciar] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const porColuna = useMemo(() => {
    const mapa: Record<string, Tarefa[]> = {};
    for (const c of colunas) {
      mapa[c.id] = tarefas
        .filter((t) => t.columnId === c.id)
        .sort((a, b) => a.position - b.position);
    }
    return mapa;
  }, [tarefas, colunas]);

  const aoSoltar = (e: DragEndEvent) => {
    setArrastando(null);
    const { active, over } = e;
    if (!over) return;

    const tarefaId = String(active.id);
    const tarefa = tarefas.find((t) => t.id === tarefaId);
    if (!tarefa) return;

    const alvoId = String(over.id);
    const destino = colunas.find((c) => c.id === alvoId)
      ? alvoId
      : tarefas.find((t) => t.id === alvoId)?.columnId;

    if (!destino || destino === tarefa.columnId) return;

    const anterior = tarefas;
    const movidas = tarefas.map((t) =>
      t.id === tarefaId ? { ...t, columnId: destino } : t,
    );
    setTarefas(movidas);

    const ordem = movidas
      .filter((t) => t.columnId === destino)
      .sort((a, b) => a.position - b.position)
      .map((t) => t.id);

    iniciar(async () => {
      const res = await moverTarefa(tarefaId, destino, ordem);
      if (!res.ok) {
        setTarefas(anterior);
        toast.error(res.error);
      }
    });
  };

  const adicionarColuna = () => {
    if (!nomeColuna.trim()) return;
    iniciar(async () => {
      const res = await criarColuna(board.id, nomeColuna);
      if (res.ok) {
        setNomeColuna("");
        setNovaColuna(false);
        await recarregar();
      } else toast.error(res.error);
    });
  };

  const trocarFundo = (valor: string) => {
    iniciar(async () => {
      const res = await salvarQuadro(board.id, {
        name: quadro.name,
        icon: quadro.icon,
        color: quadro.color,
        bannerUrl: quadro.bannerUrl ?? "",
        background: valor,
        description: quadro.description ?? "",
      });
      if (res.ok) {
        setPainelFundo(false);
        await recarregar();
      } else toast.error(res.error);
    });
  };

  const tarefaAberta = tarefas.find((t) => t.id === abrindo) ?? null;

  return (
    <div
      className="-mx-5 -mt-6 min-h-[calc(100dvh-4rem)] px-5 pt-6 md:-mx-8 md:px-8"
      style={
        quadro.background
          ? quadro.background.startsWith("http")
            ? {
                backgroundImage: `url(${quadro.background})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
              }
            : { background: quadro.background }
          : undefined
      }
    >
      {/* cabeçalho do quadro */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/tarefas"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-1/80 text-fg-soft backdrop-blur transition-colors hover:text-fg"
            aria-label="Voltar aos quadros"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <span className="text-2xl">{quadro.icon}</span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{quadro.name}</h1>
            {quadro.description && (
              <p className="text-xs text-fg-muted">{quadro.description}</p>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="relative">
            <Button variant="secondary" onClick={() => setPainelFundo((v) => !v)}>
              <ImageIcon className="size-4" />
              Fundo
            </Button>

            <AnimatePresence>
              {painelFundo && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setPainelFundo(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-line-strong bg-surface-2 p-3 shadow-2xl"
                  >
                    <p className="mb-2 text-xs font-medium text-fg-soft">
                      Fundos prontos
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {FUNDOS.map((f) => (
                        <button
                          key={f.nome}
                          onClick={() => trocarFundo(f.valor)}
                          title={f.nome}
                          className={cn(
                            "h-14 rounded-lg border-2 transition-transform hover:scale-105",
                            board.background === f.valor
                              ? "border-brand"
                              : "border-transparent",
                          )}
                          style={{ background: f.valor }}
                        />
                      ))}
                    </div>

                    <p className="mb-2 mt-4 text-xs font-medium text-fg-soft">
                      Ou cole o link de uma imagem
                    </p>
                    <ImagemFundo
                      atual={quadro.background ?? ""}
                      aoSalvar={trocarFundo}
                    />

                    <button
                      onClick={() => trocarFundo("")}
                      className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-xs text-fg-muted transition-colors hover:text-fg"
                    >
                      Remover fundo
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* colunas */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e: DragStartEvent) =>
          setArrastando(tarefas.find((t) => t.id === e.active.id) ?? null)
        }
        onDragEnd={aoSoltar}
      >
        <div className="flex items-start gap-4 overflow-x-auto pb-6">
          {colunas.map((coluna) => (
            <ColunaKanban
              key={coluna.id}
              coluna={coluna}
              tarefas={porColuna[coluna.id] ?? []}
              canEdit={canEdit}
              canDelete={canDelete}
              boardId={board.id}
              aoCriar={(nova) => setTarefas((ts) => [...ts, nova])}
              aoAbrir={setAbrindo}
              aoEditar={() => setEditandoColuna(coluna)}
              aoRemover={() => setRemovendoColuna(coluna)}
            />
          ))}

          {canEdit && (
            <div className="w-[290px] shrink-0">
              {novaColuna ? (
                <div className="rounded-xl border border-line bg-surface-1/90 p-3 backdrop-blur">
                  <Input
                    value={nomeColuna}
                    onChange={(e) => setNomeColuna(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") adicionarColuna();
                      if (e.key === "Escape") setNovaColuna(false);
                    }}
                    placeholder="Nome da coluna"
                    autoFocus
                  />
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={adicionarColuna}>
                      Adicionar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setNovaColuna(false)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setNovaColuna(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface-1/50 py-3 text-sm text-fg-muted backdrop-blur transition-colors hover:border-brand hover:text-brand"
                >
                  <Plus className="size-4" />
                  Adicionar coluna
                </button>
              )}
            </div>
          )}
        </div>

        <DragOverlay>
          {arrastando && (
            <div className="w-[266px] rotate-2 opacity-95">
              <CorpoTarefa tarefa={arrastando} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* detalhe da tarefa */}
      {/* a key recria o painel ao trocar de tarefa, zerando o rascunho */}
      <CardDetail
        key={tarefaAberta?.id ?? "nenhuma"}
        card={tarefaAberta}
        labels={etiquetas}
        members={members}
        canEdit={canEdit}
        canDelete={canDelete}
        aoMudar={recarregar}
        onClose={() => setAbrindo(null)}
      />

      <EditarColuna
        coluna={editandoColuna}
        aoSalvar={recarregar}
        onClose={() => setEditandoColuna(null)}
      />

      <ConfirmModal
        open={removendoColuna !== null}
        onClose={() => setRemovendoColuna(null)}
        onConfirm={() =>
          iniciar(async () => {
            const res = await excluirColuna(removendoColuna!.id);
            if (res.ok) {
              toast.success("Coluna excluída.");
              setRemovendoColuna(null);
              await recarregar();
            } else toast.error(res.error);
          })
        }
        title="Excluir coluna"
        message={`A coluna "${removendoColuna?.name ?? ""}" e as tarefas dentro dela serão apagadas.`}
        confirmLabel="Excluir"
      />
    </div>
  );
}

function ImagemFundo({
  atual,
  aoSalvar,
}: {
  atual: string;
  aoSalvar: (v: string) => void;
}) {
  const [valor, setValor] = useState(atual.startsWith("http") ? atual : "");

  return (
    <div className="flex gap-2">
      <Input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="https://..."
        className="h-9 text-xs"
      />
      <Button size="sm" onClick={() => aoSalvar(valor)} disabled={!valor}>
        <Check className="size-3.5" />
      </Button>
    </div>
  );
}

function ColunaKanban({
  coluna,
  tarefas,
  canEdit,
  canDelete,
  aoCriar,
  aoAbrir,
  aoEditar,
  aoRemover,
}: {
  coluna: Coluna;
  tarefas: Tarefa[];
  canEdit: boolean;
  canDelete: boolean;
  boardId: string;
  aoCriar: (t: Tarefa) => void;
  aoAbrir: (id: string) => void;
  aoEditar: () => void;
  aoRemover: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id });
  const [adicionando, setAdicionando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [, iniciar] = useTransition();

  const adicionar = () => {
    if (!titulo.trim()) return;
    iniciar(async () => {
      const res = await criarTarefa(coluna.id, { title: titulo });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // O quadro roda só no cliente, então o refresh da rota não devolve
      // os dados novos: inserimos o card na hora.
      aoCriar({
        id: res.card.id,
        title: res.card.title,
        description: null,
        columnId: coluna.id,
        position: res.card.position,
        dueAt: null,
        isDone: false,
        coverColor: null,
        assigneeName: null,
        labels: [],
        totalItens: 0,
        itensFeitos: 0,
        totalComentarios: 0,
      });
      setTitulo("");
      setAdicionando(false);
    });
  };

  return (
    <div className="flex w-[290px] shrink-0 flex-col rounded-xl border border-line bg-surface-1/90 backdrop-blur">
      <div className="flex items-center justify-between gap-2 border-b border-line p-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: coluna.color }}
          />
          <span className="truncate text-sm font-semibold">{coluna.name}</span>
          <span className="shrink-0 rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-fg-muted">
            {tarefas.length}
          </span>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex shrink-0 gap-0.5">
            {canEdit && (
              <button
                onClick={aoEditar}
                aria-label="Editar coluna"
                className="flex h-6 w-6 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
              >
                <Pencil className="size-3" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={aoRemover}
                aria-label="Excluir coluna"
                className="flex h-6 w-6 items-center justify-center rounded text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-col gap-2 p-2 transition-colors",
          isOver && "bg-brand-soft",
        )}
      >
        <AnimatePresence mode="popLayout">
          {tarefas.map((tarefa) => (
            <TarefaArrastavel
              key={tarefa.id}
              tarefa={tarefa}
              canEdit={canEdit}
              aoAbrir={() => aoAbrir(tarefa.id)}
            />
          ))}
        </AnimatePresence>

        {adicionando ? (
          <div className="rounded-lg border border-line bg-surface-2 p-2">
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") adicionar();
                if (e.key === "Escape") setAdicionando(false);
              }}
              placeholder="Nome da tarefa"
              autoFocus
              className="h-9 text-xs"
            />
            <div className="mt-2 flex gap-1.5">
              <Button size="sm" onClick={adicionar}>
                Adicionar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAdicionando(false)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          canEdit && (
            <button
              onClick={() => setAdicionando(true)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
            >
              <Plus className="size-3.5" />
              Adicionar tarefa
            </button>
          )
        )}
      </div>
    </div>
  );
}

function TarefaArrastavel({
  tarefa,
  canEdit,
  aoAbrir,
}: {
  tarefa: Tarefa;
  canEdit: boolean;
  aoAbrir: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: tarefa.id,
    disabled: !canEdit,
  });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: isDragging ? 0.35 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.18 }}
    >
      <CorpoTarefa
        tarefa={tarefa}
        aoAbrir={aoAbrir}
        alca={canEdit ? { ...attributes, ...listeners } : undefined}
      />
    </motion.div>
  );
}

function CorpoTarefa({
  tarefa,
  aoAbrir,
  alca,
}: {
  tarefa: Tarefa;
  aoAbrir?: () => void;
  alca?: Record<string, unknown>;
}) {
  const vencida =
    tarefa.dueAt && !tarefa.isDone && new Date(tarefa.dueAt) < new Date();

  return (
    <div className="group overflow-hidden rounded-lg border border-line bg-surface-2 transition-colors hover:border-line-strong">
      {tarefa.coverColor && (
        <div className="h-2 w-full" style={{ background: tarefa.coverColor }} />
      )}

      <div className="flex items-start gap-1.5 p-2.5">
        {alca && (
          <button
            {...alca}
            aria-label="Arrastar tarefa"
            className="mt-0.5 cursor-grab touch-none text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </button>
        )}

        <button onClick={aoAbrir} className="min-w-0 flex-1 text-left">
          {tarefa.labels.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {tarefa.labels.map((l) => (
                <span
                  key={l.id}
                  title={l.name}
                  className="h-1.5 w-8 rounded-full"
                  style={{ background: l.color }}
                />
              ))}
            </div>
          )}

          <p
            className={cn(
              "text-sm leading-snug",
              tarefa.isDone && "text-fg-muted line-through",
            )}
          >
            {tarefa.title}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-fg-muted">
            {tarefa.dueAt && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded px-1.5 py-0.5",
                  vencida
                    ? "bg-danger/15 text-danger"
                    : tarefa.isDone
                      ? "bg-success/15 text-success"
                      : "bg-surface-3",
                )}
              >
                <Calendar className="size-2.5" />
                {formatDate(tarefa.dueAt)}
              </span>
            )}
            {tarefa.description && <AlignLeft className="size-3" />}
            {tarefa.totalItens > 0 && (
              <span className="flex items-center gap-1">
                <CheckSquare className="size-2.5" />
                {tarefa.itensFeitos}/{tarefa.totalItens}
              </span>
            )}
            {tarefa.totalComentarios > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="size-2.5" />
                {tarefa.totalComentarios}
              </span>
            )}
            {tarefa.assigneeName && (
              <span className="ml-auto truncate">{tarefa.assigneeName}</span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

function EditarColuna({
  coluna,
  aoSalvar,
  onClose,
}: {
  coluna: Coluna | null;
  aoSalvar: () => Promise<void>;
  onClose: () => void;
}) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#64748B");
  const [chave, setChave] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  if (coluna && chave !== coluna.id) {
    setChave(coluna.id);
    setNome(coluna.name);
    setCor(coluna.color);
  }

  const fechar = () => {
    setChave(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {coluna && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={fechar}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm rounded-2xl border border-line-strong bg-surface-1 p-5 shadow-2xl"
          >
            <h2 className="mb-4 text-base font-semibold">Editar coluna</h2>

            <label className="mb-1.5 block text-xs font-medium text-fg-soft">
              Nome
            </label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />

            <label className="mb-1.5 mt-4 block text-xs font-medium text-fg-soft">
              Cor
            </label>
            <div className="flex flex-wrap gap-2">
              {CORES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCor(c)}
                  aria-label={`Cor ${c}`}
                  className={cn(
                    "h-8 w-8 rounded-lg border-2 transition-transform",
                    cor === c ? "scale-110 border-fg" : "border-transparent",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={fechar}>
                Cancelar
              </Button>
              <Button
                loading={pendente}
                onClick={() =>
                  iniciar(async () => {
                    const res = await salvarColuna(coluna.id, nome, cor);
                    if (res.ok) {
                      toast.success("Coluna atualizada.");
                      fechar();
                      await aoSalvar();
                    } else toast.error(res.error);
                  })
                }
              >
                Salvar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
