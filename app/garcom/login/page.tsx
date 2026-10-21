import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInStaff } from "@/lib/actions/staff-auth";

const errors: Record<string, string> = {
  missing: "Informe e-mail e senha.",
  credentials: "E-mail ou senha inválidos.",
  unauthorized: "Este usuário não está cadastrado como garçom ativo. Fale com o administrador.",
};

export default async function StaffLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: staff } = await supabase.from("staff_users").select("user_id,is_active").eq("user_id", user.id).maybeSingle();
    if (staff?.is_active) redirect("/garcom");
  }
  const params = await searchParams;
  return <main className="loginPage"><form action={signInStaff} className="loginCard">
    <Link className="brandMark" href="/">O CLANDESTINO</Link><p className="eyebrow">EQUIPE DE ATENDIMENTO</p><h1>Área do garçom</h1>
    <p className="muted">Entre com a conta cadastrada pela administração.</p>
    {params.error && <p className="notice error">{errors[params.error] ?? "Não foi possível entrar."}</p>}
    <label>E-mail<input type="email" name="email" autoComplete="username" required /></label>
    <label>Senha<input type="password" name="password" autoComplete="current-password" required /></label>
    <button className="adminButton primary full" type="submit">Entrar</button>
    <Link className="backLink" href="/">← Página inicial</Link>
  </form></main>;
}
