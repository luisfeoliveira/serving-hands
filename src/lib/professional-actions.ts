"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppointmentData } from "@/lib/types";

export async function startAttendance(
  entryId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("service_registrations")
    .update({ started_at: new Date().toISOString(), started_by: user.id })
    .eq("id", entryId);

  if (error) return { error: error.message };
  return {};
}

export async function completeAppointment(input: {
  entryId: string;
  data: AppointmentData;
  cestaBasica?: boolean;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const admin = createAdminClient();

  const { error: apptErr } = await admin.from("appointments").insert({
    service_registration_id: input.entryId,
    data: input.data,
    created_by: user.id,
  });
  if (apptErr) return { error: apptErr.message };

  const { error: srErr } = await admin
    .from("service_registrations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: user.id,
      assigned_to: null,
      ...(input.cestaBasica != null && { cesta_basica: input.cestaBasica }),
    })
    .eq("id", input.entryId);

  if (srErr) return { error: srErr.message };

  return {};
}

export async function forwardToSocialService(
  entryId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const admin = createAdminClient();

  // Fetch original entry for context
  const { data: entry, error: entryErr } = await admin
    .from("service_registrations")
    .select("event_id, person_id, priority")
    .eq("id", entryId)
    .single();
  if (entryErr || !entry) return { error: "Atendimento não encontrado." };

  // Check no active servico_social registration already exists for this person
  const { data: existing } = await admin
    .from("service_registrations")
    .select("id")
    .eq("event_id", entry.event_id)
    .eq("person_id", entry.person_id)
    .eq("service_type", "servico_social")
    .not("status", "in", '("completed","abandoned","dispensed")')
    .maybeSingle();
  if (existing) return { error: "Pessoa já está na fila do Serviço Social." };

  // Next position in servico_social queue
  const { data: last } = await admin
    .from("service_registrations")
    .select("position")
    .eq("event_id", entry.event_id)
    .eq("service_type", "servico_social")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: insertErr } = await admin.from("service_registrations").insert({
    event_id: entry.event_id,
    person_id: entry.person_id,
    service_type: "servico_social",
    status: "waiting",
    forwarded_from: "psicologia",
    priority: entry.priority,
    position: (last?.position ?? 0) + 1,
  });

  if (insertErr) return { error: insertErr.message };
  return {};
}

export async function claimForwardedEntry(
  entryId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("service_registrations")
    .update({
      status: "in_progress",
      assigned_to: user.id,
      started_at: new Date().toISOString(),
      started_by: user.id,
    })
    .eq("id", entryId)
    .eq("status", "waiting"); // guard: only claim if still waiting

  if (error) return { error: error.message };
  return {};
}
