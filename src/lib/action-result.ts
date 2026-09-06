/**
 * Tipo de retorno das server actions e tradução dos erros
 * conhecidos para mensagens que a pessoa entende.
 *
 * Fica fora dos arquivos "use server" porque lá todo export
 * precisa ser uma função async.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

export function messageFor(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg === "SEM_PERMISSAO") return "Seu cargo não permite esta ação.";
  if (msg === "NAO_AUTENTICADO") return "Sua sessão expirou. Entre novamente.";
  if (msg === "ULTIMO_ADM")
    return "Este é o último administrador do sistema. Promova outra pessoa antes.";
  if (msg === "SENHA_INCORRETA") return "A senha atual não confere.";
  if (msg === "EMAIL_EM_USO") return "Já existe um acesso com este e-mail.";
  if (msg === "CARGO_DO_SISTEMA")
    return "Cargos base do sistema não podem ser removidos.";
  if (msg === "PROTEGIDO")
    return "Este acesso é o do fundador e não pode ser alterado por outra pessoa.";

  // Violação de unicidade do Postgres
  if (msg.includes("Unique constraint") || msg.includes("23505")) {
    return "Já existe um registro com esses dados.";
  }

  return "Não foi possível concluir. Tente novamente.";
}
