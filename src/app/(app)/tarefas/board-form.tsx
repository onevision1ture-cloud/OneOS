"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Field, Textarea } from "@/components/ui/input";
import { criarQuadro, salvarQuadro, type BoardInput } from "./actions";
import type { BoardRow } from "./boards-view";

const ICONES = [
  "📋", "🎯", "🚀", "💡", "🔥", "⚡", "📊", "🎨",
  "📱", "💼", "🏆", "⭐", "📈", "🎬", "✏️", "🔧",
];

export const CORES = [
  "#E11D2E", "#F97316", "#EAB308", "#22C55E",
  "#3B82F6", "#8B5CF6", "#EC4899", "#64748B",
];

/** Fundos prontos, para quem não quer procurar imagem. */
export const FUNDOS = [
  { nome: "Vermelho", valor: "linear-gradient(135deg, #7f1020, #E11D2E)" },
  { nome: "Meia-noite", valor: "linear-gradient(135deg, #0b0d12, #1e293b)" },
  { nome: "Oceano", valor: "linear-gradient(135deg, #0c4a6e, #0891b2)" },
  { nome: "Floresta", valor: "linear-gradient(135deg, #14532d, #16a34a)" },
  { nome: "Violeta", valor: "linear-gradient(135deg, #4c1d95, #8b5cf6)" },
  { nome: "Pôr do sol", valor: "linear-gradient(135deg, #7c2d12, #f97316)" },
];

const VAZIO: BoardInput = {
  name: "",
  icon: "📋",
  color: "#E11D2E",
  bannerUrl: "",
  background: "",
  description: "",
};

export function BoardFormModal({
  open,
  board,
  onClose,
  onCreated,
}: {
  open: boolean;
  board: BoardRow | null;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<BoardInput>(VAZIO);
  const [pendente, iniciar] = useTransition();
  const [chave, setChave] = useState<string | null>(null);

  const atual = board?.id ?? "novo";
  if (open && chave !== atual) {
    setChave(atual);
    setForm(
      board
        ? {
            name: board.name,
            icon: board.icon,
            color: board.color,
            bannerUrl: board.bannerUrl ?? "",
            background: board.background ?? "",
            description: board.description ?? "",
          }
        : VAZIO,
    );
  }

  const set = <K extends keyof BoardInput>(k: K, v: BoardInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const fechar = () => {
    setChave(null);
    onClose();
  };

  const enviar = () => {
    iniciar(async () => {
      if (board) {
        const res = await salvarQuadro(board.id, form);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Quadro atualizado.");
        fechar();
        router.refresh();
        return;
      }

      const res = await criarQuadro(form);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Quadro criado.");
      fechar();
      // entra direto no quadro recém-criado
      onCreated?.(res.id);
    });
  };

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={board ? "Editar quadro" : "Novo quadro"}
      description="Escolha o ícone, a cor e um banner para reconhecer o quadro de relance."
      footer={
        <>
          <Button variant="secondary" onClick={fechar}>
            Cancelar
          </Button>
          <Button onClick={enviar} loading={pendente}>
            {board ? "Salvar" : "Criar quadro"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* prévia */}
        <div
          className="relative flex h-28 items-end overflow-hidden rounded-xl"
          style={
            form.bannerUrl
              ? {
                  backgroundImage: `url(${form.bannerUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {
                  background: `linear-gradient(135deg, ${form.color}, ${form.color}55)`,
                }
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="relative flex items-center gap-2.5 p-4">
            <span className="text-3xl">{form.icon}</span>
            <span className="text-sm font-semibold text-white drop-shadow">
              {form.name || "Nome do quadro"}
            </span>
          </div>
        </div>

        <Field label="Nome do quadro *">
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ex.: Entregas da semana"
            autoFocus
          />
        </Field>

        <Field label="Ícone">
          <div className="flex flex-wrap gap-2">
            {ICONES.map((icone) => (
              <button
                key={icone}
                type="button"
                onClick={() => set("icon", icone)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition-colors",
                  form.icon === icone
                    ? "border-brand bg-brand-soft"
                    : "border-line bg-surface-2 hover:border-line-strong",
                )}
              >
                {icone}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Cor">
          <div className="flex flex-wrap gap-2">
            {CORES.map((cor) => (
              <button
                key={cor}
                type="button"
                onClick={() => set("color", cor)}
                aria-label={`Cor ${cor}`}
                className={cn(
                  "h-9 w-9 rounded-lg border-2 transition-transform",
                  form.color === cor
                    ? "scale-110 border-fg"
                    : "border-transparent hover:scale-105",
                )}
                style={{ background: cor }}
              />
            ))}
          </div>
        </Field>

        <Field
          label="Banner (link da imagem)"
          hint={undefined}
        >
          <Input
            value={form.bannerUrl}
            onChange={(e) => set("bannerUrl", e.target.value)}
            placeholder="https://... (deixe vazio para usar a cor)"
          />
        </Field>

        <Field label="Descrição">
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Para que serve este quadro"
            className="min-h-16"
          />
        </Field>
      </div>
    </Modal>
  );
}
