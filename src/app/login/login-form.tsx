"use client";

import { useActionState, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

import { loginAction, type LoginState } from "./actions";
import { AuroraBackground } from "@/components/motion/aurora-background";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    null,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-6">
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[400px]"
      >
        <div className="glass rounded-2xl border border-white/[0.08] p-8 shadow-2xl shadow-black/50">
          {/* marca: já traz o nome escrito, sem repetir em texto */}
          <div className="mb-8 flex flex-col items-center text-center">
            <LogoMark size={44} />
            <p className="mt-4 text-xs text-fg-muted">
              Acesso restrito à equipe Onevision
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
              <Input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="seu@email.com"
                aria-label="E-mail"
                className="h-11 bg-surface-2/60 pl-10"
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Senha"
                aria-label="Senha"
                className="h-11 bg-surface-2/60 pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted transition-colors hover:text-fg"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {state?.error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">
                    <AlertCircle className="size-4 shrink-0" />
                    {state.error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              size="lg"
              loading={pending}
              className="w-full"
            >
              {pending ? "Verificando acesso..." : "Entrar"}
              {!pending && <ArrowRight className="size-4" />}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.24em] text-fg-muted">
          Onevision1ture · One OS
        </p>
      </motion.div>
    </main>
  );
}
