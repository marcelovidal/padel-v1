"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setAppSetting } from "@/repositories/app-settings.repository";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (profile?.role !== "admin") redirect("/login");
  return user;
}

export async function toggleBookingsEnabled(enabled: boolean) {
  await requireAdmin();
  await setAppSetting("bookings_enabled", enabled ? "true" : "false");
}
