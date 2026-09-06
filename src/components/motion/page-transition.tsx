"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** Entrada suave a cada troca de rota. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Fio de progresso no topo durante a navegação.
 * Sobe rápido até 90% e completa quando a nova rota assume.
 */
export function RouteProgress() {
  const pathname = usePathname();
  // guarda a rota já concluída; enquanto ela difere da atual, a barra corre
  const [settled, setSettled] = useState(pathname);

  useEffect(() => {
    if (settled === pathname) return;
    const done = setTimeout(() => setSettled(pathname), 480);
    return () => clearTimeout(done);
  }, [pathname, settled]);

  const loading = settled !== pathname;

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key={pathname}
          className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[2px]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="h-full"
            style={{
              background:
                "linear-gradient(90deg, var(--brand-active), var(--brand-hover), var(--brand))",
              boxShadow: "0 0 12px var(--brand-glow)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: ["0%", "72%", "100%"] }}
            transition={{ duration: 0.48, ease: "easeOut", times: [0, 0.6, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
