"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/lib/auth";

const schema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export type LoginState = { error?: string } | null;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  try {
    // `redirect: false` faz o signIn devolver o resultado em vez de lançar
    // um NEXT_REDIRECT aqui dentro — o redirecionamento fica por nossa conta,
    // fora do try, onde nada intercepta o sinal.
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // O authorize marca a falha de banco com essa mensagem; ela chega
      // aqui embrulhada no AuthError, então procuramos no texto da causa.
      const causa = String(
        (error.cause as { err?: Error } | undefined)?.err?.message ?? error.message,
      );

      if (causa.includes("BANCO_INDISPONIVEL")) {
        return {
          error:
            "Não consegui falar com o banco de dados. Confira se ele está rodando (npm run dev:db) ou se a DATABASE_URL está correta.",
        };
      }

      // Muitas senhas erradas seguidas: o acesso fica travado por um tempo.
      const travado = causa.match(/MUITAS_TENTATIVAS:(\d+)/);
      if (travado) {
        const minutos = Math.max(1, Math.ceil(Number(travado[1]) / 60));
        return {
          error: `Muitas tentativas seguidas. Tente de novo em ${minutos} ${
            minutos === 1 ? "minuto" : "minutos"
          }.`,
        };
      }

      return { error: "E-mail ou senha incorretos." };
    }
    throw error;
  }

  // Chegou aqui: as credenciais valeram e o cookie de sessão já foi gravado.
  redirect("/inicio");
}

