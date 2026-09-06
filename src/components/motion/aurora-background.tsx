"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Fundo da tela de login: manchas de cor em blur pesado que se movem
 * lentamente, cruzando entre si. Vermelho da marca no papel principal,
 * com apoios em vinho e laranja para dar profundidade.
 */
const BLOBS = [
  {
    color: "rgba(225, 29, 46, 0.55)",
    size: 620,
    from: { x: "-18%", y: "-12%" },
    path: { x: ["-18%", "24%", "-4%", "-18%"], y: ["-12%", "16%", "38%", "-12%"] },
    duration: 26,
  },
  {
    color: "rgba(139, 12, 34, 0.5)",
    size: 540,
    from: { x: "62%", y: "8%" },
    path: { x: ["62%", "28%", "70%", "62%"], y: ["8%", "44%", "22%", "8%"] },
    duration: 32,
  },
  {
    color: "rgba(249, 90, 60, 0.34)",
    size: 460,
    from: { x: "34%", y: "58%" },
    path: { x: ["34%", "68%", "12%", "34%"], y: ["58%", "30%", "62%", "58%"] },
    duration: 29,
  },
  {
    color: "rgba(88, 20, 120, 0.3)",
    size: 500,
    from: { x: "6%", y: "52%" },
    path: { x: ["6%", "44%", "-6%", "6%"], y: ["52%", "68%", "24%", "52%"] },
    duration: 36,
  },
];

export function AuroraBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-surface-0">
      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: blob.size,
            height: blob.size,
            background: blob.color,
            filter: "blur(90px)",
            left: blob.from.x,
            top: blob.from.y,
          }}
          animate={
            reduceMotion
              ? undefined
              : { x: blob.path.x, y: blob.path.y, scale: [1, 1.18, 0.92, 1] }
          }
          transition={{
            duration: blob.duration,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.35, 0.7, 1],
          }}
        />
      ))}

      {/* grade técnica por cima das manchas */}
      <div className="absolute inset-0 grid-tech opacity-[0.05]" />

      {/* vinheta: escurece as bordas e joga o foco pro centro */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 8%, rgba(7,8,11,0.72) 62%, var(--surface-0) 100%)",
        }}
      />

      {/* granulado sutil, tira o aspecto plástico do gradiente */}
      <div
        className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
