"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │  PARA COLOCAR A LOGO OFICIAL DA ONEVISION                    │
 * │                                                              │
 * │  1. Salve o arquivo em:  public/logo.png                     │
 * │     (aceita .png, .jpg ou .svg — se usar outro nome ou       │
 * │      extensão, ajuste a constante ARQUIVO abaixo)            │
 * │                                                              │
 * │  2. Troque USAR_ARQUIVO para true.                           │
 * │                                                              │
 * │  Pronto. A logo entra na abertura, no menu, no login e nas   │
 * │  telas de erro de uma vez só.                                │
 * └─────────────────────────────────────────────────────────────┘
 */
const USAR_ARQUIVO = false;
const ARQUIVO = "/logo.png";

export function LogoMark({
  size = 40,
  animated = true,
  className,
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  // Logo oficial: a imagem entra no lugar do desenho provisório.
  if (USAR_ARQUIVO) {
    const img = (
      <Image
        src={ARQUIVO}
        alt="Onevision"
        width={size}
        height={size}
        priority
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
      />
    );

    if (!animated) return img;

    return (
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="shrink-0"
        style={{ width: size, height: size }}
      >
        {img}
      </motion.div>
    );
  }

  /**
   * Marca provisória: o "1" da Onevision1ture vira o eixo do símbolo,
   * um anel de visão (a lente) cortado por uma barra vertical.
   */
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="oneos-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand-hover)" />
          <stop offset="100%" stopColor="var(--brand-active)" />
        </linearGradient>
      </defs>

      {/* anel externo, a "visão" */}
      <motion.circle
        cx="24"
        cy="24"
        r="19"
        stroke="url(#oneos-ring)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="82 38"
        initial={animated ? { rotate: 0, opacity: 0 } : false}
        animate={animated ? { rotate: 360, opacity: 1 } : false}
        transition={{
          rotate: { duration: 8, repeat: Infinity, ease: "linear" },
          opacity: { duration: 0.4 },
        }}
        style={{ transformOrigin: "24px 24px" }}
      />

      {/* núcleo */}
      <motion.circle
        cx="24"
        cy="24"
        r="5.5"
        fill="var(--brand)"
        initial={animated ? { scale: 0 } : false}
        animate={
          animated ? { scale: [1, 1.14, 1], opacity: [1, 0.82, 1] } : false
        }
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "24px 24px" }}
      />

      {/* a barra do "1" */}
      <motion.rect
        x="22.2"
        y="4"
        width="3.6"
        height="40"
        rx="1.8"
        fill="var(--text-primary)"
        initial={animated ? { scaleY: 0 } : false}
        animate={animated ? { scaleY: 1 } : false}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        style={{ transformOrigin: "24px 24px" }}
      />
    </svg>
  );
}

export function Wordmark({
  size = 40,
  animated = true,
  showTagline = false,
  className,
}: {
  size?: number;
  animated?: boolean;
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark size={size} animated={animated} />
      <div className="leading-none">
        <div
          className="font-semibold tracking-tight"
          style={{ fontSize: size * 0.52 }}
        >
          One<span className="text-brand">OS</span>
        </div>
        {showTagline && (
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-fg-muted">
            Onevision1ture
          </div>
        )}
      </div>
    </div>
  );
}
