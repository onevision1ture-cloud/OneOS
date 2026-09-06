"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PulseDots } from "@/components/motion/loaders";

/**
 * Casca comum das telas de erro (404, 403, 500).
 * O código do erro aparece grande, com o motion rodando atrás
 * enquanto a pessoa decide o que fazer.
 */
export function ErrorShell({
  code,
  title,
  message,
  detail,
  primaryLabel = "Voltar ao início",
  primaryHref = "/inicio",
  onRetry,
  retryLabel = "Tentar novamente",
  waiting = true,
  waitingLabel = "Aguardando resolução",
}: {
  code: string;
  title: string;
  message: string;
  detail?: string;
  primaryLabel?: string;
  primaryHref?: string;
  onRetry?: () => void;
  retryLabel?: string;
  waiting?: boolean;
  waitingLabel?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-surface-0 p-6">
      <div className="pointer-events-none absolute inset-0 grid-tech opacity-[0.06]" />

      {/* halo pulsando atrás do número */}
      <motion.div
        className="pointer-events-none absolute h-[380px] w-[380px] rounded-full blur-[120px]"
        style={{ background: "var(--brand-glow)" }}
        animate={
          reduceMotion ? undefined : { scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }
        }
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* órbitas */}
      {!reduceMotion &&
        [0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute rounded-full border border-brand/15"
            style={{ width: 260 + i * 150, height: 260 + i * 150 }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 30 + i * 12, repeat: Infinity, ease: "linear" }}
          >
            <span
              className="absolute h-1.5 w-1.5 rounded-full bg-brand"
              style={{ top: -3, left: "50%" }}
            />
          </motion.div>
        ))}

      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-[104px] font-bold leading-none tracking-tighter text-gradient-brand"
        >
          {code}
        </motion.div>

        <motion.h1
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mt-4 text-xl font-semibold tracking-tight"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-3 text-sm leading-relaxed text-fg-soft"
        >
          {message}
        </motion.p>

        {detail && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mt-4 max-w-full break-words rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-[11px] text-fg-muted"
          >
            {detail}
          </motion.p>
        )}

        {waiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="mt-6 flex items-center gap-2.5 rounded-full border border-line bg-surface-2/70 px-4 py-2"
          >
            <PulseDots />
            <span className="text-xs text-fg-muted">{waitingLabel}</span>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {onRetry && (
            <Button onClick={onRetry} variant="primary">
              {retryLabel}
            </Button>
          )}
          <Button asChild variant={onRetry ? "secondary" : "primary"}>
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
