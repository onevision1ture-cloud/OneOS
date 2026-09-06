import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar · One OS",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/inicio");

  return <LoginForm />;
}
