import type {
  ClientStatus,
  ContractStatus,
  InvoiceStatus,
  LeadSource,
  PayKind,
  Service,
  Temperature,
  BillingCycle,
} from "@/generated/prisma";

/** Rótulos legíveis dos enums do banco, com a cor usada nos badges. */

export const SERVICE_LABEL: Record<Service, string> = {
  TRAFEGO_PAGO: "Tráfego Pago",
  CONSULTORIA: "Consultoria",
  SISTEMAS: "Sistemas",
  SOCIAL_MEDIA: "Social Media",
  SITE_LP: "Site & LP",
  VIDEO: "Vídeo",
  BRANDING: "Branding",
};

export const CLIENT_STATUS: Record<
  ClientStatus,
  { label: string; className: string }
> = {
  ATIVO: {
    label: "Ativo",
    className: "border-success/30 bg-success/10 text-success",
  },
  PAUSADO: {
    label: "Pausado",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  ENCERRADO: {
    label: "Encerrado",
    className: "border-line-strong bg-surface-3 text-fg-muted",
  },
  PROSPECCAO: {
    label: "Prospecção",
    className: "border-info/30 bg-info/10 text-info",
  },
};

export const LEAD_SOURCE: Record<LeadSource, string> = {
  INDICACAO: "Indicação",
  INSTAGRAM: "Instagram",
  GOOGLE: "Google",
  SITE: "Site",
  PROSPECCAO_ATIVA: "Prospecção ativa",
  EVENTO: "Evento",
  OUTRO: "Outro",
};

export const TEMPERATURE: Record<
  Temperature,
  { label: string; className: string; dot: string }
> = {
  FRIO: {
    label: "Frio",
    className: "border-info/30 bg-info/10 text-info",
    dot: "#3B82F6",
  },
  MORNO: {
    label: "Morno",
    className: "border-warning/30 bg-warning/10 text-warning",
    dot: "#F59E0B",
  },
  QUENTE: {
    label: "Quente",
    className: "border-brand/30 bg-brand-soft text-brand",
    dot: "#E11D2E",
  },
};

export const PAY_KIND: Record<PayKind, string> = {
  SALARIO: "Salário",
  PRO_LABORE: "Pró-labore",
  FREELA: "Freelancer",
  COMISSAO: "Comissão",
  BONUS: "Bônus",
};

export const BILLING_CYCLE: Record<BillingCycle, string> = {
  MENSAL: "Mensal",
  ANUAL: "Anual",
  UNICO: "Único",
};

export const CONTRACT_STATUS: Record<
  ContractStatus,
  { label: string; className: string }
> = {
  ATIVO: {
    label: "Ativo",
    className: "border-success/30 bg-success/10 text-success",
  },
  RENOVACAO: {
    label: "Em renovação",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  ENCERRADO: {
    label: "Encerrado",
    className: "border-line-strong bg-surface-3 text-fg-muted",
  },
  RASCUNHO: {
    label: "Rascunho",
    className: "border-info/30 bg-info/10 text-info",
  },
};

export const INVOICE_STATUS: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  PENDENTE: {
    label: "Pendente",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  PAGO: { label: "Pago", className: "border-success/30 bg-success/10 text-success" },
  ATRASADO: {
    label: "Atrasado",
    className: "border-danger/30 bg-danger/10 text-danger",
  },
  CANCELADO: {
    label: "Cancelado",
    className: "border-line-strong bg-surface-3 text-fg-muted",
  },
};
