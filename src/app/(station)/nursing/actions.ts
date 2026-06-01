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

// ─── waiting_nursing → nursing_in_progress ────────────────────────────────────

export async function startTriage(entryId: string): Promise<{ error?: string }> {
  return updateEntryStatus(entryId, "nursing_in_progress");
}

// ─── nursing_in_progress → dispensed | waiting_medico (with vitals) ───────────

export async function submitTriage(input: {
  entryId: string;
  chiefComplaint: string;
  vitals: {
    bp_systolic: number | null;
    bp_diastolic: number | null;
    weight: number | null;
    temperature: number | null;
  };
  action: "dispense" | "forward";
  specialty?: string;
}): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Não autenticado." };

  const admin = createAdminClient();

  // Save vitals if at least one measurement provided
  const hasVitals = Object.values(input.vitals).some((v) => v !== null);
  if (hasVitals) {
    const { error: vitErr } = await admin.from("health_vitals").insert({
      service_registration_id: input.entryId,
      recorded_by: userId,
      ...input.vitals,
    });
    if (vitErr) return { error: vitErr.message };
  }

  const newStatus = input.action === "dispense" ? "dispensed" : "waiting_medico";
  const extra: Record<string, unknown> = {
    nursing_completed_at: new Date().toISOString(),
    chief_complaint: input.chiefComplaint.trim() || null,
    assigned_to: null, // nurse is free once triage is done
    medical_specialty: input.action === "forward" ? (input.specialty ?? null) : null,
    // Reset start fields so doctor gets a clean "Iniciar atendimento" prompt
    started_at: null,
    started_by: null,
  };

  if (input.action === "dispense") {
    extra.completed_at = new Date().toISOString();
    extra.completed_by = userId;
  }

  const { error } = await admin
    .from("service_registrations")
    .update({ status: newStatus, ...extra })
    .eq("id", input.entryId);

  if (error) return { error: error.message };

  return {};
}
