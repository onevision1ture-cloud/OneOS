"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * A marca oficial do One OS é escrita ("One OS System"), larga e clara.
 * Vive em `public/logo-wordmark.png`, com fundo transparente para
 * funcionar no tema escuro e no claro.
 *
 * Para trocar por outro arquivo: substitua a imagem e mantenha o fundo
 * transparente. A proporção usada é ~2.66:1 (largura por altura).
 */
const MARCA = "/logo-wordmark.png";
const PROPORCAO = 2.66;

/**
 * A marca escrita, em tamanho definido pela ALTURA.
 * Usada no menu, no login e na tela de abertura.
 */
export function LogoMark({
  size = 40,
  animated = true,
  className,
}: {
  /** Altura da marca em pixels. A largura acompanha a proporção. */
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const altura = size;
  const largura = Math.round(size * PROPORCAO);

  const img = (
    <Image
      src={MARCA}
      alt="One OS"
      width={largura}
      height={altura}
      priority
      className={cn("select-none object-contain", className)}
      style={{ width: largura, height: altura }}
    />
  );

  if (!animated) return <span className="shrink-0">{img}</span>;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="inline-flex shrink-0"
    >
      {img}
    </motion.span>
  );
}

/**
 * Símbolo compacto, para espaços quadrados (favicon, avatar do sistema).
 * Recorta a marca no "O" inicial, que é a parte reconhecível dela.
 */
export function LogoIcon({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("relative inline-block shrink-0 overflow-hidden", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src={MARCA}
        alt=""
        width={Math.round(size * PROPORCAO * 1.9)}
        height={Math.round(size * 1.9)}
        className="absolute object-contain"
        style={{
          // desloca para enquadrar só o "O" da marca
          left: `-${size * 0.06}px`,
          top: `-${size * 0.42}px`,
          maxWidth: "none",
        }}
      />
    </span>
  );
}

/**
 * A marca com o nome da empresa embaixo.
 * Usada quando há espaço para a assinatura completa.
 */
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
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <LogoMark size={size} animated={animated} />
      {showTagline && (
        <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-fg-muted">
          Onevision1ture
        </div>
      )}
    </div>
  );
}
