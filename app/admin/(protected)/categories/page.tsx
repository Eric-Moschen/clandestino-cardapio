import { requireAdmin } from "@/lib/supabase/admin";
import { deleteCategory, saveCategory } from "@/lib/actions/catalog";

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { supabase } = await requireAdmin();
  const [{ data: categories }, params] = await Promise.all([
    supabase.from("categories").select("id,name,slug,sort_order,is_active").order("sort_order").order("name"), searchParams,
  ]);
  const errorText: Record<string, string> = { invalid: "Confira o nome e a ordem informados.", duplicate: "Já existe uma categoria com esse nome ou slug.", "in-use": "Não é possível excluir uma categoria que possui produtos. Desative-a ou mova os produtos primeiro.", save: "Não foi possível salvar. Tente novamente.", delete: "Não foi possível excluir a categoria." };
  return <><div className="pageHeading"><div><p className="eyebrow">ORGANIZAÇÃO</p><h1>Categorias</h1><p className="muted">Organize o cardápio e controle quais categorias aparecem para os clientes.</p></div></div>
    {params.saved && <p className="notice success">{params.saved === "deleted" ? "Categoria excluída." : "Alterações salvas."}</p>}{params.error && <p className="notice error">{errorText[params.error] ?? "Ocorreu um erro."}</p>}
    <section className="adminPanel"><div className="panelHeading"><div><h2>Nova categoria</h2><p className="muted">A ordem menor aparece primeiro no cardápio.</p></div></div><form action={saveCategory} className="categoryForm"><label>Nome da categoria<input name="name" placeholder="Ex.: Hambúrgueres" maxLength={80} required /></label><label>Ordem<input type="number" name="sort_order" defaultValue="0" step="1" /></label><label className="checkField"><input type="checkbox" name="is_active" defaultChecked /> Ativa no cardápio</label><button className="adminButton primary" type="submit">Adicionar categoria</button></form></section>
    <section className="adminPanel"><div className="panelHeading"><div><h2>Categorias cadastradas</h2><p className="muted">Edite os dados diretamente na lista.</p></div><span className="countLabel">{categories?.length ?? 0} categorias</span></div>
      {!categories?.length ? <div className="emptyState"><h3>Nenhuma categoria cadastrada</h3><p>Crie sua primeira categoria no formulário acima.</p></div> : <div className="categoryList">{categories.map(category => <form key={category.id} action={saveCategory} className="categoryRow"><input type="hidden" name="id" value={category.id} /><label className="categoryName">Nome<input name="name" defaultValue={category.name} maxLength={80} required /></label><label className="orderField">Ordem<input type="number" name="sort_order" defaultValue={category.sort_order} step="1" /></label><label className="checkField"><input type="checkbox" name="is_active" defaultChecked={category.is_active} /> Ativa</label><button className="adminButton secondary" type="submit">Salvar</button><button className="textButton dangerText" formAction={deleteCategory} formNoValidate>Excluir</button></form>)}</div>}
    </section>
  </>;
}
