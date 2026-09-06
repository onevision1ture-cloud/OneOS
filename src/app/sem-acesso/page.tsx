import type { Metadata } from "next";
import { PAGE_LABELS, type PageKey } from "@/lib/permissions";
import { ErrorShell } from "@/components/errors/error-shell";

export const metadata: Metadata = { title: "Acesso restrito" };

export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const key = page as PageKey | undefined;
  const label = key && PAGE_LABELS[key] ? PAGE_LABELS[key].pt : null;

  return (
    <ErrorShell
      code="403"
      title="Acesso restrito"
      message={
        label
          ? `Seu cargo não tem permissão para abrir a página ${label}. Se você precisa desse acesso, peça a um administrador para liberar em Equipe → Cargos.`
          : "Seu cargo não tem permissão para abrir esta área. Peça a um administrador para revisar suas permissões."
      }
      waiting={false}
      primaryLabel="Voltar ao início"
      primaryHref="/inicio"
    />
  );
}
