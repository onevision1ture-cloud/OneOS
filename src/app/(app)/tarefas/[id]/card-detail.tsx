"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  X,
  AlignLeft,
  Calendar,
  Tag,
  CheckSquare,
  MessageSquare,
  User,
  Trash2,
  Check,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { CORES } from "../board-form";
import {
  salvarTarefa,
  excluirTarefa,
  adicionarItem,
  marcarItem,
  excluirItem,
  comentar,
} from "../actions";
import type { Etiqueta, Tarefa } from "./board-view";

export type ItemChecklist = { id: string; text: string; done: boolean };
export type Comentario = {
  id: string;
  body: string;
  autor: string;
  criadoEm: string;
};

/**
 * Painel grande da tarefa, no espírito do Trello: nome, descrição, prazo,
 * etiquetas, checklist e comentários numa coluna só, com as ações à direita.
 */
export function CardDetail({
  card,
  labels,
  members,
  canEdit,
  canDelete,
  aoMudar,
  onClose,
}: {
  card: Tarefa | null;
  labels: Etiqueta[];
  members: Array<{ id: string; name: string }>;
  canEdit: boolean;
  canDelete: boolean;
  /** Avisa o quadro para recarregar depois de cada alteração. */
  aoMudar: () => Promise<void>;
  onClose: () => void;
}) {

  /**
   * Os campos começam com o valor que veio do servidor e guardam apenas
   * o que a pessoa digitou. Trocar de tarefa recria o componente pela
   * `key`, então não é preciso sincronizar nada por efeito.
   */
  const [rascunho, setRascunho] = useState<{
    titulo: string;
    descricao: string;
    prazo: string;
    responsavel: string;
    capa: string;
    etiquetas: string[];
    feito: boolean;
  }>({
    titulo: card?.title ?? "",
    descricao: card?.description ?? "",
    prazo: card?.dueAt?.slice(0, 10) ?? "",
    responsavel: "",
    capa: card?.coverColor ?? "",
    etiquetas: card?.labels.map((l) => l.id) ?? [],
    feito: card?.isDone ?? false,
  });

  const { titulo, descricao, prazo, responsavel, capa, etiquetas, feito } =
    rascunho;

  const editar = <K extends keyof typeof rascunho>(
    campo: K,
    valor: (typeof rascunho)[K],
  ) => setRascunho((r) => ({ ...r, [campo]: valor }));

  const setTitulo = (v: string) => editar("titulo", v);
  const setDescricao = (v: string) => editar("descricao", v);
  const setPrazo = (v: string) => editar("prazo", v);
  const setCapa = (v: string) => editar("capa", v);
  const setEtiquetas = (v: string[]) => editar("etiquetas", v);
  const setFeito = (v: boolean) => editar("feito", v);

  const [novoItem, setNovoItem] = useState("");
  const [novoComentario, setNovoComentario] = useState("");
  const [detalhes, setDetalhes] = useState<{
    itens: ItemChecklist[];
    comentarios: Comentario[];
    assigneeId: string | null;
  } | null>(null);
  const [pendente, iniciar] = useTransition();

  const cardId = card?.id;

  // Checklist e comentários chegam sob demanda, para o quadro carregar leve.
  useEffect(() => {
    if (!cardId) return;
    let ativo = true;

    fetch(`/api/tarefas/${cardId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ativo || !d) return;
        setDetalhes(d);
        if (d.assigneeId) editar("responsavel", d.assigneeId);
      })
      .catch(() => {
        if (ativo) setDetalhes({ itens: [], comentarios: [], assigneeId: null });
      });

    return () => {
      ativo = false;
    };
    // editar é estável entre renders (só usa o setter do useState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  useEffect(() => {
    if (!card) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", aoTeclar);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = antes;
    };
  }, [card, onClose]);

  if (typeof document === "undefined") return null;

  const salvar = (extra?: Partial<Record<string, unknown>>) => {
    if (!card) return;
    iniciar(async () => {
      const res = await salvarTarefa(card.id, {
        title: titulo,
        description: descricao,
        dueAt: prazo,
        assigneeId: responsavel,
        coverColor: capa,
        labelIds: etiquetas,
        isDone: feito,
        ...extra,
      });
      if (res.ok) await aoMudar();
      else toast.error(res.error);
    });
  };

  const alternarEtiqueta = (id: string) => {
    const nova = etiquetas.includes(id)
      ? etiquetas.filter((e) => e !== id)
      : [...etiquetas, id];
    setEtiquetas(nova);
    if (!card) return;
    iniciar(async () => {
      const res = await salvarTarefa(card.id, {
        title: titulo,
        description: descricao,
        dueAt: prazo,
        assigneeId: responsavel,
        coverColor: capa,
        labelIds: nova,
        isDone: feito,
      });
      if (res.ok) await aoMudar();
      else toast.error(res.error);
    });
  };

  const itensFeitos = detalhes?.itens.filter((i) => i.done).length ?? 0;
  const totalItens = detalhes?.itens.length ?? 0;
  const progresso = totalItens > 0 ? (itensFeitos / totalItens) * 100 : 0;

  return createPortal(
    <AnimatePresence>
      {card && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-4 py-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-line-strong bg-surface-1 shadow-2xl"
          >
            {capa && <div className="h-16 w-full" style={{ background: capa }} />}

            <div className="flex items-start justify-between gap-4 p-5 pb-3">
              <div className="min-w-0 flex-1">
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  onBlur={() => salvar()}
                  disabled={!canEdit}
                  className="w-full bg-transparent text-lg font-semibold tracking-tight outline-none focus:border-b focus:border-brand"
                />
                <p className="mt-1 text-xs text-fg-muted">
                  {feito ? "Concluída" : "Em aberto"}
                </p>
              </div>

              <button
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-5 p-5 pt-0 md:grid-cols-[1fr_190px]">
              {/* coluna principal */}
              <div className="space-y-5">
                {/* etiquetas aplicadas */}
                {etiquetas.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
                      Etiquetas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {labels
                        .filter((l) => etiquetas.includes(l.id))
                        .map((l) => (
                          <span
                            key={l.id}
                            className="rounded px-2 py-1 text-[11px] font-medium text-white"
                            style={{ background: l.color }}
                          >
                            {l.name}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
                    <AlignLeft className="size-3" />
                    Descrição
                  </p>
                  <Textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    onBlur={() => salvar()}
                    disabled={!canEdit}
                    placeholder="Escreva os detalhes da tarefa..."
                    className="min-h-24 text-sm"
                  />
                </div>

                {/* checklist */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
                      <CheckSquare className="size-3" />
                      Checklist
                    </p>
                    {totalItens > 0 && (
                      <span className="text-[11px] tabular-nums text-fg-muted">
                        {itensFeitos}/{totalItens}
                      </span>
                    )}
                  </div>

                  {totalItens > 0 && (
                    <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <motion.div
                        className="h-full rounded-full bg-success"
                        animate={{ width: `${progresso}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {detalhes?.itens.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2"
                      >
                        <button
                          disabled={!canEdit}
                          onClick={() =>
                            iniciar(async () => {
                              const res = await marcarItem(item.id, !item.done);
                              if (res.ok) {
                                setDetalhes((d) =>
                                  d
                                    ? {
                                        ...d,
                                        itens: d.itens.map((i) =>
                                          i.id === item.id
                                            ? { ...i, done: !i.done }
                                            : i,
                                        ),
                                      }
                                    : d,
                                );
                                await aoMudar();
                              } else toast.error(res.error);
                            })
                          }
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                            item.done
                              ? "border-success bg-success text-white"
                              : "border-line-strong hover:border-success",
                          )}
                        >
                          {item.done && <Check className="size-2.5" />}
                        </button>

                        <span
                          className={cn(
                            "flex-1 text-sm",
                            item.done && "text-fg-muted line-through",
                          )}
                        >
                          {item.text}
                        </span>

                        {canEdit && (
                          <button
                            onClick={() =>
                              iniciar(async () => {
                                const res = await excluirItem(item.id);
                                if (res.ok) {
                                  setDetalhes((d) =>
                                    d
                                      ? {
                                          ...d,
                                          itens: d.itens.filter(
                                            (i) => i.id !== item.id,
                                          ),
                                        }
                                      : d,
                                  );
                                  await aoMudar();
                                }
                              })
                            }
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="Remover item"
                          >
                            <X className="size-3 text-fg-muted hover:text-danger" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {canEdit && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={novoItem}
                        onChange={(e) => setNovoItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" || !novoItem.trim()) return;
                          iniciar(async () => {
                            const res = await adicionarItem(card.id, novoItem);
                            if (res.ok) {
                              setNovoItem("");
                              const r = await fetch(`/api/tarefas/${card.id}`);
                              if (r.ok) setDetalhes(await r.json());
                              await aoMudar();
                            } else toast.error(res.error);
                          });
                        }}
                        placeholder="Adicionar item e pressionar Enter"
                        className="h-9 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* comentários */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
                    <MessageSquare className="size-3" />
                    Comentários
                  </p>

                  <div className="space-y-2">
                    {detalhes?.comentarios.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg border border-line bg-surface-2 p-2.5"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-medium">{c.autor}</span>
                          <span className="text-[10px] text-fg-muted">
                            {new Date(c.criadoEm).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-fg-soft">
                          {c.body}
                        </p>
                      </div>
                    ))}
                  </div>

                  {canEdit && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={novoComentario}
                        onChange={(e) => setNovoComentario(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" || !novoComentario.trim()) return;
                          iniciar(async () => {
                            const res = await comentar(card.id, novoComentario);
                            if (res.ok) {
                              setNovoComentario("");
                              const r = await fetch(`/api/tarefas/${card.id}`);
                              if (r.ok) setDetalhes(await r.json());
                              await aoMudar();
                            } else toast.error(res.error);
                          });
                        }}
                        placeholder="Escrever comentário e pressionar Enter"
                        className="h-9 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* barra lateral de ações */}
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
                    <Calendar className="size-3" />
                    Prazo
                  </p>
                  <Input
                    type="date"
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                    onBlur={() => salvar()}
                    disabled={!canEdit}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
                    <User className="size-3" />
                    Responsável
                  </p>
                  <Select
                    value={responsavel}
                    onChange={(e) => {
                      editar("responsavel", e.target.value);
                      salvar({ assigneeId: e.target.value });
                    }}
                    disabled={!canEdit}
                    className="h-9 text-xs"
                  >
                    <option value="">Ninguém</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
                    <Tag className="size-3" />
                    Etiquetas
                  </p>
                  <div className="space-y-1">
                    {labels.map((l) => {
                      const ativa = etiquetas.includes(l.id);
                      return (
                        <button
                          key={l.id}
                          disabled={!canEdit}
                          onClick={() => alternarEtiqueta(l.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] font-medium transition-opacity",
                            ativa ? "opacity-100" : "opacity-45 hover:opacity-80",
                          )}
                          style={{ background: l.color, color: "#fff" }}
                        >
                          {ativa && <Check className="size-3 shrink-0" />}
                          <span className="truncate">{l.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
                    Cor da capa
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CORES.map((c) => (
                      <button
                        key={c}
                        disabled={!canEdit}
                        onClick={() => {
                          setCapa(c);
                          salvar({ coverColor: c });
                        }}
                        aria-label={`Capa ${c}`}
                        className={cn(
                          "h-6 w-6 rounded border-2 transition-transform",
                          capa === c ? "scale-110 border-fg" : "border-transparent",
                        )}
                        style={{ background: c }}
                      />
                    ))}
                    <button
                      disabled={!canEdit}
                      onClick={() => {
                        setCapa("");
                        salvar({ coverColor: "" });
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded border border-line-strong text-fg-muted"
                      aria-label="Sem capa"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                </div>

                {canEdit && (
                  <Button
                    variant={feito ? "secondary" : "primary"}
                    size="sm"
                    className="w-full"
                    loading={pendente}
                    onClick={() => {
                      const novo = !feito;
                      setFeito(novo);
                      salvar({ isDone: novo });
                    }}
                  >
                    {feito ? "Reabrir tarefa" : "Marcar concluída"}
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-fg-muted hover:text-danger"
                    onClick={() =>
                      iniciar(async () => {
                        const res = await excluirTarefa(card.id);
                        if (res.ok) {
                          toast.success("Tarefa excluída.");
                          onClose();
                          await aoMudar();
                        } else toast.error(res.error);
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                    Excluir tarefa
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
