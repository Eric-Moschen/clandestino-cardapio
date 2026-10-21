import { requireAdmin } from "@/lib/supabase/admin";
import { closeCall } from "@/lib/actions/operations";
import AutoRefresh from "@/components/admin/auto-refresh";

export const dynamic = "force-dynamic";

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const { data } = await supabase.from("waiter_calls").select("id,status,service_type,details,created_at,accepted_at,completed_at,table:restaurant_tables(number,name),staff:staff_users(display_name)").order("created_at", { ascending: false }).limit(200);
  type Call = { id: string; status: "pending" | "accepted" | "completed"; service_type: string; details: string | null; created_at: string; accepted_at: string | null; completed_at: string | null; table: { number: number; name: string | null } | { number: number; name: string | null }[] | null; staff: { display_name: string } | { display_name: string }[] | null };
  const calls = (data ?? []) as unknown as Call[];
  function first<T>(v: T | T[] | null): T | null { return Array.isArray(v) ? v[0] ?? null : v; }
  const pending = calls.filter(c => c.status === "pending").length ?? 0;
  const accepted = calls.filter(c => c.status === "accepted").length ?? 0;
  return <><div className="pageHeading"><div><p className="eyebrow">CENTRAL DE ATENDIMENTO</p><h1>Chamados das mesas</h1><p className="muted">Histórico, status e responsável por cada atendimento.</p><AutoRefresh /></div></div>
    {params.error && <p className="notice error">Não foi possível atualizar o chamado.</p>}{params.saved && <p className="notice success">Atendimento encerrado.</p>}
    <section className="statsGrid"><article className="statCard"><span>Pendentes</span><strong>{pending}</strong><small>Aguardando um garçom</small></article><article className="statCard"><span>Em atendimento</span><strong>{accepted}</strong><small>Já assumidos pela equipe</small></article><article className="statCard"><span>Total no histórico</span><strong>{calls.length}</strong><small>Últimos 200 chamados</small></article></section>
    <section className="adminPanel"><div className="panelHeading"><h2>Histórico de chamados</h2><span className="countLabel">Mais recentes primeiro</span></div>{!calls.length ? <div className="emptyState"><h3>Nenhum chamado registrado</h3><p>Os chamados feitos pelos clientes aparecerão aqui.</p></div> : <div className="tableWrap"><table className="adminTable"><thead><tr><th>Mesa</th><th>Aberto em</th><th>Solicitação</th><th>Status</th><th>Garçom</th><th>Ação</th></tr></thead><tbody>{calls.map(call => { const table = first(call.table as {number:number;name:string|null}|{number:number;name:string|null}[]|null); const staff = first(call.staff as {display_name:string}|{display_name:string}[]|null); return <tr key={call.id}><td><strong>Mesa {table?.number ?? "—"}</strong>{table?.name && <small className="fieldHint">{table.name}</small>}</td><td>{new Date(call.created_at).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" })}</td><td>{serviceLabel(call.service_type)}{call.details && <small className="fieldHint">{call.details}</small>}</td><td><span className={`pill ${call.status === "completed" ? "available" : call.status === "pending" ? "unavailable" : "available"}`}>{call.status === "pending" ? "Pendente" : call.status === "accepted" ? "Em atendimento" : "Concluído"}</span></td><td>{staff?.display_name ?? "—"}{call.accepted_at && <small className="fieldHint">Aceito {new Date(call.accepted_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</small>}</td><td>{call.status !== "completed" ? <form action={closeCall}><input type="hidden" name="id" value={call.id}/><button className="textButton" type="submit">Encerrar</button></form> : call.completed_at ? <small>{new Date(call.completed_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</small> : "—"}</td></tr>; })}</tbody></table></div>}</section>
  </>;
}

function serviceLabel(value: string) {
  const labels: Record<string, string> = { duvida: "Tirar uma dúvida", pedido: "Fazer pedido", conta: "Solicitar a conta", garcom: "Chamar o garçom", talheres: "Talheres/limpeza", outro: "Outro atendimento" };
  return labels[value] ?? "Chamar o garçom";
}
