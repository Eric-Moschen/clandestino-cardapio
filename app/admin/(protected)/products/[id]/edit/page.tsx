import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import ProductForm from "@/components/admin/product-form";
import type { Category, Product } from "@/lib/types";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id,name,slug,sort_order").order("sort_order").order("name"),
  ]);
  if (!product) notFound();
  return <><div className="pageHeading"><div><p className="eyebrow">CATÁLOGO / EDIÇÃO</p><h1>Editar produto</h1><p className="muted">Atualize os dados e salve as alterações.</p></div></div><ProductForm product={product as Product} categories={(categories ?? []) as Category[]} /></>;
}
