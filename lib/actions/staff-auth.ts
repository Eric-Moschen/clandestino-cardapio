"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInStaff(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/garcom/login?error=missing");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/garcom/login?error=credentials");
  const { data: { user } } = await supabase.auth.getUser();
  const { data: staff } = user ? await supabase.from("staff_users").select("user_id,is_active").eq("user_id", user.id).maybeSingle() : { data: null };
  if (!staff || !staff.is_active) {
    await supabase.auth.signOut();
    redirect("/garcom/login?error=unauthorized");
  }
  redirect("/garcom");
}

export async function signOutStaff() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/garcom/login");
}
