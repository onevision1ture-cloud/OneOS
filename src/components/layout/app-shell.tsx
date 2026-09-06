"use client";

import { SessionProvider } from "next-auth/react";

import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BootScreen } from "@/components/motion/boot-screen";
import { PageTransition, RouteProgress } from "@/components/motion/page-transition";
import type { PermissionMap } from "@/lib/permissions";
import type { Locale } from "@/lib/i18n";

export function AppShell({
  user,
  permissions,
  locale,
  children,
}: {
  user: {
    name: string;
    email: string;
    avatarUrl: string | null;
    roleName: string | null;
    jobTitle: string | null;
  };
  permissions: PermissionMap;
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <BootScreen />
      <RouteProgress />

      <div className="flex min-h-dvh bg-surface-0">
        <Sidebar permissions={permissions} locale={locale} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={user} />
          <main className="flex-1 px-5 pb-24 pt-6 md:px-8 md:pb-10">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        <MobileNav permissions={permissions} locale={locale} />
      </div>
    </SessionProvider>
  );
}
