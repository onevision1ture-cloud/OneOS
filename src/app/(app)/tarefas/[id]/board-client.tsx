"use client";

import dynamic from "next/dynamic";
import { PageLoader } from "@/components/motion/loaders";

/**
 * O dnd-kit numera ids de acessibilidade com um contador próprio, que não
 * coincide entre servidor e cliente. Arrastar cartões é coisa de navegador,
 * então o quadro carrega só lá, com o motion de carregamento enquanto isso.
 */
export const BoardClient = dynamic(
  () => import("./board-view").then((m) => m.BoardView),
  {
    ssr: false,
    loading: () => <PageLoader label="Montando o quadro" />,
  },
);
