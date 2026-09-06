"use client";

import { usePathname } from "next/navigation";
import { ErrorShell } from "@/components/errors/error-shell";

export default function NotFound() {
  const pathname = usePathname();

  return (
    <ErrorShell
      code="404"
      title="Página não encontrada"
      message="O endereço que você abriu não existe no One OS. Pode ter sido movido, renomeado, ou o link veio com um erro de digitação."
      detail={pathname ? `Rota solicitada: ${pathname}` : undefined}
      waiting
      waitingLabel="Procurando uma rota equivalente"
      primaryLabel="Voltar ao início"
      primaryHref="/inicio"
    />
  );
}
