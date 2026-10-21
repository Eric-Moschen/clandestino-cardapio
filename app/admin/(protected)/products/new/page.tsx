import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import ProductForm from "@/components/admin/product-form";
import type { Category } from "@/lib/types";

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("categories").select("id,name,slug,sort_order").order("sort_order").order("name");
  const categories = (data ?? []) as Category[];
  return <><div className="pageHeading"><div><p className="eyebrow">CATÁLOGO / NOVO</p><h1>Cadastrar produto</h1><p className="muted">Preencha os dados para adicionar um item ao cardápio.</p></div></div>
    {categories.length === 0 && <p className="notice error">Nenhuma categoria cadastrada. <Link href="/admin/categories">Cadastre uma categoria primeiro.</Link></p>}
    <ProductForm categories={categories} />
  </>;
}
