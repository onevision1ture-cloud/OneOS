"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  // Esc fecha, e o fundo trava o scroll enquanto o modal está aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const width = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }[size];

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface-1 shadow-2xl shadow-black/50",
              width,
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line p-5">
              <div>
                <h2 className="text-base font-semibold tracking-tight">{title}</h2>
                {description && (
                  <p className="mt-1 text-xs text-fg-muted">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2/50 p-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Confirmação para ações destrutivas (excluir, expulsar). */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm leading-relaxed text-fg-soft">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="h-9 rounded-lg border border-line bg-surface-3 px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-4"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="h-9 rounded-lg bg-danger px-4 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Processando..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
