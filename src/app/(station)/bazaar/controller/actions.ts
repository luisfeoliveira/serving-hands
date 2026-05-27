"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function callBazaarEntry(
  entryId: string
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("service_registrations")
    .update({ status: "in_progress" })
    .eq("id", entryId)
    .eq("status", "waiting"); // guard: only advance if still waiting

  if (error) return { error: error.message };
  return {};
}
