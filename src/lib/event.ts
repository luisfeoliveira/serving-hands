"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { DbEvent } from "@/lib/types";

export async function getActiveEvent(): Promise<DbEvent | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("events")
    .select("*")
    .eq("active", true)
    .single();
  return data ?? null;
}
