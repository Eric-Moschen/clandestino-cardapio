"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ClaimCallButton from "@/components/calls/claim-call-button";
import CompleteCallButton from "@/components/calls/complete-call-button";
import type { User } from "@supabase/supabase-js";

type CallRow = {
  id: string; status: "pending" | "accepted" | "completed"; accepted_by: string | null; service_type: string; details: string | null;
  created_at: string; accepted_at: string | null; completed_at: string | null;
  table: { number: number; name: string | null } | { number: number; name: string | null }[] | null;
  staff: { display_name: string } | { display_name: string }[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function StaffCallBoard({ user }: { user: User }) {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    setRefreshing(true);
    const { data, error: loadError } = await supabase
      .from("waiter_calls")
      .select("id,status,accepted_by,service_type,details,created_at,accepted_at,completed_at,table:restaurant_tables(number,name),staff:staff_users(display_name)")
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false });
    if (loadError) setError("Não foi possível atualizar os chamados. Verifique o SQL e as permissões.");
    else { setCalls((data ?? []) as unknown as CallRow[]); setError(""); }
    setRefreshing(false);
  }, [supabase]);

  useEffect(() => {
    void load();
    const channel = supabase.channel(`waiter-calls-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "waiter_calls" }, () => { void load(); })
      .subscribe();
    const interval = window.setInterval(() => { void load(); }, 8000);
    return () => { window.clearInterval(interval); void supabase.removeChannel(channel); };
  }, [load, supabase, user.id]);

  return <section className="adminPanel">
    <div className="panelHeading"><div><h2>Chamados em andamento</h2><p className="muted">Atualização em tempo real, com atualização automática de segurança.</p></div><button className="textButton" onClick={() => void load()} disabled={refreshing}>{refreshing ? "Atualizando…" : "Atualizar"}</button></div>
    {error && <p className="notice error">{error}</p>}
    {!calls.length && !error ? <div className="emptyState"><h3>Nenhum chamado em aberto</h3><p>Quando uma mesa chamar, aparecerá aqui.</p></div> : <div className="callList">
      {calls.map((call) => {
        const table = first(call.table);
        const staff = first(call.staff);
        const acceptedByMe = call.status === "accepted" && staff?.display_name;
        return <article className={`callCard ${call.status}`} key={call.id}>
          <div><span className="eyebrow">{call.status === "pending" ? "NOVO CHAMADO" : "EM ATENDIMENTO"}</span><h3>Mesa {table?.number ?? "—"}{table?.name ? ` · ${table.name}` : ""}</h3><p className="serviceCallType">{serviceLabel(call.service_type)}</p>{call.details && <p>{call.details}</p>}<p className="muted">Chamado às {new Date(call.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
          {call.status === "accepted" && <p className="assignedLabel">Atendido por: <strong>{staff?.display_name ?? "Garçom cadastrado"}</strong>{acceptedByMe ? " (você)" : ""}</p>}</div>
          {call.status === "pending" ? <ClaimCallButton callId={call.id} onClaimed={() => void load()} /> : <div className="callActions"><span className="pill available">Mesa assumida</span>{call.accepted_by === user.id ? <CompleteCallButton callId={call.id} onCompleted={() => void load()} /> : <span className="muted">Finalize com o garçom responsável.</span>}</div>}
        </article>;
      })}
    </div>}
  </section>;
}

function serviceLabel(value: string) {
  const labels: Record<string, string> = { duvida: "Tirar uma dúvida", pedido: "Fazer pedido", conta: "Solicitar a conta", garcom: "Chamar o garçom", talheres: "Talheres, guardanapo ou limpeza", outro: "Outro atendimento" };
  return labels[value] ?? "Chamar o garçom";
}
