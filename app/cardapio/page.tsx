import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import Menu from "@/components/menu";

export const dynamic = "force-dynamic";

export default async function Home() {
  let products: Product[] = [];
  let configured = true;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, category_id, name, description, ingredients, details, price, image_path, video_path, is_available, sort_order, categories(name, slug)")
      .eq("is_available", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    products = (data ?? []) as unknown as Product[];
  } catch {
    configured = false;
  }

  return <Menu products={products} configured={configured} />;
}
