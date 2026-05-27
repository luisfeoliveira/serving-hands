"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateEntryStatus } from "@/lib/queue";

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ─── waiting_medico → in_progress ────────────────────────────────────────────

export async function callPatient(entryId: string): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Não autenticado." };

  return updateEntryStatus(entryId, "in_progress", {
    started_at: new Date().toISOString(),
    started_by: userId,
  });
}

// ─── in_progress → completed (with appointment notes) ────────────────────────

export async function completeAppointment(input: {
  entryId: string;
  notes: string;
  referral: "resolved" | "sus" | "other";
  referral_notes?: string;
}): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Não autenticado." };

  const admin = createAdminClient();

  const { error: apptErr } = await admin.from("appointments").insert({
    service_registration_id: input.entryId,
    data: {
      observacao: input.notes,
      referral: input.referral,
      ...(input.referral === "other" && { referral_notes: input.referral_notes ?? "" }),
    },
    created_by: userId,
  });
  if (apptErr) return { error: apptErr.message };

  const { error } = await admin
    .from("service_registrations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: userId,
    })
    .eq("id", input.entryId);

  if (error) return { error: error.message };

  return {};
}
