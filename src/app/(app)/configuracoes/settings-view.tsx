"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Moon,
  Sun,
  Languages,
  Building2,
  Palette,
  ShieldCheck,
  Info,
  Check,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { PAGES, PAGE_LABELS } from "@/lib/permissions";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { InfoHint } from "@/components/ui/info-hint";
import { savePreferences, saveCompany, type CompanyInput } from "./actions";

export function SettingsView({
  company,
  locale,
  isAdmin,
  canEditCompany,
  roleName,
  permissions,
}: {
  company: CompanyInput;
  locale: "pt" | "en";
  isAdmin: boolean;
  canEditCompany: boolean;
  roleName: string | null;
  permissions: Record<string, { canView: boolean }>;
}) {
  const { setTheme } = useTheme();
  const router = useRouter();
  const [lang, setLang] = useState(locale);
  const [form, setForm] = useState<CompanyInput>(company);
  const [pending, startTransition] = useTransition();

  const applyTheme = (next: "dark" | "light") => {
    setTheme(next);
    startTransition(async () => {
      await savePreferences({ theme: next });
    });
  };

  const applyLocale = (next: "pt" | "en") => {
    setLang(next);
    startTransition(async () => {
      const res = await savePreferences({ locale: next });
      if (res.ok) {
        toast.success(
          next === "pt" ? "Idioma alterado para Português." : "Language set to English.",
        );
        router.refresh();
      } else toast.error(res.error);
    });
  };

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Preferências do sistema e dados da empresa"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* aparência */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Card className="h-full p-5">
            <SectionTitle
              hint={
                <InfoHint text="A escolha vale só para o seu usuário. Cada pessoa da equipe pode usar o tema que preferir." />
              }
            >
              <Palette className="mr-1 inline size-4 text-brand" />
              Aparência
            </SectionTitle>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-fg-soft">Tema</p>
              {/*
                Qual tema está ativo só se sabe depois da hidratação, então
                marcamos a seleção por CSS (variante `dark:`) em vez de
                comparar em JS, servidor e cliente geram o mesmo HTML.
              */}
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    {
                      key: "dark",
                      label: "Escuro",
                      icon: Moon,
                      hint: "Padrão",
                      // ativo quando o tema É escuro
                      caixa:
                        "border-line bg-surface-2 hover:border-line-strong dark:border-brand dark:bg-brand-soft",
                      marca: "hidden dark:flex",
                      cor: "text-fg-muted dark:text-brand",
                    },
                    {
                      key: "light",
                      label: "Claro",
                      icon: Sun,
                      hint: null,
                      // ativo quando o tema NÃO é escuro
                      caixa:
                        "border-brand bg-brand-soft dark:border-line dark:bg-surface-2 dark:hover:border-line-strong",
                      marca: "flex dark:hidden",
                      cor: "text-brand dark:text-fg-muted",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => applyTheme(opt.key)}
                    className={cn(
                      "relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                      opt.caixa,
                    )}
                  >
                    <span
                      className={cn(
                        "absolute right-3 top-3 h-4 w-4 items-center justify-center rounded-full bg-brand",
                        opt.marca,
                      )}
                    >
                      <Check className="size-2.5 text-white" />
                    </span>
                    <opt.icon className={cn("size-5", opt.cor)} />
                    <div>
                      <div className={cn("text-sm font-medium", opt.cor)}>
                        {opt.label}
                      </div>
                      {opt.hint && (
                        <div className="text-[10px] text-fg-muted">{opt.hint}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-soft">
                <Languages className="size-3.5" />
                Idioma
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { key: "pt", label: "Português", flag: "🇧🇷" },
                    { key: "en", label: "English", flag: "🇺🇸" },
                  ] as const
                ).map((opt) => {
                  const active = lang === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => applyLocale(opt.key)}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-xl border p-4 text-left transition-colors",
                        active
                          ? "border-brand bg-brand-soft"
                          : "border-line bg-surface-2 hover:border-line-strong",
                      )}
                    >
                      <span className="text-lg">{opt.flag}</span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          active && "text-brand",
                        )}
                      >
                        {opt.label}
                      </span>
                      {active && (
                        <Check className="ml-auto size-4 text-brand" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* empresa */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
        >
          <Card className="h-full p-5">
            <SectionTitle
              hint={
                <InfoHint text="Esses dados aparecem em contratos e relatórios gerados pelo sistema." />
              }
            >
              <Building2 className="mr-1 inline size-4 text-brand" />
              Empresa
            </SectionTitle>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Razão / nome" className="sm:col-span-2">
                <Input
                  value={form.name}
                  disabled={!canEditCompany}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </Field>
              <Field label="CNPJ">
                <Input
                  value={form.cnpj ?? ""}
                  disabled={!canEditCompany}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cnpj: e.target.value }))
                  }
                />
              </Field>
              <Field label="Telefone">
                <Input
                  value={form.phone ?? ""}
                  disabled={!canEditCompany}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </Field>
              <Field label="E-mail">
                <Input
                  value={form.email ?? ""}
                  disabled={!canEditCompany}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </Field>
              <Field label="Site">
                <Input
                  value={form.site ?? ""}
                  disabled={!canEditCompany}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, site: e.target.value }))
                  }
                />
              </Field>
              <Field label="Cidade">
                <Input
                  value={form.city ?? ""}
                  disabled={!canEditCompany}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                />
              </Field>
              <Field label="Estado">
                <Input
                  value={form.state ?? ""}
                  disabled={!canEditCompany}
                  maxLength={2}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, state: e.target.value }))
                  }
                />
              </Field>
            </div>

            {canEditCompany && (
              <div className="mt-4 flex justify-end">
                <Button
                  loading={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await saveCompany(form);
                      if (res.ok) toast.success("Dados da empresa salvos.");
                      else toast.error(res.error);
                    })
                  }
                >
                  Salvar
                </Button>
              </div>
            )}
          </Card>
        </motion.div>

        {/* acesso */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="lg:col-span-2"
        >
          <Card className="p-5">
            <SectionTitle
              hint={
                <InfoHint text="Resumo do que o seu cargo libera. Para mudar, um administrador ajusta em Equipe → Cargos." />
              }
            >
              <ShieldCheck className="mr-1 inline size-4 text-brand" />
              Seu acesso
            </SectionTitle>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-xs text-fg-muted">Cargo:</span>
              <Badge className="border-brand/30 bg-brand-soft text-brand">
                {roleName ?? "Sem cargo"}
              </Badge>
              {isAdmin && (
                <span className="text-xs text-fg-muted">
                  Administrador, acesso irrestrito
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {PAGES.map((page) => {
                const allowed = permissions[page]?.canView ?? false;
                return (
                  <span
                    key={page}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium",
                      allowed
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-line bg-surface-2 text-fg-muted line-through opacity-60",
                    )}
                  >
                    {PAGE_LABELS[page].pt}
                  </span>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* sobre */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="lg:col-span-2"
        >
          <Card className="p-5">
            <SectionTitle>
              <Info className="mr-1 inline size-4 text-brand" />
              Sobre o One OS
            </SectionTitle>
            <div className="mt-2 grid gap-3 text-xs text-fg-muted sm:grid-cols-3">
              <div>
                <div className="font-medium text-fg-soft">Versão</div>
                <div className="mt-0.5">1.0.0</div>
              </div>
              <div>
                <div className="font-medium text-fg-soft">Empresa</div>
                <div className="mt-0.5">Onevision1ture · Florianópolis, SC</div>
              </div>
              <div>
                <div className="font-medium text-fg-soft">Banco de dados</div>
                <div className="mt-0.5">PostgreSQL</div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
