import type { Metadata } from "next";

import { requirePage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";
import { SettingsView } from "./settings-view";
import type { CompanyInput } from "./actions";

export const metadata: Metadata = { title: "Configurações" };

const DEFAULT_COMPANY: CompanyInput = {
  name: "Onevision1ture",
  shortName: "Onevision",
  city: "Florianópolis",
  state: "SC",
  email: "contato@onevision1ture.com.br",
  phone: "(54) 98875-7114",
  site: "https://onevisionmkt.com",
  cnpj: "",
};

export default async function ConfiguracoesPage() {
  const session = await requirePage("CONFIGURACOES");

  const setting = await prisma.setting.findUnique({ where: { key: "company" } });
  const company = {
    ...DEFAULT_COMPANY,
    ...((setting?.value as Partial<CompanyInput>) ?? {}),
  };

  return (
    <SettingsView
      company={company}
      locale={(session.user.locale as Locale) ?? "pt"}
      isAdmin={session.user.isAdmin}
      canEditCompany={session.user.permissions.CONFIGURACOES.canEdit}
      roleName={session.user.roleName}
      permissions={session.user.permissions}
    />
  );
}
