"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function priceValue(value: string) {
  const trimmed = value.replace(/\s/g, "");
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function saveCategory(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  const name = text(formData, "name");
  const sortOrder = Number.parseInt(text(formData, "sort_order") || "0", 10);
  const isActive = formData.get("is_active") === "on";
  if (!name || name.length > 80 || !Number.isFinite(sortOrder)) redirect("/admin/categories?error=invalid");
  const payload = { name, slug: slugify(name), sort_order: sortOrder, is_active: isActive };
  const result = id
    ? await supabase.from("categories").update(payload).eq("id", id)
    : await supabase.from("categories").insert(payload);
  if (result.error) redirect(`/admin/categories?error=${encodeURIComponent(result.error.code === "23505" ? "duplicate" : "save")}`);
  revalidatePath("/"); revalidatePath("/admin"); revalidatePath("/admin/categories"); revalidatePath("/admin/products");
  redirect("/admin/categories?saved=1");
}

export async function deleteCategory(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) redirect("/admin/categories?error=invalid");
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) redirect(`/admin/categories?error=${encodeURIComponent(error.code === "23503" ? "in-use" : "delete")}`);
  revalidatePath("/"); revalidatePath("/admin/categories");
  redirect("/admin/categories?saved=deleted");
}

export async function saveProduct(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  const name = text(formData, "name");
  const categoryId = text(formData, "category_id");
  const price = priceValue(text(formData, "price"));
  const sortOrder = Number.parseInt(text(formData, "sort_order") || "0", 10);
  const imagePath = text(formData, "image_path") || null;
  const videoPath = text(formData, "video_path") || null;
  const isAvailable = formData.get("is_available") === "on";
  if (!name || name.length > 120 || !categoryId || price === null || !Number.isFinite(sortOrder)) redirect("/admin/products?error=invalid");
  const payload = {
    name, category_id: categoryId, price,
    description: text(formData, "description").slice(0, 500),
    ingredients: text(formData, "ingredients").slice(0, 1000),
    details: text(formData, "details").slice(0, 2000),
    image_path: imagePath, video_path: videoPath, is_available: isAvailable, sort_order: sortOrder,
  };
  const result = id
    ? await supabase.from("products").update(payload).eq("id", id)
    : await supabase.from("products").insert(payload);
  if (result.error) redirect(`/admin/products?error=${encodeURIComponent("save")}`);
  revalidatePath("/"); revalidatePath("/admin"); revalidatePath("/admin/products");
  redirect("/admin/products?saved=1");
}

export async function toggleProductAvailability(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  const next = text(formData, "next") === "true";
  if (!id) redirect("/admin/products?error=invalid");
  const { error } = await supabase.from("products").update({ is_available: next }).eq("id", id);
  if (error) redirect("/admin/products?error=save");
  revalidatePath("/"); revalidatePath("/admin/products");
  redirect("/admin/products?saved=1");
}

export async function deleteProduct(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) redirect("/admin/products?error=invalid");
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) redirect("/admin/products?error=delete");
  revalidatePath("/"); revalidatePath("/admin/products");
  redirect("/admin/products?saved=deleted");
}
