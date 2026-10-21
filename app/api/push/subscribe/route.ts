import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login para ativar notificações." }, { status: 401 });
  const { data: staff } = await supabase.from("staff_users").select("user_id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  if (!staff) return NextResponse.json({ error: "Somente garçons cadastrados podem ativar notificações." }, { status: 403 });
  const subscription = await request.json() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return NextResponse.json({ error: "Inscrição de notificação inválida." }, { status: 400 });
  }
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    is_active: true,
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: "Não foi possível salvar a inscrição." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
