"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { KeyRound, UserCog, Mail, Calendar, ShieldCheck } from "lucide-react";

import { formatDate } from "@/lib/utils";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Field, Textarea } from "@/components/ui/input";
import { InfoHint } from "@/components/ui/info-hint";
import { Avatar } from "@/components/layout/topbar";
import { saveProfile, changePassword, type ProfileInput } from "../configuracoes/actions";

export function ProfileView({
  user,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    jobTitle: string | null;
    phone: string | null;
    bio: string | null;
    avatarUrl: string | null;
    roleName: string | null;
    isFounder: boolean;
    createdAt: string;
    lastLoginAt: string | null;
  };
}) {
  const [form, setForm] = useState<ProfileInput>({
    name: user.name,
    jobTitle: user.jobTitle ?? "",
    phone: user.phone ?? "",
    bio: user.bio ?? "",
    avatarUrl: user.avatarUrl ?? "",
  });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [savingProfile, startProfile] = useTransition();
  const [savingPwd, startPwd] = useTransition();

  const submitProfile = () =>
    startProfile(async () => {
      const res = await saveProfile(form);
      if (res.ok) toast.success("Perfil atualizado.");
      else toast.error(res.error);
    });

  const submitPassword = () => {
    if (pwd.next !== pwd.confirm) {
      toast.error("A confirmação não bate com a nova senha.");
      return;
    }
    startPwd(async () => {
      const res = await changePassword(pwd.current, pwd.next);
      if (res.ok) {
        toast.success("Senha alterada.");
        setPwd({ current: "", next: "", confirm: "" });
      } else toast.error(res.error);
    });
  };

  return (
    <div>
      <PageHeader title="Perfil" subtitle="Seus dados e preferências de acesso" />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* cartão de identidade */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Card className="h-full p-6 text-center">
            <div className="flex justify-center">
              <Avatar name={form.name || user.name} url={form.avatarUrl} size={88} />
            </div>
            <h2 className="mt-4 text-base font-semibold">
              {form.name || user.name}
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">{user.email}</p>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {user.roleName && (
                <Badge className="border-brand/30 bg-brand-soft text-brand">
                  {user.roleName}
                </Badge>
              )}
              {user.isFounder && <Badge>Fundador</Badge>}
            </div>

            <div className="mt-5 space-y-2 border-t border-line pt-4 text-left text-[11px] text-fg-muted">
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 shrink-0" />
                {user.email}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="size-3.5 shrink-0" />
                Na equipe desde {formatDate(user.createdAt)}
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 shrink-0" />
                {user.lastLoginAt
                  ? `Último acesso em ${formatDate(user.lastLoginAt)}`
                  : "Primeiro acesso"}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* dados editáveis */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
          className="lg:col-span-2"
        >
          <Card className="p-5">
            <SectionTitle>
              <UserCog className="mr-1 inline size-4 text-brand" />
              Dados pessoais
            </SectionTitle>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nome *">
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </Field>
              <Field label="Cargo na empresa">
                <Input
                  value={form.jobTitle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, jobTitle: e.target.value }))
                  }
                  placeholder="Ex.: Gestor de tráfego"
                />
              </Field>
              <Field label="Telefone">
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </Field>
              <Field
                label="Foto (link)"
                hint={
                  <InfoHint text="Cole o link de uma imagem. Se ficar vazio, o sistema mostra suas iniciais." />
                }
              >
                <Input
                  value={form.avatarUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, avatarUrl: e.target.value }))
                  }
                  placeholder="https://"
                />
              </Field>
              <Field label="Sobre você" className="sm:col-span-2">
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Uma linha sobre o que você faz na Onevision"
                  className="min-h-20"
                />
              </Field>
            </div>

            <div className="mt-4 flex justify-end">
              <Button loading={savingProfile} onClick={submitProfile}>
                Salvar alterações
              </Button>
            </div>
          </Card>

          {/* senha */}
          <Card className="mt-5 p-5">
            <SectionTitle
              hint={
                <InfoHint text="Sua senha é guardada criptografada. Nem administradores conseguem lê-la, apenas redefinir." />
              }
            >
              <KeyRound className="mr-1 inline size-4 text-brand" />
              Alterar senha
            </SectionTitle>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Senha atual">
                <Input
                  type="password"
                  value={pwd.current}
                  onChange={(e) =>
                    setPwd((p) => ({ ...p, current: e.target.value }))
                  }
                  autoComplete="current-password"
                />
              </Field>
              <Field label="Nova senha">
                <Input
                  type="password"
                  value={pwd.next}
                  onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirmar nova senha">
                <Input
                  type="password"
                  value={pwd.confirm}
                  onChange={(e) =>
                    setPwd((p) => ({ ...p, confirm: e.target.value }))
                  }
                  autoComplete="new-password"
                />
              </Field>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="secondary"
                loading={savingPwd}
                disabled={!pwd.current || !pwd.next}
                onClick={submitPassword}
              >
                Alterar senha
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
