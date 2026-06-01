"use server";

import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function finishMyDay(
  eventId: string
): Promise<{ error?: string }> {
  // requireProfile validates the session — do NOT skip this
  const profile = await requireProfile();

  // Use admin client to bypass RLS — regular client update silently
  // returns success with 0 rows when no UPDATE policy exists for the column
  const admin = createAdminClient();

  const { error } = await admin
    .from("users")
    .update({
      day_finished_at: new Date().toISOString(),
      day_finished_event_id: eventId,
    })
    .eq("id", profile.id);

  if (error) return { error: "Não foi possível encerrar o dia. Tente novamente." };
  return {};
}
