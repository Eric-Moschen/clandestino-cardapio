import { requireAdmin } from "@/lib/supabase/admin";
import { saveStaff, setStaffActive } from "@/lib/actions/operations";

export const dynamic = "force-dynamic";

export default async function StaffManagementPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const { data } = await supabase.from("staff_users").select("user_id,display_name,is_active,created_at").order("display_name");
  const staff = (data ?? []) as unknown as { user_id: string; display_name: string; is_active: boolean; created_at: string }[];
  const errors: Record<string, string> = { invalid: "Informe um e-mail válido, senha com pelo menos 8 caracteres e nome.", exists: "Já existe uma conta com esse e-mail.", create: "Não foi possível criar a conta. Confira as configurações e tente novamente.", config: "Configure SUPABASE_SERVICE_ROLE_KEY no servidor para cadastrar garçons pelo painel.", user: "Não foi possível localizar o usuário.", save: "Não foi possível salvar o cadastro." };
  return <><div className="pageHeading"><div><p className="eyebrow">EQUIPE</p><h1>Garçons</h1><p className="muted">Gerencie quem pode acessar a tela de atendimento e receber chamados.</p></div></div>
    {params.error && <p className="notice error">{errors[params.error] ?? "Ocorreu um erro."}</p>}{params.saved && <p className="notice success">Cadastro atualizado.</p>}
    <section className="adminPanel"><div className="panelHeading"><div><h2>Cadastrar garçom</h2><p className="muted">O usuário e o acesso do garçom serão criados aqui. A senha inicial deve ter pelo menos 8 caracteres.</p></div></div>
      <form action={saveStaff} className="staffForm"><label>E-mail de acesso<input name="email" type="email" placeholder="garcom@exemplo.com" required /></label><label>Senha inicial<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label><label>Nome de exibição<input name="display_name" maxLength={100} placeholder="Ex.: João" required /></label><label className="checkField"><input type="checkbox" name="is_active" defaultChecked/> Ativo</label><button className="adminButton primary" type="submit">Cadastrar garçom</button></form>
    </section>
    <section className="adminPanel"><div className="panelHeading"><h2>Equipe cadastrada</h2><span className="countLabel">{staff.length} garçons</span></div>{!staff.length ? <div className="emptyState"><h3>Nenhum garçom cadastrado</h3><p>Cadastre os usuários para que possam aceitar os chamados das mesas.</p></div> : <div className="tableWrap"><table className="adminTable"><thead><tr><th>Nome</th><th>UUID de acesso</th><th>Status</th><th>Ação</th></tr></thead><tbody>{staff.map(s => <tr key={s.user_id}><td><strong>{s.display_name}</strong></td><td><code>{s.user_id}</code></td><td><span className={s.is_active ? "pill available" : "pill unavailable"}>{s.is_active ? "Ativo" : "Inativo"}</span></td><td><form action={setStaffActive}><input type="hidden" name="user_id" value={s.user_id}/><input type="hidden" name="next" value={String(!s.is_active)}/><button className="textButton" type="submit">{s.is_active ? "Desativar" : "Ativar"}</button></form></td></tr>)}</tbody></table></div>}</section>
  </>;
}
