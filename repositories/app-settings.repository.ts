import { createClient } from "@/lib/supabase/server";

export async function getAppSetting(key: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .single<{ value: string }>();
  return data?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

export async function getAllAppSettings(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key, value");
  if (!data) return {};
  return Object.fromEntries(data.map(({ key, value }) => [key, value]));
}
