"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/ui/info-hint";

/**
 * Número que sobe do zero até o valor quando o card entra na tela.
 * Quando a animação está desligada (fora da tela ou movimento reduzido),
 * devolve o alvo direto, sem passar pelo estado.
 */
function useCountUp(target: number, enabled: boolean) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const duration = 900;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      // easeOutExpo — rápido no começo, suave no fim
      setProgress(p === 1 ? 1 : 1 - Math.pow(2, -10 * p));
      if (p < 1) frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [target, enabled]);

  return enabled ? target * progress : target;
}

export function KpiCard({
  label,
  value,
  hint,
  format,
  delta,
  deltaLabel,
  icon: Icon,
  index = 0,
  accent = false,
}: {
  label: string;
  /** Valor numérico — usado na animação de contagem. */
  value: number;
  /** Texto explicativo do "!" ao lado do nome. */
  hint?: string;
  /** Como formatar o número enquanto ele sobe. */
  format: (n: number) => string;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  index?: number;
  accent?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const display = useCountUp(value, inView && !reduceMotion);

  const positive = (delta ?? 0) >= 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.45,
        delay: Math.min(index * 0.06, 0.4),
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "group relative overflow-hidden rounded-card border bg-surface-1 p-5 transition-colors",
        accent
          ? "border-brand/30 bg-gradient-to-br from-brand-soft to-transparent"
          : "border-line hover:border-line-strong",
      )}
    >
      {/* brilho que segue o topo do card no hover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
          {label}
          {hint && <InfoHint text={hint} />}
        </span>
        {Icon && (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              accent
                ? "bg-brand/15 text-brand"
                : "bg-surface-3 text-fg-muted group-hover:text-brand",
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>

      <div className="mt-3 font-semibold tracking-tight tabular-nums text-2xl">
        {format(display)}
      </div>

      {delta !== undefined && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "flex items-center gap-1 font-medium",
              positive ? "text-success" : "text-danger",
            )}
          >
            {positive ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            {positive ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
          {deltaLabel && <span className="text-fg-muted">{deltaLabel}</span>}
        </div>
      )}
    </motion.div>
  );
}
