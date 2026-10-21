import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const body = await request.json() as { endpoint?: string };
  if (!body.endpoint) return NextResponse.json({ error: "Endpoint inválido." }, { status: 400 });
  const { error } = await supabase.from("push_subscriptions").update({ is_active: false }).eq("user_id", user.id).eq("endpoint", body.endpoint);
  if (error) return NextResponse.json({ error: "Não foi possível desativar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
