import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import webpush from "web-push";

export async function POST() {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Push não configurado no servidor. Confira as variáveis VAPID e SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Entre na área do garçom antes de testar." }, { status: 401 });

    const { data: staff } = await supabase.from("staff_users")
      .select("user_id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
    if (!staff) return NextResponse.json({ error: "Somente garçons ativos podem testar notificações." }, { status: 403 });

    const service = createServiceClient();
    const { data: subscriptions, error } = await service.from("push_subscriptions")
      .select("id,endpoint,p256dh,auth").eq("user_id", user.id).eq("is_active", true);
    if (error) return NextResponse.json({ error: "Não foi possível consultar os aparelhos registrados." }, { status: 500 });
    if (!subscriptions?.length) return NextResponse.json({ error: "Nenhum aparelho registrado. Ative as notificações neste celular primeiro." }, { status: 404 });

    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contato@oclandestino.com.br", publicKey, privateKey);
    const results = await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, JSON.stringify({
          title: "O Clandestino — teste de notificação",
          body: "As notificações deste aparelho estão funcionando.",
          url: "/garcom",
          tag: `clandestino-test-${Date.now()}`,
        }), { TTL: 60 });
        return true;
      } catch (error) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error
          ? Number((error as { statusCode: unknown }).statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await service.from("push_subscriptions").update({ is_active: false }).eq("id", subscription.id);
        }
        console.error("Falha no push de teste:", error);
        return false;
      }
    }));

    if (!results.some(Boolean)) return NextResponse.json({ error: "O provedor não aceitou a notificação. Confira as chaves VAPID e a permissão deste navegador." }, { status: 502 });
    return NextResponse.json({ ok: true, sent: results.filter(Boolean).length });
  } catch (error) {
    console.error("POST /api/push/test:", error);
    return NextResponse.json({ error: "Erro interno ao testar a notificação." }, { status: 500 });
  }
}
