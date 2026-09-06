"use client";

import dynamic from "next/dynamic";
import { PageLoader } from "@/components/motion/loaders";

/**
 * O dnd-kit gera ids de acessibilidade com um contador próprio, que não
 * bate entre servidor e cliente. Como o kanban só faz sentido com o mouse,
 * carregamos o componente apenas no navegador — o servidor manda o loader.
 */
export const KanbanClient = dynamic(
  () => import("./kanban-view").then((m) => m.KanbanView),
  {
    ssr: false,
    loading: () => <PageLoader label="Montando o funil" />,
  },
);
