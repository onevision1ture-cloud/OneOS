import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number | string | { toString(): string }) {
  const n = typeof value === "number" ? value : Number(value.toString());
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatCompactBRL(value: number | string | { toString(): string }) {
  const n = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(n)) return "R$ 0";
  if (Math.abs(n) >= 1000) {
    return `R$ ${new Intl.NumberFormat("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n)}`;
  }
  return formatBRL(n);
}

export function formatDate(date: Date | string | null | undefined, locale = "pt-BR") {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Converte Decimal do Prisma (e Dates) em tipos serializáveis para o client. */
export function toPlain<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) =>
      typeof val === "bigint" ? val.toString() : val,
    ),
  );
}

export function num(value: unknown): number {
  if (value == null) return 0;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}
