import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { ProfileView } from "./profile-view";

export const metadata: Metadata = { title: "Perfil" };

export default async function PerfilPage() {
  // O perfil é de quem está logado — não depende de permissão de página.
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: { select: { name: true } } },
  });

  if (!user) notFound();

  return (
    <ProfileView
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        roleName: user.role?.name ?? null,
        isFounder: user.isFounder,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      }}
    />
  );
}
