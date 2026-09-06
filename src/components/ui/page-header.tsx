"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line-strong bg-surface-1/50 px-6 py-16 text-center">
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface-2 text-fg-muted">
          <Icon className="size-5" />
        </span>
      )}
      <p className="text-sm font-medium text-fg">{title}</p>
      {message && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-fg-muted">
          {message}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
  action,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-fg">
        {children}
        {hint}
      </h2>
      {action}
    </div>
  );
}
