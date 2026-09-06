import type { Metadata } from "next";

import { requirePage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import type { PagePermission } from "@/lib/permissions";
import { TeamView, type Member, type RoleRow } from "./team-view";

export const metadata: Metadata = { title: "Equipe" };

export default async function EquipePage() {
  const session = await requirePage("EQUIPE");

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { role: true },
    }),
    prisma.role.findMany({
      orderBy: { level: "desc" },
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
    }),
  ]);

  const members: Member[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    jobTitle: u.jobTitle,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    isActive: u.isActive,
    isFounder: u.isFounder,
    roleId: u.roleId,
    roleName: u.role?.name ?? null,
    roleColor: u.role?.color ?? null,
    roleLevel: u.role?.level ?? 0,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }));

  const roleRows: RoleRow[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
    level: r.level,
    isSystem: r.isSystem,
    memberCount: r._count.users,
    permissions: Object.fromEntries(
      r.permissions.map((p) => [
        p.page,
        {
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
        } satisfies PagePermission,
      ]),
    ),
  }));

  return (
    <TeamView
      members={members}
      roles={roleRows}
      isAdmin={session.user.isAdmin}
      currentUserId={session.user.id}
    />
  );
}
