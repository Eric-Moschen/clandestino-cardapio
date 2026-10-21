"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceClient } from "@/lib/supabase/service";

const value = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function saveTable(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = value(formData, "id");
  const number = Number(value(formData, "number"));
  const name = value(formData, "name") || null;
  const isActive = formData.get("is_active") === "on";
  if (!Number.isInteger(number) || number < 1 || number > 999) redirect("/admin/tables?error=invalid");
  const result = id
    ? await supabase.from("restaurant_tables").update({ number, name, is_active: isActive }).eq("id", id)
    : await supabase.from("restaurant_tables").insert({ number, name, is_active: isActive });
  if (result.error) redirect(`/admin/tables?error=${result.error.code === "23505" ? "duplicate" : "save"}`);
  revalidatePath("/"); revalidatePath("/mesa"); revalidatePath("/admin/tables");
  redirect("/admin/tables?saved=1");
}

export async function deleteTable(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = value(formData, "id");
  if (!id) redirect("/admin/tables?error=invalid");
  const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
  if (error) redirect(`/admin/tables?error=${error.code === "23503" ? "in-use" : "delete"}`);
  revalidatePath("/admin/tables"); revalidatePath("/");
  redirect("/admin/tables?saved=deleted");
}

export async function saveStaff(formData: FormData) {
  await requireAdmin();
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const displayName = value(formData, "display_name");
  const isActive = formData.get("is_active") === "on";
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 8 ||
    !displayName ||
    displayName.length > 100
  ) {
    redirect("/admin/staff?error=invalid");
  }
  let service;
  try { service = createServiceClient(); } catch { redirect("/admin/staff?error=config"); }
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { display_name: displayName, role: "waiter" }
  });
  if (createError || !created.user) {
    redirect(`/admin/staff?error=${createError?.message.toLowerCase().includes("already") ? "exists" : "create"}`);
  }
  const { error } = await service.from("staff_users").upsert(
    { user_id: created.user.id, display_name: displayName, is_active: isActive },
    { onConflict: "user_id" }
  );
  if (error) {
    await service.auth.admin.deleteUser(created.user.id);
    redirect("/admin/staff?error=save");
  }
  revalidatePath("/admin/staff"); revalidatePath("/admin/calls"); revalidatePath("/garcom");
  redirect("/admin/staff?saved=1");
}

export async function setStaffActive(formData: FormData) {
  const { supabase } = await requireAdmin();
  const userId = value(formData, "user_id");
  const active = value(formData, "next") === "true";
  const { error } = await supabase.from("staff_users").update({ is_active: active }).eq("user_id", userId);
  if (error) redirect("/admin/staff?error=save");
  revalidatePath("/admin/staff"); revalidatePath("/garcom");
  redirect("/admin/staff?saved=1");
}

export async function closeCall(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = value(formData, "id");
  if (!id) redirect("/admin/calls?error=invalid");
  const { error } = await supabase.from("waiter_calls").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id).in("status", ["pending", "accepted"]);
  if (error) redirect("/admin/calls?error=save");
  revalidatePath("/admin/calls"); revalidatePath("/garcom");
  redirect("/admin/calls?saved=1");
}
