"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/brand/logo";

const STEPS = [
  "Estabelecendo conexão segura",
  "Carregando permissões",
  "Sincronizando clientes e pipeline",
  "Montando o painel",
];

const BOOT_KEY = "oneos:booted";

/** Já rodou nesta aba? No servidor assume que sim, para não piscar. */
function alreadyBooted() {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(BOOT_KEY) === "1";
  } catch {
    return false; // navegador com storage bloqueado
  }
}

/**
 * Abertura do sistema. Roda uma vez por sessão do navegador:
 * volta a aparecer só depois de fechar a aba, para não virar
 * um pedágio a cada navegação.
 */
export function BootScreen({ once = true }: { once?: boolean }) {
  const reduceMotion = useReducedMotion();

  /**
   * Só o cliente sabe se a abertura já rodou nesta aba. O servidor devolve
   * `true` (já rodou), então a marcação inicial bate nos dois lados e não
   * há erro de hidratação — a tela entra logo depois, no cliente.
   */
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [encerrada, setEncerrada] = useState(false);
  const [step, setStep] = useState(0);

  const visible = montado && !encerrada && (!once || !alreadyBooted());

  useEffect(() => {
    if (!visible) return;

    const total = reduceMotion ? 600 : 2600;
    const perStep = total / STEPS.length;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // a etapa 0 já está na tela; agenda da segunda em diante
    STEPS.slice(1).forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), perStep * (i + 1)));
    });

    timers.push(
      setTimeout(() => {
        try {
          sessionStorage.setItem(BOOT_KEY, "1");
        } catch {
          // sem storage a abertura volta a aparecer; não é um erro
        }
        setEncerrada(true);
      }, total),
    );

    return () => timers.forEach(clearTimeout);
  }, [visible, reduceMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface-0"
          exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* grade técnica ao fundo */}
          <motion.div
            className="pointer-events-none absolute inset-0 grid-tech opacity-[0.07]"
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.07 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />

          {/* halo vermelho pulsando */}
          <motion.div
            className="pointer-events-none absolute h-[420px] w-[420px] rounded-full blur-[110px]"
            style={{ background: "var(--brand-glow)" }}
            animate={
              reduceMotion
                ? undefined
                : { scale: [1, 1.25, 1], opacity: [0.28, 0.5, 0.28] }
            }
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* anéis de varredura */}
          {!reduceMotion &&
            [0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="pointer-events-none absolute rounded-full border border-brand/25"
                initial={{ width: 90, height: 90, opacity: 0.55 }}
                animate={{ width: 460, height: 460, opacity: 0 }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  delay: i * 0.85,
                  ease: "easeOut",
                }}
              />
            ))}

          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <LogoMark size={84} />
            </motion.div>

            <motion.h1
              className="mt-7 text-3xl font-semibold tracking-tight"
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6 }}
            >
              One<span className="text-brand">OS</span>
            </motion.h1>

            <motion.p
              className="mt-2 text-[11px] font-medium uppercase tracking-[0.3em] text-fg-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Onevision1ture
            </motion.p>

            {/* barra de progresso */}
            <div className="mt-9 h-[3px] w-64 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, var(--brand-active), var(--brand-hover))",
                }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: reduceMotion ? 0.5 : 2.5,
                  ease: "easeInOut",
                }}
              />
            </div>

            {/* etapa atual */}
            <div className="mt-4 h-4 text-xs text-fg-muted">
              <AnimatePresence mode="wait">
                <motion.span
                  key={step}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="block"
                >
                  {STEPS[step]}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
