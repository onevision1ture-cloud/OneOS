"use client";

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  FolderPlus,
  FilePlus,
  Folder,
  FolderOpen,
  File as FileIcon,
  ChevronRight,
  Home,
  Pencil,
  Trash2,
  ExternalLink,
  CornerLeftUp,
} from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { saveNode, moveNode, deleteNode, type NodeInput } from "./actions";

export type FileRow = {
  id: string;
  name: string;
  kind: "FOLDER" | "FILE";
  url: string | null;
  parentId: string | null;
  position: number;
  clientId: string | null;
  clientName: string | null;
  uploaderName: string | null;
  createdAt: string;
};

export function FilesView({
  nodes: initialNodes,
  clients,
  canCreate,
  canEdit,
  canDelete,
}: {
  nodes: FileRow[];
  clients: Array<{ id: string; name: string }>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [nodes, setNodes] = useState(initialNodes);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [dragging, setDragging] = useState<FileRow | null>(null);
  const [creating, setCreating] = useState<"FOLDER" | "FILE" | null>(null);
  const [editing, setEditing] = useState<FileRow | null>(null);
  const [removing, setRemoving] = useState<FileRow | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const children = useMemo(
    () =>
      nodes
        .filter((n) => n.parentId === currentFolder)
        .sort((a, b) => {
          // pastas primeiro, depois alfabético
          if (a.kind !== b.kind) return a.kind === "FOLDER" ? -1 : 1;
          return a.name.localeCompare(b.name, "pt-BR");
        }),
    [nodes, currentFolder],
  );

  /** Caminho da raiz até a pasta atual, para a trilha de navegação. */
  const breadcrumb = useMemo(() => {
    const path: FileRow[] = [];
    let cursor = currentFolder;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const node = nodes.find((n) => n.id === cursor);
      if (!node) break;
      path.unshift(node);
      cursor = node.parentId;
    }
    return path;
  }, [currentFolder, nodes]);

  const countInside = (folderId: string) =>
    nodes.filter((n) => n.parentId === folderId).length;

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const { active, over } = e;
    if (!over) return;

    const nodeId = String(active.id);
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // "root" é a área de soltar da trilha, que devolve o item para a raiz
    const overId = String(over.id);
    const target = overId === "root" ? null : overId;

    if (target === node.parentId) return;
    if (target === nodeId) return;

    const previous = nodes;
    setNodes((ns) =>
      ns.map((n) => (n.id === nodeId ? { ...n, parentId: target } : n)),
    );

    startTransition(async () => {
      const res = await moveNode(nodeId, target);
      if (!res.ok) {
        setNodes(previous);
        toast.error(res.error);
      } else {
        const targetName =
          target === null
            ? "raiz"
            : (nodes.find((n) => n.id === target)?.name ?? "pasta");
        toast.success(`${node.name} movido para ${targetName}.`);
      }
    });
  };

  return (
    <div>
      <PageHeader
        title="Arquivos"
        subtitle="Arraste os itens para dentro das pastas para organizar"
        actions={
          canCreate && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setCreating("FILE")}>
                <FilePlus className="size-4" />
                Novo arquivo
              </Button>
              <Button onClick={() => setCreating("FOLDER")}>
                <FolderPlus className="size-4" />
                Nova pasta
              </Button>
            </div>
          )
        }
      />

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={(e: DragStartEvent) =>
          setDragging(nodes.find((n) => n.id === e.active.id) ?? null)
        }
        onDragEnd={onDragEnd}
      >
        {/* trilha de navegação, a raiz também recebe itens soltos */}
        <Breadcrumb
          path={breadcrumb}
          onNavigate={setCurrentFolder}
          canEdit={canEdit}
        />

        {children.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={
              currentFolder ? "Esta pasta está vazia" : "Nenhum arquivo ainda"
            }
            message={
              canCreate
                ? "Crie pastas para organizar contratos, criativos e materiais dos clientes."
                : "Ninguém adicionou nada aqui ainda."
            }
            action={
              canCreate ? (
                <Button onClick={() => setCreating("FOLDER")}>
                  <FolderPlus className="size-4" />
                  Nova pasta
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {children.map((node, i) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  index={i}
                  itemCount={node.kind === "FOLDER" ? countInside(node.id) : 0}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onOpen={() =>
                    node.kind === "FOLDER" ? setCurrentFolder(node.id) : undefined
                  }
                  onEdit={() => setEditing(node)}
                  onRemove={() => setRemoving(node)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        <DragOverlay>
          {dragging && (
            <div className="flex w-56 items-center gap-2.5 rounded-lg border border-brand bg-surface-2 p-3 shadow-2xl">
              {dragging.kind === "FOLDER" ? (
                <Folder className="size-4 text-brand" />
              ) : (
                <FileIcon className="size-4 text-fg-muted" />
              )}
              <span className="truncate text-sm font-medium">{dragging.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <NodeModal
        open={creating !== null || editing !== null}
        node={editing}
        kind={creating ?? editing?.kind ?? "FOLDER"}
        parentId={currentFolder}
        clients={clients}
        onClose={() => {
          setCreating(null);
          setEditing(null);
        }}
      />

      <ConfirmModal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteNode(removing!.id);
            if (res.ok) {
              setNodes((ns) => ns.filter((n) => n.id !== removing!.id));
              toast.success("Item excluído.");
              setRemoving(null);
            } else toast.error(res.error);
          })
        }
        title={removing?.kind === "FOLDER" ? "Excluir pasta" : "Excluir arquivo"}
        message={
          removing?.kind === "FOLDER"
            ? `A pasta "${removing?.name}" e tudo que está dentro dela serão apagados.`
            : `"${removing?.name ?? ""}" será removido da lista. O arquivo no link externo continua existindo.`
        }
        confirmLabel="Excluir"
      />
    </div>
  );
}

function Breadcrumb({
  path,
  onNavigate,
  canEdit,
}: {
  path: FileRow[];
  onNavigate: (id: string | null) => void;
  canEdit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "root", disabled: !canEdit });

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1 text-sm">
      <button
        ref={setNodeRef}
        onClick={() => onNavigate(null)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors",
          isOver
            ? "border-brand bg-brand-soft text-brand"
            : "border-transparent text-fg-soft hover:bg-surface-3 hover:text-fg",
        )}
      >
        <Home className="size-3.5" />
        Início
      </button>

      {path.map((node, i) => (
        <span key={node.id} className="flex items-center gap-1">
          <ChevronRight className="size-3.5 text-fg-muted" />
          <button
            onClick={() => onNavigate(node.id)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 transition-colors",
              i === path.length - 1
                ? "font-medium text-fg"
                : "text-fg-soft hover:bg-surface-3 hover:text-fg",
            )}
          >
            {node.name}
          </button>
        </span>
      ))}

      {path.length > 0 && (
        <button
          onClick={() => onNavigate(path[path.length - 1].parentId)}
          className="ml-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <CornerLeftUp className="size-3.5" />
          Voltar
        </button>
      )}
    </div>
  );
}

function NodeCard({
  node,
  index,
  itemCount,
  canEdit,
  canDelete,
  onOpen,
  onEdit,
  onRemove,
}: {
  node: FileRow;
  index: number;
  itemCount: number;
  canEdit: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef: dragRef, isDragging } = useDraggable({
    id: node.id,
    disabled: !canEdit,
  });

  // só pastas recebem outros itens
  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: node.id,
    disabled: node.kind !== "FOLDER" || !canEdit,
  });

  const isFolder = node.kind === "FOLDER";

  return (
    <motion.div
      ref={dropRef}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.25) }}
    >
      <div
        className={cn(
          "group relative rounded-card border bg-surface-1 p-4 transition-colors",
          isOver
            ? "border-brand bg-brand-soft"
            : "border-line hover:border-line-strong hover:bg-surface-2",
        )}
      >
        <div className="flex items-start gap-3">
          <button
            ref={dragRef}
            {...attributes}
            {...listeners}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
              isFolder
                ? "bg-brand-soft text-brand"
                : "bg-surface-3 text-fg-muted",
              canEdit && "cursor-grab touch-none active:cursor-grabbing",
            )}
            aria-label={canEdit ? `Arrastar ${node.name}` : node.name}
          >
            {isFolder ? (
              isOver ? (
                <FolderOpen className="size-5" />
              ) : (
                <Folder className="size-5" />
              )
            ) : (
              <FileIcon className="size-5" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <button
              onClick={onOpen}
              disabled={!isFolder}
              className={cn(
                "block w-full truncate text-left text-sm font-medium",
                isFolder && "hover:text-brand",
              )}
            >
              {node.name}
            </button>
            <p className="mt-0.5 text-[11px] text-fg-muted">
              {isFolder
                ? `${itemCount} ${itemCount === 1 ? "item" : "itens"}`
                : formatDate(node.createdAt)}
            </p>
            {node.clientName && (
              <p className="mt-1 truncate text-[10px] text-fg-muted">
                {node.clientName}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {node.url && (
            <a
              href={node.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 items-center gap-1 rounded px-2 text-[11px] text-fg-muted transition-colors hover:bg-surface-3 hover:text-brand"
            >
              <ExternalLink className="size-3" />
              Abrir
            </a>
          )}
          {canEdit && (
            <button
              onClick={onEdit}
              className="flex h-7 w-7 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
              aria-label="Renomear"
            >
              <Pencil className="size-3" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={onRemove}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger"
              aria-label="Excluir"
            >
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function NodeModal({
  open,
  node,
  kind,
  parentId,
  clients,
  onClose,
}: {
  open: boolean;
  node: FileRow | null;
  kind: "FOLDER" | "FILE";
  parentId: string | null;
  clients: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<NodeInput>({
    name: "",
    kind,
    parentId,
    url: "",
    clientId: "",
  });
  const [pending, startTransition] = useTransition();
  const [init, setInit] = useState<string | null>(null);

  const key = node?.id ?? `novo-${kind}-${parentId ?? "root"}`;
  if (open && init !== key) {
    setInit(key);
    setForm(
      node
        ? {
            name: node.name,
            kind: node.kind,
            parentId: node.parentId,
            url: node.url ?? "",
            clientId: node.clientId ?? "",
          }
        : { name: "", kind, parentId, url: "", clientId: "" },
    );
  }

  const close = () => {
    setInit(null);
    onClose();
  };

  const isFolder = form.kind === "FOLDER";

  return (
    <Modal
      open={open}
      onClose={close}
      title={
        node
          ? isFolder
            ? "Renomear pasta"
            : "Editar arquivo"
          : isFolder
            ? "Nova pasta"
            : "Novo arquivo"
      }
      description={
        isFolder
          ? "Pastas organizam os materiais por cliente, projeto ou tipo."
          : "Cole o link do arquivo (Drive, Dropbox, etc.)."
      }
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await saveNode(node?.id ?? null, form);
                if (res.ok) {
                  toast.success(node ? "Item atualizado." : "Item criado.");
                  close();
                } else toast.error(res.error);
              })
            }
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome *">
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={isFolder ? "Ex.: Criativos setembro" : "Ex.: Briefing.pdf"}
            autoFocus
          />
        </Field>

        {!isFolder && (
          <Field label="Link do arquivo">
            <Input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://"
            />
          </Field>
        )}

        <Field label="Cliente relacionado">
          <Select
            value={form.clientId}
            onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
          >
            <option value="">Nenhum</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
