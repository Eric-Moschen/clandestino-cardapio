import { headers } from "next/headers";
import TableLink from "@/components/admin/table-link";
import { requireAdmin } from "@/lib/supabase/admin";
import { saveTable, deleteTable } from "@/lib/actions/operations";

export const dynamic = "force-dynamic";

export default async function TablesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { supabase } = await requireAdmin();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? `${protocol}://${host}`;
  const params = await searchParams;
  const { data } = await supabase.from("restaurant_tables").select("id,number,name,is_active,created_at").order("number");
  const tables = (data ?? []) as unknown as { id: string; number: number; name: string | null; is_active: boolean; created_at: string }[];
  const errors: Record<string, string> = { invalid: "Informe um número de mesa válido.", duplicate: "Esse número de mesa já está cadastrado.", save: "Não foi possível salvar a mesa.", "in-use": "A mesa possui histórico de chamados e não pode ser excluída.", delete: "Não foi possível excluir a mesa." };
  return <><div className="pageHeading"><div><p className="eyebrow">OPERAÇÃO</p><h1>Mesas</h1><p className="muted">Cadastre as mesas disponíveis para identificação no celular dos clientes.</p></div></div>
    {params.error && <p className="notice error">{errors[params.error] ?? "Ocorreu um erro."}</p>}{params.saved && <p className="notice success">Alteração salva.</p>}
    <section className="adminPanel"><div className="panelHeading"><h2>Cadastrar mesa</h2></div><form action={saveTable} className="inlineForm"><label>Número<input type="number" name="number" min="1" max="999" required /></label><label>Identificação opcional<input name="name" maxLength={80} placeholder="Ex.: Varanda" /></label><label className="checkField"><input type="checkbox" name="is_active" defaultChecked /> Ativa</label><button className="adminButton primary">Salvar mesa</button></form></section>
    <section className="adminPanel"><div className="panelHeading"><h2>Mesas cadastradas</h2><span className="countLabel">{tables.length} mesas</span></div>{!tables.length ? <div className="emptyState"><h3>Nenhuma mesa cadastrada</h3><p>Cadastre as mesas para gerar o link exclusivo que deve ser impresso no QR Code ou gravado na etiqueta NFC.</p></div> : <div className="tableWrap"><table className="adminTable"><thead><tr><th>Mesa</th><th>Identificação</th><th>Link QR Code / NFC</th><th>Status</th><th>Ações</th></tr></thead><tbody>{tables.map(t => <tr key={t.id}><td><strong>Mesa {t.number}</strong></td><td>{t.name ?? "—"}</td><td><TableLink url={`${origin}/mesa?mesa=${t.number}`} /></td><td><span className={t.is_active ? "pill available" : "pill unavailable"}>{t.is_active ? "Ativa" : "Inativa"}</span></td><td><form action={saveTable} className="rowActions"><input type="hidden" name="id" value={t.id}/><input type="hidden" name="number" value={t.number}/><input type="hidden" name="name" value={t.name ?? ""}/><input type="hidden" name="is_active" value={t.is_active ? "" : "on"}/><button className="textButton" type="submit">{t.is_active ? "Desativar" : "Ativar"}</button></form><form action={deleteTable}><input type="hidden" name="id" value={t.id}/><button className="textButton dangerText" type="submit">Excluir</button></form></td></tr>)}</tbody></table></div>}</section>
  </>;
}
