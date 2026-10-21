import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutStaff } from "@/lib/actions/staff-auth";
import EnablePush from "@/components/calls/enable-push";
import StaffCallBoard from "@/components/calls/staff-call-board";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/garcom/login");
  const { data: staff } = await supabase.from("staff_users").select("display_name,is_active").eq("user_id", user.id).maybeSingle();
  if (!staff?.is_active) { await supabase.auth.signOut(); redirect("/garcom/login?error=unauthorized"); }
  return <main className="staffPage">
    <header className="staffHeader"><div><span className="eyebrow">O CLANDESTINO · ATENDIMENTO</span><h1>Olá, {staff.display_name}</h1><p className="muted">Chamados das mesas e atendimentos em andamento.</p></div><form action={signOutStaff}><button className="adminButton secondary" type="submit">Sair</button></form></header>
    <EnablePush />
    <StaffCallBoard user={user} />
  </main>;
}
