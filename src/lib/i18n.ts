export type Locale = "pt" | "en";

export const LOCALES: Locale[] = ["pt", "en"];

export const dict = {
  pt: {
    "app.tagline": "Sistema operacional da Onevision1ture",
    "nav.inicio": "Início",
    "nav.clientes": "Clientes",
    "nav.crm": "CRM",
    "nav.equipe": "Equipe",
    "nav.financeiro": "Financeiro",
    "nav.contratos": "Contratos",
    "nav.arquivos": "Arquivos",
    "nav.configuracoes": "Configurações",
    "nav.perfil": "Perfil",
    "nav.sair": "Sair",

    "login.title": "Entrar no One OS",
    "login.subtitle": "Acesso restrito à equipe Onevision",
    "login.email": "E-mail",
    "login.password": "Senha",
    "login.submit": "Entrar",
    "login.loading": "Verificando acesso...",
    "login.error": "E-mail ou senha incorretos.",
    "login.inactive": "Este acesso está desativado. Fale com um administrador.",

    "common.search": "Buscar",
    "common.save": "Salvar",
    "common.saving": "Salvando...",
    "common.cancel": "Cancelar",
    "common.delete": "Excluir",
    "common.edit": "Editar",
    "common.new": "Novo",
    "common.close": "Fechar",
    "common.confirm": "Confirmar",
    "common.loading": "Carregando",
    "common.empty": "Nada por aqui ainda",
    "common.total": "Total",
    "common.all": "Todos",
    "common.actions": "Ações",
    "common.none": "Nenhum",
    "common.saved": "Alterações salvas",

    "home.greeting.morning": "Bom dia",
    "home.greeting.afternoon": "Boa tarde",
    "home.greeting.evening": "Boa noite",
    "home.subtitle": "Aqui está o panorama da operação hoje.",

    "kpi.mrr": "MRR",
    "kpi.mrr.help":
      "Receita Recorrente Mensal: a soma dos fees fixos de todos os clientes ativos. É o que entra todo mês sem depender de venda nova.",
    "kpi.verba": "Verba sob gestão",
    "kpi.verba.help":
      "Total de investimento em mídia que a agência administra por mês, somando a verba de todos os clientes ativos.",
    "kpi.clientes": "Clientes ativos",
    "kpi.clientes.help": "Clientes com contrato em andamento no momento.",
    "kpi.pipeline": "Pipeline",
    "kpi.pipeline.help":
      "Valor somado de todas as oportunidades em aberto no CRM, sem contar ganhos e perdidos.",
    "kpi.ticket": "Ticket médio",
    "kpi.ticket.help":
      "Fee médio por cliente ativo: MRR dividido pelo número de clientes.",
    "kpi.conversao": "Conversão",
    "kpi.conversao.help":
      "Percentual de leads que viraram clientes em relação ao total de leads já encerrados.",
    "kpi.custo": "Custo fixo",
    "kpi.custo.help":
      "Soma mensal de folha da equipe e assinaturas de ferramentas.",
    "kpi.margem": "Margem",
    "kpi.margem.help":
      "Quanto sobra do MRR depois de descontar o custo fixo mensal.",

    "clients.title": "Clientes",
    "clients.subtitle": "Carteira, verba e serviços contratados",
    "clients.budget": "Verba mensal",
    "clients.fee": "Fee mensal",
    "clients.services": "Serviços",
    "clients.owner": "Responsável",
    "clients.new": "Novo cliente",

    "crm.title": "CRM",
    "crm.subtitle": "Da captação ao cliente",
    "crm.newLead": "Novo lead",
    "crm.value": "Valor estimado",
    "crm.source": "Origem",
    "crm.temperature": "Temperatura",

    "team.title": "Equipe",
    "team.subtitle": "Pessoas, cargos e permissões",
    "team.roles": "Cargos",
    "team.invite": "Adicionar pessoa",
    "team.permissions": "Permissões",
    "team.adminOnly": "Apenas administradores podem alterar esta área.",

    "finance.title": "Financeiro",
    "finance.subtitle": "Folha, ferramentas e resultado",
    "finance.payroll": "Folha da equipe",
    "finance.tools": "Ferramentas",
    "finance.revenue": "Receita",
    "finance.expenses": "Despesas",

    "contracts.title": "Contratos",
    "contracts.subtitle": "Documentos e vigências",

    "files.title": "Arquivos",
    "files.subtitle": "Arraste para organizar em pastas",
    "files.newFolder": "Nova pasta",

    "settings.title": "Configurações",
    "settings.subtitle": "Preferências do sistema",
    "settings.appearance": "Aparência",
    "settings.language": "Idioma",
    "settings.theme": "Tema",
    "settings.theme.dark": "Escuro",
    "settings.theme.light": "Claro",
    "settings.company": "Empresa",
    "settings.security": "Segurança",

    "profile.title": "Perfil",
    "profile.subtitle": "Seus dados e preferências",
    "profile.changePassword": "Alterar senha",
    "profile.currentPassword": "Senha atual",
    "profile.newPassword": "Nova senha",

    "error.404.title": "Página não encontrada",
    "error.403.title": "Acesso restrito",
    "error.500.title": "Algo saiu do trilho",
    "error.back": "Voltar ao início",
  },

  en: {
    "app.tagline": "Onevision1ture operating system",
    "nav.inicio": "Home",
    "nav.clientes": "Clients",
    "nav.crm": "CRM",
    "nav.equipe": "Team",
    "nav.financeiro": "Finance",
    "nav.contratos": "Contracts",
    "nav.arquivos": "Files",
    "nav.configuracoes": "Settings",
    "nav.perfil": "Profile",
    "nav.sair": "Sign out",

    "login.title": "Sign in to One OS",
    "login.subtitle": "Restricted to the Onevision team",
    "login.email": "Email",
    "login.password": "Password",
    "login.submit": "Sign in",
    "login.loading": "Verifying access...",
    "login.error": "Wrong email or password.",
    "login.inactive": "This account is disabled. Contact an administrator.",

    "common.search": "Search",
    "common.save": "Save",
    "common.saving": "Saving...",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.new": "New",
    "common.close": "Close",
    "common.confirm": "Confirm",
    "common.loading": "Loading",
    "common.empty": "Nothing here yet",
    "common.total": "Total",
    "common.all": "All",
    "common.actions": "Actions",
    "common.none": "None",
    "common.saved": "Changes saved",

    "home.greeting.morning": "Good morning",
    "home.greeting.afternoon": "Good afternoon",
    "home.greeting.evening": "Good evening",
    "home.subtitle": "Here's how the operation looks today.",

    "kpi.mrr": "MRR",
    "kpi.mrr.help":
      "Monthly Recurring Revenue: the sum of fixed fees from all active clients. It is what comes in every month without new sales.",
    "kpi.verba": "Managed ad spend",
    "kpi.verba.help":
      "Total monthly media investment the agency manages across all active clients.",
    "kpi.clientes": "Active clients",
    "kpi.clientes.help": "Clients with an ongoing contract right now.",
    "kpi.pipeline": "Pipeline",
    "kpi.pipeline.help":
      "Combined value of all open opportunities in the CRM, excluding won and lost.",
    "kpi.ticket": "Average ticket",
    "kpi.ticket.help": "Average fee per active client: MRR divided by client count.",
    "kpi.conversao": "Conversion",
    "kpi.conversao.help":
      "Share of leads that became clients out of all closed leads.",
    "kpi.custo": "Fixed cost",
    "kpi.custo.help": "Monthly team payroll plus tool subscriptions.",
    "kpi.margem": "Margin",
    "kpi.margem.help": "What's left of MRR after the fixed monthly cost.",

    "clients.title": "Clients",
    "clients.subtitle": "Portfolio, budget and contracted services",
    "clients.budget": "Monthly budget",
    "clients.fee": "Monthly fee",
    "clients.services": "Services",
    "clients.owner": "Owner",
    "clients.new": "New client",

    "crm.title": "CRM",
    "crm.subtitle": "From lead to client",
    "crm.newLead": "New lead",
    "crm.value": "Estimated value",
    "crm.source": "Source",
    "crm.temperature": "Temperature",

    "team.title": "Team",
    "team.subtitle": "People, roles and permissions",
    "team.roles": "Roles",
    "team.invite": "Add person",
    "team.permissions": "Permissions",
    "team.adminOnly": "Only administrators can change this area.",

    "finance.title": "Finance",
    "finance.subtitle": "Payroll, tools and results",
    "finance.payroll": "Team payroll",
    "finance.tools": "Tools",
    "finance.revenue": "Revenue",
    "finance.expenses": "Expenses",

    "contracts.title": "Contracts",
    "contracts.subtitle": "Documents and terms",

    "files.title": "Files",
    "files.subtitle": "Drag to organize into folders",
    "files.newFolder": "New folder",

    "settings.title": "Settings",
    "settings.subtitle": "System preferences",
    "settings.appearance": "Appearance",
    "settings.language": "Language",
    "settings.theme": "Theme",
    "settings.theme.dark": "Dark",
    "settings.theme.light": "Light",
    "settings.company": "Company",
    "settings.security": "Security",

    "profile.title": "Profile",
    "profile.subtitle": "Your details and preferences",
    "profile.changePassword": "Change password",
    "profile.currentPassword": "Current password",
    "profile.newPassword": "New password",

    "error.404.title": "Page not found",
    "error.403.title": "Restricted access",
    "error.500.title": "Something went off track",
    "error.back": "Back to home",
  },
} as const;

export type TranslationKey = keyof (typeof dict)["pt"];

export function translate(locale: Locale, key: TranslationKey): string {
  return dict[locale]?.[key] ?? dict.pt[key] ?? key;
}
