"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveServiceLimits(
  eventId: string,
  limits: Record<string, number>
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({ service_limits: limits })
    .eq("id", eventId);

  if (error) return { error: error.message };
  revalidatePath("/admin/configuracoes");
  return {};
}
