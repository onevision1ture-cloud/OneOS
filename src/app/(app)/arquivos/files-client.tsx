"use client";

import dynamic from "next/dynamic";
import { PageLoader } from "@/components/motion/loaders";

/**
 * Mesma razão do kanban: o dnd-kit numera os ids de acessibilidade com um
 * contador próprio, que não coincide entre servidor e cliente. Arrastar
 * pastas é coisa de navegador, então o componente carrega só lá.
 */
export const FilesClient = dynamic(
  () => import("./files-view").then((m) => m.FilesView),
  {
    ssr: false,
    loading: () => <PageLoader label="Abrindo os arquivos" />,
  },
);
