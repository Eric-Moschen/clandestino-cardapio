import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();
  const [{ count: totalProducts }, { count: availableProducts }, { count: totalCategories }, { data: recent }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_available", true),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id,name,price,is_available,updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);
  return <><div className="pageHeading"><div><p className="eyebrow">PAINEL DE CONTROLE</p><h1>Visão geral</h1><p className="muted">Gerencie os itens e a disponibilidade do cardápio digital.</p></div><Link className="adminButton primary" href="/admin/products/new">＋ Novo produto</Link></div>
    <section className="statsGrid"><article className="statCard"><span>Produtos cadastrados</span><strong>{totalProducts ?? 0}</strong><small>Todos os itens do catálogo</small></article><article className="statCard"><span>Disponíveis</span><strong>{availableProducts ?? 0}</strong><small>Visíveis para os clientes</small></article><article className="statCard"><span>Categorias</span><strong>{totalCategories ?? 0}</strong><small>Organização do cardápio</small></article></section>
    <section className="adminPanel"><div className="panelHeading"><div><h2>Produtos atualizados recentemente</h2><p className="muted">Confira os últimos itens modificados.</p></div><Link href="/admin/products">Ver todos →</Link></div>
    {!recent?.length ? <div className="emptyState"><h3>Seu catálogo está vazio</h3><p>Cadastre categorias e depois adicione os primeiros produtos.</p><Link className="adminButton primary" href="/admin/categories">Configurar categorias</Link></div> : <div className="tableWrap"><table className="adminTable"><thead><tr><th>Produto</th><th>Preço</th><th>Status</th><th></th></tr></thead><tbody>{recent.map(p => <tr key={p.id}><td><strong>{p.name}</strong></td><td>{Number(p.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td><span className={p.is_available ? "pill available" : "pill unavailable"}>{p.is_available ? "Disponível" : "Indisponível"}</span></td><td><Link href={`/admin/products/${p.id}/edit`}>Editar</Link></td></tr>)}</tbody></table></div>}</section>
    <section className="quickActions"><Link href="/admin/tables"><strong>▦ Gerenciar mesas</strong><span>Cadastre as mesas e controle quais estão ativas.</span></Link><Link href="/admin/staff"><strong>♧ Gerenciar garçons</strong><span>Cadastre a equipe e controle os acessos.</span></Link><Link href="/admin/calls"><strong>♧ Central de chamados</strong><span>Consulte os atendimentos, responsáveis e histórico.</span></Link><Link href="/admin/products/new"><strong>＋ Cadastrar produto</strong><span>Nome, preço, descrição, foto e disponibilidade.</span></Link><Link href="/admin/categories"><strong>▦ Organizar categorias</strong><span>Crie, edite, ordene e desative categorias.</span></Link></section>
  </>;
}
