"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, LayoutGrid, ListChecks } from "lucide-react";

import { cn } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { BoardFormModal } from "./board-form";
import { excluirQuadro } from "./actions";

export type BoardRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  bannerUrl: string | null;
  background: string | null;
  description: string | null;
  totalCards: number;
  totalColumns: number;
};

export function BoardsView({
  boards,
  canCreate,
  canEdit,
  canDelete,
}: {
  boards: BoardRow[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<BoardRow | null>(null);
  const [removendo, setRemovendo] = useState<BoardRow | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <div>
      <PageHeader
        title="Tarefas"
        subtitle="Quadros da equipe. Todo mundo vê e edita os mesmos."
        actions={
          canCreate && (
            <Button onClick={() => setCriando(true)}>
              <Plus className="size-4" />
              Novo quadro
            </Button>
          )
        }
      />

      {boards.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nenhum quadro criado ainda"
          message="Crie um quadro para a equipe organizar as tarefas em colunas. Todos vão poder ver e editar."
          action={
            canCreate ? (
              <Button onClick={() => setCriando(true)}>
                <Plus className="size-4" />
                Criar o primeiro quadro
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {boards.map((board, i) => (
            <motion.div
              key={board.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: Math.min(i * 0.05, 0.3),
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="group relative h-full overflow-hidden rounded-card border border-line bg-surface-1 transition-colors hover:border-line-strong">
                <Link href={`/tarefas/${board.id}`} className="block">
                  {/* faixa do quadro: imagem ou cor da marca */}
                  <div
                    className="relative h-24 w-full overflow-hidden"
                    style={
                      board.bannerUrl
                        ? {
                            backgroundImage: `url(${board.bannerUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : {
                            background: `linear-gradient(135deg, ${board.color}, ${board.color}55)`,
                          }
                    }
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-surface-1/20 to-transparent" />
                    <span className="absolute bottom-2 left-4 text-3xl drop-shadow-lg">
                      {board.icon}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="truncate text-sm font-semibold">{board.name}</h3>
                    {board.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-fg-muted">
                        {board.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-fg-muted">
                      <span className="flex items-center gap-1">
                        <LayoutGrid className="size-3" />
                        {board.totalColumns}{" "}
                        {board.totalColumns === 1 ? "coluna" : "colunas"}
                      </span>
                      <span className="flex items-center gap-1">
                        <ListChecks className="size-3" />
                        {board.totalCards}{" "}
                        {board.totalCards === 1 ? "tarefa" : "tarefas"}
                      </span>
                    </div>
                  </div>
                </Link>

                {(canEdit || canDelete) && (
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {canEdit && (
                      <button
                        onClick={() => setEditando(board)}
                        aria-label="Editar quadro"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setRemovendo(board)}
                        aria-label="Excluir quadro"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white backdrop-blur transition-colors hover:bg-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {canCreate && (
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: Math.min(boards.length * 0.05, 0.3),
              }}
              onClick={() => setCriando(true)}
              className={cn(
                "flex min-h-[188px] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong",
                "text-fg-muted transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand",
              )}
            >
              <Plus className="size-6" />
              <span className="text-sm font-medium">Novo quadro</span>
            </motion.button>
          )}
        </div>
      )}

      <BoardFormModal
        open={criando || editando !== null}
        board={editando}
        onClose={() => {
          setCriando(false);
          setEditando(null);
        }}
        onCreated={(id) => router.push(`/tarefas/${id}`)}
      />

      <ConfirmModal
        open={removendo !== null}
        onClose={() => setRemovendo(null)}
        loading={pendente}
        onConfirm={() =>
          iniciar(async () => {
            const res = await excluirQuadro(removendo!.id);
            if (res.ok) {
              toast.success("Quadro excluído.");
              setRemovendo(null);
              router.refresh();
            } else toast.error(res.error);
          })
        }
        title="Excluir quadro"
        message={`O quadro "${removendo?.name ?? ""}" e todas as tarefas dentro dele serão apagados. Não dá para desfazer.`}
        confirmLabel="Excluir quadro"
      />
    </div>
  );
}
