"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/guard";
import { messageFor, type ActionResult } from "@/lib/action-result";

const nodeSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  kind: z.enum(["FOLDER", "FILE"]),
  parentId: z.string().nullable().optional(),
  url: z.string().optional(),
  clientId: z.string().optional(),
});

export type NodeInput = {
  name: string;
  kind: "FOLDER" | "FILE";
  parentId?: string | null;
  url?: string;
  clientId?: string;
};

export async function saveNode(
  id: string | null,
  input: NodeInput,
): Promise<ActionResult> {
  try {
    const session = await assertPermission("ARQUIVOS", id ? "edit" : "create");
    const parsed = nodeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const { parentId, clientId, url, ...rest } = parsed.data;
    const data = {
      ...rest,
      parentId: parentId || null,
      clientId: clientId || null,
      url: url || null,
    };

    if (id) {
      await prisma.fileNode.update({ where: { id }, data });
    } else {
      const last = await prisma.fileNode.findFirst({
        where: { parentId: data.parentId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      await prisma.fileNode.create({
        data: {
          ...data,
          position: (last?.position ?? -1) + 1,
          uploaderId: session.user.id,
        },
      });
    }

    revalidatePath("/arquivos");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

/**
 * Move um item para dentro de outra pasta (ou para a raiz).
 * Recusa mover uma pasta para dentro dela mesma ou de um filho dela,
 * o que quebraria a árvore.
 */
export async function moveNode(
  id: string,
  newParentId: string | null,
): Promise<ActionResult> {
  try {
    await assertPermission("ARQUIVOS", "edit");

    if (id === newParentId) {
      return { ok: false, error: "Uma pasta não pode entrar nela mesma." };
    }

    if (newParentId) {
      // sobe a árvore a partir do destino procurando o próprio item
      let cursor: string | null = newParentId;
      const seen = new Set<string>();
      while (cursor) {
        if (cursor === id) {
          return {
            ok: false,
            error: "Não dá para mover uma pasta para dentro dela mesma.",
          };
        }
        if (seen.has(cursor)) break;
        seen.add(cursor);

        const parent: { parentId: string | null } | null =
          await prisma.fileNode.findUnique({
            where: { id: cursor },
            select: { parentId: true },
          });
        cursor = parent?.parentId ?? null;
      }
    }

    const last = await prisma.fileNode.findFirst({
      where: { parentId: newParentId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    await prisma.fileNode.update({
      where: { id },
      data: { parentId: newParentId, position: (last?.position ?? -1) + 1 },
    });

    revalidatePath("/arquivos");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

export async function deleteNode(id: string): Promise<ActionResult> {
  try {
    const session = await assertPermission("ARQUIVOS", "delete");
    const node = await prisma.fileNode.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "delete",
        entity: "FileNode",
        entityId: id,
        meta: { name: node.name },
      },
    });

    revalidatePath("/arquivos");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}
