"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, LogOut, User as UserIcon, ChevronDown } from "lucide-react";

import { cn, initials } from "@/lib/utils";

export function Topbar({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatarUrl: string | null;
    roleName: string | null;
    jobTitle: string | null;
  };
}) {
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-surface-1/85 px-5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-fg-muted">
          Onevision1ture
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Alternar tema"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-soft transition-colors hover:bg-surface-3 hover:text-fg"
        >
          {/*
            O tema só é conhecido depois da hidratação. Enquanto isso os dois
            ícones ficam no HTML e o CSS mostra o certo, assim o servidor e o
            cliente renderizam a mesma marcação, sem descasar.
          */}
          <Sun className="size-[18px] hidden dark:block" />
          <Moon className="size-[18px] block dark:hidden" />
        </button>

        {/* menu do usuário */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-surface-3"
          >
            <Avatar name={user.name} url={user.avatarUrl} />
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-xs font-medium text-fg">{user.name}</div>
              <div className="text-[10px] text-fg-muted">
                {user.jobTitle ?? user.roleName ?? ""}
              </div>
            </div>
            <ChevronDown
              className={cn(
                "size-3.5 text-fg-muted transition-transform",
                menuOpen && "rotate-180",
              )}
            />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-line-strong bg-surface-2 shadow-2xl shadow-black/40"
                >
                  <div className="border-b border-line p-3">
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className="mt-0.5 truncate text-xs text-fg-muted">
                      {user.email}
                    </div>
                    {user.roleName && (
                      <span className="mt-2 inline-flex rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand">
                        {user.roleName}
                      </span>
                    )}
                  </div>

                  <div className="p-1.5">
                    <Link
                      href="/perfil"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg-soft transition-colors hover:bg-surface-3 hover:text-fg"
                    >
                      <UserIcon className="size-4" />
                      Perfil
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg-soft transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <LogOut className="size-4" />
                      Sair
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

export function Avatar({
  name,
  url,
  size = 32,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="flex items-center justify-center rounded-full border border-brand/25 bg-brand-soft font-semibold text-brand"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}
