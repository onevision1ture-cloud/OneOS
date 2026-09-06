"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  UsersRound,
  Wallet,
  FileSignature,
  FolderOpen,
  Settings,
  ListChecks,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/logo";
import {
  PAGES,
  PAGE_LABELS,
  PAGE_ROUTES,
  type PageKey,
  type PermissionMap,
} from "@/lib/permissions";
import type { Locale } from "@/lib/i18n";

const ICONS: Record<PageKey, React.ComponentType<{ className?: string }>> = {
  INICIO: LayoutDashboard,
  CLIENTES: Users,
  CRM: KanbanSquare,
  TAREFAS: ListChecks,
  EQUIPE: UsersRound,
  FINANCEIRO: Wallet,
  CONTRATOS: FileSignature,
  ARQUIVOS: FolderOpen,
  CONFIGURACOES: Settings,
};

export function Sidebar({
  permissions,
  locale,
}: {
  permissions: PermissionMap;
  locale: Locale;
}) {
  const pathname = usePathname();
  const visible = PAGES.filter((page) => permissions[page]?.canView);

  return (
    <aside className="relative z-30 hidden w-[244px] shrink-0 flex-col border-r border-line bg-surface-1 md:flex">
      {/* A marca já traz o nome escrito, então não repetimos em texto. */}
      <div className="flex h-16 items-center border-b border-line px-5">
        <LogoMark size={30} animated={false} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visible.map((page) => {
          const href = PAGE_ROUTES[page];
          const Icon = ICONS[page];
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={page}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-brand-soft text-brand"
                  : "text-fg-soft hover:bg-surface-3 hover:text-fg",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-brand"
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              <Icon className="size-[18px] shrink-0" />
              <span className="whitespace-nowrap font-medium">
                {PAGE_LABELS[page][locale]}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** Barra inferior no celular: as mesmas rotas, sem o menu lateral. */
export function MobileNav({
  permissions,
  locale,
}: {
  permissions: PermissionMap;
  locale: Locale;
}) {
  const pathname = usePathname();
  const visible = PAGES.filter((page) => permissions[page]?.canView).slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface-1/95 backdrop-blur md:hidden">
      {visible.map((page) => {
        const href = PAGE_ROUTES[page];
        const Icon = ICONS[page];
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={page}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
              active ? "text-brand" : "text-fg-muted",
            )}
          >
            <Icon className="size-5" />
            {PAGE_LABELS[page][locale]}
          </Link>
        );
      })}
    </nav>
  );
}
