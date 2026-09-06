"use client";

import { useEffect } from "react";
import { ErrorShell } from "@/components/errors/error-shell";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[One OS]", error);
  }, [error]);

  return (
    <ErrorShell
      code="500"
      title="Algo saiu do trilho"
      message="Encontramos um erro ao montar esta tela. A equipe técnica consegue rastrear pelo código abaixo. Você pode tentar de novo, porque na maioria das vezes é temporário."
      detail={error.digest ? `Código: ${error.digest}` : error.message}
      onRetry={reset}
      retryLabel="Tentar novamente"
      waiting
      waitingLabel="Aguardando resolução"
      primaryLabel="Ir para o início"
      primaryHref="/inicio"
    />
  );
}
