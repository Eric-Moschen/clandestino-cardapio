import Link from "next/link";
import { signInAdmin } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const messages: Record<string, string> = {
  missing: "Informe e-mail e senha.", credentials: "E-mail ou senha inválidos.",
  unauthorized: "Este usuário não tem permissão de administrador.", timeout: "Sua sessão foi encerrada após 5 minutos sem interação.",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
    if (data) redirect("/admin");
  }
  const params = await searchParams;
  return <main className="loginPage"><form action={signInAdmin} className="loginCard">
    <Link className="brandMark" href="/">O CLANDESTINO</Link><p className="eyebrow">ÁREA RESTRITA</p><h1>Painel administrativo</h1>
    <p className="muted">Entre com a conta autorizada para gerenciar o cardápio.</p>
    {params.error && <p className="notice error">{messages[params.error] ?? "Não foi possível entrar. Tente novamente."}</p>}
    <label>E-mail<input type="email" name="email" autoComplete="username" required /></label>
    <label>Senha<input type="password" name="password" autoComplete="current-password" required /></label>
    <button className="adminButton primary full" type="submit">Entrar no painel</button>
    <Link className="backLink" href="/">← Voltar ao cardápio</Link>
  </form></main>;
}
