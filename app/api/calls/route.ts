import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import webpush from "web-push";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { tableId?: string; serviceType?: string; details?: string };
    if (!body.tableId || typeof body.tableId !== "string") {
      return NextResponse.json({ error: "Mesa inválida." }, { status: 400 });
    }

    const allowedTypes = ["duvida", "pedido", "conta", "garcom", "talheres", "outro"];
    const serviceType = body.serviceType && allowedTypes.includes(body.serviceType) ? body.serviceType : "garcom";
    const details = typeof body.details === "string" ? body.details.trim().slice(0, 250) : "";
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("request_waiter", { p_table_id: body.tableId, p_service_type: serviceType, p_details: details });
    if (error) {
      console.error("request_waiter:", error.message);
      return NextResponse.json({ error: "Não foi possível registrar o chamado. Verifique a configuração do sistema." }, { status: 500 });
    }

    const result = (Array.isArray(data) ? data[0] : data) as { call_id?: string; table_number?: number; already_open?: boolean } | null;
    if (!result?.call_id) {
      return NextResponse.json({ error: "Não foi possível registrar o chamado." }, { status: 500 });
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const pushConfigured = Boolean(publicKey && privateKey && process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (pushConfigured) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:contato@oclandestino.com.br",
        publicKey!,
        privateKey!
      );
      const service = createServiceClient();
      const { data: activeStaff } = await service
        .from("staff_users").select("user_id").eq("is_active", true);
      const activeIds = (activeStaff ?? []).map((staff) => staff.user_id);
      const { data: subscriptions } = activeIds.length
        ? await service.from("push_subscriptions")
            .select("id,user_id,endpoint,p256dh,auth")
            .eq("is_active", true).in("user_id", activeIds)
        : { data: [] };

      await Promise.all((subscriptions ?? []).map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({
              title: "Chamado de mesa",
              body: `Mesa ${result.table_number}: ${serviceTypeLabel(serviceType)}.`,
              url: "/garcom",
              callId: result.call_id,
              tag: `clandestino-call-${result.call_id}`,
            }),
            { TTL: 60 }
          );
        } catch (err: unknown) {
          const statusCode = typeof err === "object" && err !== null && "statusCode" in err
            ? Number((err as { statusCode: unknown }).statusCode) : 0;
          if (statusCode === 404 || statusCode === 410) {
            await service.from("push_subscriptions").update({ is_active: false }).eq("id", sub.id);
          } else {
            console.error("Falha ao enviar push:", err);
          }
        }
      }));
    }

    return NextResponse.json({
      callId: result.call_id,
      alreadyOpen: Boolean(result.already_open),
      pushConfigured,
    });
  } catch (error) {
    console.error("POST /api/calls:", error);
    return NextResponse.json({ error: "Erro interno ao enviar chamado." }, { status: 500 });
  }
}

function serviceTypeLabel(value: string) {
  const labels: Record<string, string> = { duvida: "tirar uma dúvida", pedido: "fazer pedido", conta: "solicitou a conta", garcom: "chamou o garçom", talheres: "solicitou talheres/limpeza", outro: "outro atendimento" };
  return labels[value] ?? "chamou um garçom";
}
