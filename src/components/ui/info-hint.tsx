"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Coords = { top: number; left: number; origem: string };

/**
 * O "!" ao lado de nomes abreviados ou técnicos (MRR, LTV, pipeline...).
 * Passar o mouse, ou focar pelo teclado, revela a explicação em texto claro.
 *
 * A caixa é renderizada num portal preso ao <body>, com posição calculada
 * a partir do botão. Sem isso ela fica presa dentro do card e o `overflow`
 * dos containers corta a explicação pela metade.
 */
export function InfoHint({
  text,
  side = "top",
  className,
}: {
  text: string;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const fecharTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const LARGURA = 260;
  const ESPACO = 10;

  /** Calcula onde a caixa cabe, virando de lado se encostar na borda. */
  const posicionar = useCallback(() => {
    const botao = botaoRef.current;
    if (!botao) return;

    const r = botao.getBoundingClientRect();
    const larguraJanela = window.innerWidth;
    const alturaJanela = window.innerHeight;

    // altura estimada; o suficiente para decidir se cabe acima ou abaixo
    const alturaEstimada = Math.ceil(text.length / 42) * 18 + 26;

    let lado = side;
    if (lado === "top" && r.top < alturaEstimada + ESPACO) lado = "bottom";
    if (lado === "bottom" && r.bottom + alturaEstimada + ESPACO > alturaJanela) {
      lado = "top";
    }

    let top: number;
    let left: number;
    let origem: string;

    if (lado === "top" || lado === "bottom") {
      left = r.left + r.width / 2 - LARGURA / 2;
      top =
        lado === "top"
          ? r.top - alturaEstimada - ESPACO
          : r.bottom + ESPACO;
      origem = lado === "top" ? "bottom center" : "top center";
    } else {
      top = r.top + r.height / 2 - alturaEstimada / 2;
      left = lado === "left" ? r.left - LARGURA - ESPACO : r.right + ESPACO;
      origem = lado === "left" ? "right center" : "left center";
    }

    // mantém a caixa dentro da tela
    left = Math.min(Math.max(8, left), larguraJanela - LARGURA - 8);
    top = Math.min(Math.max(8, top), alturaJanela - alturaEstimada - 8);

    setCoords({ top, left, origem });
  }, [side, text.length]);

  const abrir = useCallback(() => {
    if (fecharTimer.current) clearTimeout(fecharTimer.current);
    posicionar();
    setAberto(true);
  }, [posicionar]);

  const fechar = useCallback(() => {
    fecharTimer.current = setTimeout(() => setAberto(false), 90);
  }, []);

  // Rolar ou redimensionar com a caixa aberta a deixaria fora de lugar.
  useEffect(() => {
    if (!aberto) return;

    const recalcular = () => posicionar();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };

    window.addEventListener("scroll", recalcular, true);
    window.addEventListener("resize", recalcular);
    document.addEventListener("keydown", aoTeclar);

    return () => {
      window.removeEventListener("scroll", recalcular, true);
      window.removeEventListener("resize", recalcular);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, posicionar]);

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        ref={botaoRef}
        type="button"
        aria-label="O que significa isto?"
        aria-describedby={aberto ? id : undefined}
        onMouseEnter={abrir}
        onMouseLeave={fechar}
        onFocus={abrir}
        onBlur={fechar}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (aberto) setAberto(false);
          else abrir();
        }}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-line-strong text-[10px] font-bold leading-none text-fg-muted transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
      >
        !
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {aberto && coords && (
              <motion.span
                id={id}
                role="tooltip"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={abrir}
                onMouseLeave={fechar}
                style={{
                  position: "fixed",
                  top: coords.top,
                  left: coords.left,
                  width: LARGURA,
                  transformOrigin: coords.origem,
                  zIndex: 200,
                }}
                className="pointer-events-auto block rounded-lg border border-line-strong bg-surface-3 p-3 text-left text-xs font-normal leading-relaxed text-fg-soft shadow-2xl shadow-black/60"
              >
                {text}
              </motion.span>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </span>
  );
}
