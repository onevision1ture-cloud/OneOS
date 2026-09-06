"use client";

import { motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/** Spinner com o traço da marca — usado em botões e blocos pequenos. */
export function Spinner({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("animate-spin", className)}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Três pontos pulsando — para estados curtos de espera. */
export function PulseDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-brand"
          style={{
            animation: "oneos-pulse-dot 1.3s infinite ease-in-out",
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </span>
  );
}

/**
 * Carregamento de página inteira — o que aparece via loading.tsx
 * enquanto o servidor monta a rota.
 */
export function PageLoader({ label = "Carregando" }: { label?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-6">
      <div className="relative flex items-center justify-center">
        {!reduceMotion &&
          [0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute rounded-full border border-brand/30"
              initial={{ width: 48, height: 48, opacity: 0.6 }}
              animate={{ width: 130, height: 130, opacity: 0 }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: i * 0.6,
                ease: "easeOut",
              }}
            />
          ))}
        <motion.div
          animate={reduceMotion ? undefined : { scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <LogoMark size={52} />
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="h-[2px] w-40 overflow-hidden rounded-full bg-surface-3">
          <motion.div
            className="h-full w-1/3 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--brand), transparent)",
            }}
            animate={{ x: ["-140%", "340%"] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <span className="text-xs tracking-wide text-fg-muted">{label}</span>
      </div>
    </div>
  );
}

/** Blocos cinza com brilho passando — placeholder de tabelas e cards. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("skeleton rounded-lg", className)}>
      <div className="skeleton-shine" />
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full opacity-80" />
      ))}
    </div>
  );
}
