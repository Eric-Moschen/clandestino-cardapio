import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login como garçom." }, { status: 401 });
  const { data, error } = await supabase.rpc("claim_waiter_call", { p_call_id: id });
  if (error) return NextResponse.json({ error: error.message.includes("already") ? "Este chamado já foi aceito por outro garçom." : "Não foi possível aceitar o chamado." }, { status: 409 });
  return NextResponse.json({ ok: true, data });
}
