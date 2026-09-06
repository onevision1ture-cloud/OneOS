"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  UserX,
  UserCheck,
  Lock,
  Crown,
} from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import {
  PAGES,
  PAGE_LABELS,
  type PageKey,
  type PagePermission,
} from "@/lib/permissions";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { InfoHint } from "@/components/ui/info-hint";
import { Avatar } from "@/components/layout/topbar";
import {
  saveMember,
  removeMember,
  toggleMemberActive,
  saveRole,
  deleteRole,
  type MemberInput,
  type RoleInput,
  type PermissionInput,
} from "./actions";

export type Member = {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isFounder: boolean;
  roleId: string | null;
  roleName: string | null;
  roleColor: string | null;
  roleLevel: number;
  lastLoginAt: string | null;
  createdAt: string;
};

export type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  level: number;
  isSystem: boolean;
  memberCount: number;
  permissions: Record<string, PagePermission>;
};

export function TeamView({
  members,
  roles,
  isAdmin,
  currentUserId,
}: {
  members: Member[];
  roles: RoleRow[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [tab, setTab] = useState<"pessoas" | "cargos">("pessoas");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [creatingMember, setCreatingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState<Member | null>(null);
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [removingRole, setRemovingRole] = useState<RoleRow | null>(null);
  const [pending, startTransition] = useTransition();

  const doRemoveMember = () => {
    if (!removingMember) return;
    startTransition(async () => {
      const res = await removeMember(removingMember.id);
      if (res.ok) {
        toast.success(`${removingMember.name} foi removido da equipe.`);
        setRemovingMember(null);
      } else {
        toast.error(res.error);
      }
    });
  };

  const doToggle = (member: Member) => {
    startTransition(async () => {
      const res = await toggleMemberActive(member.id, !member.isActive);
      if (res.ok) {
        toast.success(
          member.isActive
            ? `${member.name} não consegue mais entrar.`
            : `${member.name} voltou a ter acesso.`,
        );
      } else {
        toast.error(res.error);
      }
    });
  };

  const doRemoveRole = () => {
    if (!removingRole) return;
    startTransition(async () => {
      const res = await deleteRole(removingRole.id);
      if (res.ok) {
        toast.success("Cargo removido.");
        setRemovingRole(null);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div>
      <PageHeader
        title="Equipe"
        subtitle="Pessoas, cargos e o que cada um enxerga no sistema"
        actions={
          isAdmin && (
            <Button
              onClick={() =>
                tab === "pessoas" ? setCreatingMember(true) : setCreatingRole(true)
              }
            >
              <Plus className="size-4" />
              {tab === "pessoas" ? "Adicionar pessoa" : "Novo cargo"}
            </Button>
          )
        }
      />

      {!isAdmin && (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
          <Lock className="size-4 shrink-0" />
          Você pode ver a equipe, mas apenas administradores alteram cargos,
          permissões e acessos.
        </div>
      )}

      {/* abas */}
      <div className="mb-5 flex gap-1 rounded-lg border border-line bg-surface-1 p-1">
        {(["pessoas", "cargos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative flex-1 rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors",
              tab === t ? "text-brand-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {tab === t && (
              <motion.span
                layoutId="team-tab"
                className="absolute inset-0 rounded-md bg-brand"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            <span className="relative">
              {t === "pessoas"
                ? `Pessoas (${members.length})`
                : `Cargos (${roles.length})`}
            </span>
          </button>
        ))}
      </div>

      {tab === "pessoas" ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {members.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3) }}
            >
              <Card
                hover
                className={cn("group h-full p-5", !member.isActive && "opacity-60")}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={member.name} url={member.avatarUrl} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-sm font-semibold">
                        {member.name}
                      </h3>
                      {member.isFounder && (
                        <Crown className="size-3.5 shrink-0 text-brand" />
                      )}
                    </div>
                    <p className="truncate text-xs text-fg-muted">
                      {member.email}
                    </p>
                    {member.jobTitle && (
                      <p className="mt-0.5 truncate text-xs text-fg-soft">
                        {member.jobTitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {member.roleName ? (
                    <Badge
                      className="border-current/30"
                      dot={member.roleColor ?? undefined}
                    >
                      {member.roleName}
                    </Badge>
                  ) : (
                    <Badge>Sem cargo</Badge>
                  )}
                  <Badge
                    className={
                      member.isActive
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-danger/30 bg-danger/10 text-danger"
                    }
                  >
                    {member.isActive ? "Ativo" : "Bloqueado"}
                  </Badge>
                </div>

                <div className="mt-3 border-t border-line pt-3 text-[11px] text-fg-muted">
                  {member.lastLoginAt
                    ? `Último acesso em ${formatDate(member.lastLoginAt)}`
                    : "Nunca entrou no sistema"}
                </div>

                {isAdmin && !member.isFounder && (
                  <div className="mt-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingMember(member)}
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                    {member.id !== currentUserId && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => doToggle(member)}
                          title={member.isActive ? "Bloquear acesso" : "Reativar"}
                        >
                          {member.isActive ? (
                            <UserX className="size-3.5" />
                          ) : (
                            <UserCheck className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRemovingMember(member)}
                          className="ml-auto text-fg-muted hover:text-danger"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {isAdmin && member.isFounder && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-muted">
                    <Lock className="size-3" />
                    Acesso do fundador, protegido
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role, i) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
            >
              <Card className="group p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ background: `${role.color}1f`, color: role.color }}
                    >
                      {role.level >= 100 ? (
                        <ShieldCheck className="size-4" />
                      ) : (
                        <Shield className="size-4" />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{role.name}</h3>
                        {role.isSystem && <Badge>Cargo base</Badge>}
                        <span className="flex items-center gap-1 text-[11px] text-fg-muted">
                          nível {role.level}
                          <InfoHint text="Quanto maior o nível, mais poder o cargo tem. Nível 100 é administrador e enxerga tudo, sem exceção." />
                        </span>
                      </div>
                      {role.description && (
                        <p className="mt-1 max-w-lg text-xs text-fg-muted">
                          {role.description}
                        </p>
                      )}
                      <p className="mt-1.5 text-[11px] text-fg-muted">
                        {role.memberCount}{" "}
                        {role.memberCount === 1 ? "pessoa" : "pessoas"} neste cargo
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingRole(role)}
                      >
                        <Pencil className="size-3.5" />
                        Permissões
                      </Button>
                      {!role.isSystem && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRemovingRole(role)}
                          className="text-fg-muted hover:text-danger"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* resumo do que o cargo acessa */}
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
                  {PAGES.map((page) => {
                    const p = role.permissions[page];
                    const level = !p?.canView
                      ? "none"
                      : p.canDelete
                        ? "full"
                        : p.canEdit || p.canCreate
                          ? "edit"
                          : "read";
                    return (
                      <span
                        key={page}
                        title={
                          {
                            none: "Sem acesso",
                            read: "Só visualiza",
                            edit: "Visualiza e edita",
                            full: "Controle total",
                          }[level]
                        }
                        className={cn(
                          "rounded-md border px-2 py-1 text-[10px] font-medium",
                          level === "none" &&
                            "border-line bg-surface-2 text-fg-muted line-through opacity-50",
                          level === "read" &&
                            "border-info/30 bg-info/10 text-info",
                          level === "edit" &&
                            "border-warning/30 bg-warning/10 text-warning",
                          level === "full" &&
                            "border-success/30 bg-success/10 text-success",
                        )}
                      >
                        {PAGE_LABELS[page].pt}
                      </span>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <MemberFormModal
        open={creatingMember || editingMember !== null}
        member={editingMember}
        roles={roles}
        onClose={() => {
          setCreatingMember(false);
          setEditingMember(null);
        }}
      />

      <RoleFormModal
        open={creatingRole || editingRole !== null}
        role={editingRole}
        onClose={() => {
          setCreatingRole(false);
          setEditingRole(null);
        }}
      />

      <ConfirmModal
        open={removingMember !== null}
        onClose={() => setRemovingMember(null)}
        onConfirm={doRemoveMember}
        loading={pending}
        title="Remover da equipe"
        message={`${removingMember?.name ?? ""} perderá o acesso ao One OS imediatamente. Se preferir só suspender, use o botão de bloquear em vez de excluir.`}
        confirmLabel="Remover definitivamente"
      />

      <ConfirmModal
        open={removingRole !== null}
        onClose={() => setRemovingRole(null)}
        onConfirm={doRemoveRole}
        loading={pending}
        title="Excluir cargo"
        message={`O cargo "${removingRole?.name ?? ""}" será apagado. Só é possível se não houver ninguém nele.`}
        confirmLabel="Excluir cargo"
      />
    </div>
  );
}

const EMPTY_MEMBER: MemberInput = {
  name: "",
  email: "",
  jobTitle: "",
  phone: "",
  roleId: "",
  isActive: true,
  password: "",
};

function MemberFormModal({
  open,
  member,
  roles,
  onClose,
}: {
  open: boolean;
  member: Member | null;
  roles: RoleRow[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<MemberInput>(EMPTY_MEMBER);
  const [pending, startTransition] = useTransition();
  const [initialized, setInitialized] = useState<string | null>(null);

  const key = member?.id ?? "novo";
  if (open && initialized !== key) {
    setInitialized(key);
    setForm(
      member
        ? {
            name: member.name,
            email: member.email,
            jobTitle: member.jobTitle ?? "",
            phone: member.phone ?? "",
            roleId: member.roleId ?? "",
            isActive: member.isActive,
            password: "",
          }
        : EMPTY_MEMBER,
    );
  }

  const set = <K extends keyof MemberInput>(k: K, v: MemberInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const close = () => {
    setInitialized(null);
    onClose();
  };

  const submit = () => {
    startTransition(async () => {
      const res = await saveMember(member?.id ?? null, form);
      if (res.ok) {
        toast.success(member ? "Dados atualizados." : "Pessoa adicionada à equipe.");
        close();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={member ? "Editar pessoa" : "Adicionar à equipe"}
      description="O cargo define o que ela vai enxergar em cada página."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={pending}>
            {member ? "Salvar" : "Adicionar"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *" className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>

        <Field label="E-mail *" className="sm:col-span-2">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="pessoa@onevision1ture.com.br"
          />
        </Field>

        <Field label="Cargo na empresa">
          <Input
            value={form.jobTitle}
            onChange={(e) => set("jobTitle", e.target.value)}
            placeholder="Ex.: Gestor de tráfego"
          />
        </Field>
        <Field label="Telefone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>

        <Field
          label="Cargo no sistema"
          hint={
            <InfoHint text="Define as permissões. Um Comercial, por exemplo, vê o CRM inteiro mas não abre o Financeiro." />
          }
        >
          <Select
            value={form.roleId}
            onChange={(e) => set("roleId", e.target.value)}
          >
            <option value="">Sem cargo (nenhum acesso)</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Situação">
          <Select
            value={form.isActive ? "1" : "0"}
            onChange={(e) => set("isActive", e.target.value === "1")}
          >
            <option value="1">Ativo</option>
            <option value="0">Bloqueado</option>
          </Select>
        </Field>

        <Field
          label={member ? "Nova senha (deixe vazio para manter)" : "Senha inicial *"}
          className="sm:col-span-2"
          hint={
            <InfoHint text="A senha é guardada criptografada. Nem os administradores conseguem lê-la depois, apenas redefinir." />
          }
        >
          <Input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder={member ? "••••••••" : "Mínimo 6 caracteres"}
            autoComplete="new-password"
          />
        </Field>
      </div>
    </Modal>
  );
}

const ALL_OFF: PagePermission = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
};

function RoleFormModal({
  open,
  role,
  onClose,
}: {
  open: boolean;
  role: RoleRow | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<RoleInput>({
    name: "",
    description: "",
    color: "#E11D2E",
    level: 10,
  });
  const [perms, setPerms] = useState<PermissionInput>({});
  const [pending, startTransition] = useTransition();
  const [initialized, setInitialized] = useState<string | null>(null);

  const key = role?.id ?? "novo";
  if (open && initialized !== key) {
    setInitialized(key);
    setForm(
      role
        ? {
            name: role.name,
            description: role.description ?? "",
            color: role.color,
            level: role.level,
          }
        : { name: "", description: "", color: "#E11D2E", level: 10 },
    );
    setPerms(
      Object.fromEntries(
        PAGES.map((p) => [p, role?.permissions[p] ?? { ...ALL_OFF }]),
      ),
    );
  }

  const close = () => {
    setInitialized(null);
    onClose();
  };

  const togglePerm = (page: PageKey, action: keyof PagePermission) => {
    setPerms((prev) => {
      const current = prev[page] ?? { ...ALL_OFF };
      const next = { ...current, [action]: !current[action] };

      // Sem ver a página, não faz sentido poder criar/editar/excluir nela.
      if (action === "canView" && !next.canView) {
        next.canCreate = false;
        next.canEdit = false;
        next.canDelete = false;
      }
      if (action !== "canView" && next[action]) next.canView = true;

      return { ...prev, [page]: next };
    });
  };

  const submit = () => {
    startTransition(async () => {
      const res = await saveRole(role?.id ?? null, form, perms);
      if (res.ok) {
        toast.success(role ? "Permissões atualizadas." : "Cargo criado.");
        close();
      } else {
        toast.error(res.error);
      }
    });
  };

  const isAdminRole = Number(form.level) >= 100;

  return (
    <Modal
      open={open}
      onClose={close}
      title={role ? `Permissões · ${role.name}` : "Novo cargo"}
      description="Marque o que este cargo pode fazer em cada página do sistema."
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={pending}>
            {role ? "Salvar permissões" : "Criar cargo"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nome do cargo *" className="sm:col-span-2">
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex.: Designer"
            disabled={role?.isSystem}
          />
        </Field>
        <Field
          label="Nível"
          hint={
            <InfoHint text="De 0 a 100. Nível 100 vira administrador e passa a ver tudo, ignorando as marcações abaixo." />
          }
        >
          <Input
            type="number"
            min={0}
            max={100}
            value={form.level}
            onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
          />
        </Field>
        <Field label="Descrição" className="sm:col-span-3">
          <Textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="O que essa pessoa faz na operação"
            className="min-h-16"
          />
        </Field>
      </div>

      {isAdminRole && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2.5 text-xs text-brand">
          <ShieldCheck className="size-4 shrink-0" />
          Nível 100 é administrador: enxerga e altera tudo, independente das
          marcações abaixo.
        </div>
      )}

      <div className="mt-6">
        <SectionTitle
          hint={
            <InfoHint text="Ver = a página aparece no menu. Criar, Editar e Excluir liberam as ações dentro dela." />
          }
        >
          Permissões por página
        </SectionTitle>

        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-xs text-fg-muted">
                <th className="p-3 text-left font-medium">Página</th>
                {(["Ver", "Criar", "Editar", "Excluir"] as const).map((h) => (
                  <th key={h} className="w-20 p-3 text-center font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PAGES.map((page) => {
                const p = perms[page] ?? ALL_OFF;
                const actions: Array<[keyof PagePermission, boolean]> = [
                  ["canView", p.canView],
                  ["canCreate", p.canCreate],
                  ["canEdit", p.canEdit],
                  ["canDelete", p.canDelete],
                ];
                return (
                  <tr
                    key={page}
                    className="border-b border-line last:border-0 hover:bg-surface-2/50"
                  >
                    <td className="p-3 font-medium">{PAGE_LABELS[page].pt}</td>
                    {actions.map(([action, checked]) => (
                      <td key={action} className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => togglePerm(page, action)}
                          disabled={isAdminRole}
                          aria-label={`${action} em ${PAGE_LABELS[page].pt}`}
                          className={cn(
                            "h-5 w-5 rounded border transition-all",
                            isAdminRole || checked
                              ? "border-brand bg-brand"
                              : "border-line-strong bg-surface-2 hover:border-brand/50",
                            isAdminRole && "opacity-60",
                          )}
                        >
                          {(isAdminRole || checked) && (
                            <svg
                              viewBox="0 0 20 20"
                              fill="none"
                              className="h-full w-full p-0.5 text-white"
                            >
                              <path
                                d="m5 10 3.5 3.5L15 7"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
