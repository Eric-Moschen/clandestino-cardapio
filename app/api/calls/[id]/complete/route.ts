import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login como garçom." }, { status: 401 });
  const { data, error } = await supabase.rpc("complete_waiter_call", { p_call_id: id });
  if (error) return NextResponse.json({ error: error.message.includes("not assigned") ? "Somente o garçom responsável pode finalizar este atendimento." : "Não foi possível finalizar. Verifique se o chamado está em atendimento." }, { status: 409 });
  return NextResponse.json({ ok: true, data });
}
