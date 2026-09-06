import { requireSession } from "@/lib/guard";
import { AppShell } from "@/components/layout/app-shell";
import type { Locale } from "@/lib/i18n";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const u = session.user;

  return (
    <AppShell
      user={{
        name: u.name ?? "Usuário",
        email: u.email ?? "",
        avatarUrl: u.avatarUrl ?? null,
        roleName: u.roleName ?? null,
        jobTitle: u.jobTitle ?? null,
      }}
      permissions={u.permissions}
      locale={(u.locale as Locale) ?? "pt"}
    >
      {children}
    </AppShell>
  );
}
