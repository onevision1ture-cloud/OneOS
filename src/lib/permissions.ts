import type { Page } from "@/generated/prisma";

/** As oito páginas do sistema, na ordem em que aparecem na navegação. */
export const PAGES = [
  "INICIO",
  "CLIENTES",
  "CRM",
  "TAREFAS",
  "EQUIPE",
  "FINANCEIRO",
  "CONTRATOS",
  "ARQUIVOS",
  "CONFIGURACOES",
] as const satisfies readonly Page[];

export type PageKey = (typeof PAGES)[number];

export type PermissionAction = "view" | "create" | "edit" | "delete";

export type PagePermission = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type PermissionMap = Record<PageKey, PagePermission>;

/** Rota de cada página, para montar o menu e proteger o middleware. */
export const PAGE_ROUTES: Record<PageKey, string> = {
  INICIO: "/inicio",
  CLIENTES: "/clientes",
  CRM: "/crm",
  TAREFAS: "/tarefas",
  EQUIPE: "/equipe",
  FINANCEIRO: "/financeiro",
  CONTRATOS: "/contratos",
  ARQUIVOS: "/arquivos",
  CONFIGURACOES: "/configuracoes",
};

/** Rótulos em português e inglês — alimenta o menu e o seletor de idioma. */
export const PAGE_LABELS: Record<PageKey, { pt: string; en: string }> = {
  INICIO: { pt: "Início", en: "Home" },
  CLIENTES: { pt: "Clientes", en: "Clients" },
  CRM: { pt: "CRM", en: "CRM" },
  TAREFAS: { pt: "Tarefas", en: "Tasks" },
  EQUIPE: { pt: "Equipe", en: "Team" },
  FINANCEIRO: { pt: "Financeiro", en: "Finance" },
  CONTRATOS: { pt: "Contratos", en: "Contracts" },
  ARQUIVOS: { pt: "Arquivos", en: "Files" },
  CONFIGURACOES: { pt: "Configurações", en: "Settings" },
};

export const NONE: PagePermission = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
};

export const FULL: PagePermission = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
};

export const READ_ONLY: PagePermission = {
  canView: true,
  canCreate: false,
  canEdit: false,
  canDelete: false,
};

/** Nível 100 = ADM. Quem está nesse nível atravessa qualquer checagem. */
export const ADMIN_LEVEL = 100;

export function emptyPermissionMap(): PermissionMap {
  return Object.fromEntries(
    PAGES.map((page) => [page, { ...NONE }]),
  ) as PermissionMap;
}

export function fullPermissionMap(): PermissionMap {
  return Object.fromEntries(
    PAGES.map((page) => [page, { ...FULL }]),
  ) as PermissionMap;
}

/**
 * Monta o mapa de permissões de um cargo.
 * ADM (nível >= 100) recebe acesso total independente do que estiver salvo,
 * para que ninguém consiga se trancar fora do próprio sistema.
 */
export function buildPermissionMap(
  level: number,
  rows: Array<{ page: Page } & Partial<PagePermission>>,
): PermissionMap {
  if (level >= ADMIN_LEVEL) return fullPermissionMap();

  const map = emptyPermissionMap();
  for (const row of rows) {
    const key = row.page as PageKey;
    if (!map[key]) continue;
    map[key] = {
      canView: row.canView ?? false,
      canCreate: row.canCreate ?? false,
      canEdit: row.canEdit ?? false,
      canDelete: row.canDelete ?? false,
    };
  }
  return map;
}

export function can(
  permissions: PermissionMap | undefined,
  page: PageKey,
  action: PermissionAction = "view",
): boolean {
  const entry = permissions?.[page];
  if (!entry) return false;
  switch (action) {
    case "view":
      return entry.canView;
    case "create":
      return entry.canCreate;
    case "edit":
      return entry.canEdit;
    case "delete":
      return entry.canDelete;
  }
}

/** Primeira página que o usuário pode abrir — destino do login. */
export function firstAllowedRoute(permissions: PermissionMap): string | null {
  const page = PAGES.find((p) => permissions[p]?.canView);
  return page ? PAGE_ROUTES[page] : null;
}

/** Descobre a qual página uma rota pertence, para o middleware. */
export function pageForPathname(pathname: string): PageKey | null {
  const match = PAGES.find(
    (page) =>
      pathname === PAGE_ROUTES[page] ||
      pathname.startsWith(`${PAGE_ROUTES[page]}/`),
  );
  return match ?? null;
}
