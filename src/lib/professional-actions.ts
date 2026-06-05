"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppointmentData, HistoryEntry, UserRole } from "@/lib/types";

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

// ─── Completed attendance history ─────────────────────────────────────────────

export async function getCompletedHistory(input: {
  eventId: string;
  professionalId: string;
  role: UserRole;
}): Promise<HistoryEntry[]> {
  const admin = createAdminClient();

  if (input.role === "enfermagem") {
    // Nursing: find all entries where nurse recorded vitals in this event
    const { data: vitalsData } = await admin
      .from("health_vitals")
      .select("bp_systolic, bp_diastolic, blood_glucose, weight, temperature, service_registration_id, recorded_at")
      .eq("recorded_by", input.professionalId)
      .order("recorded_at", { ascending: false })
      .limit(50);

    if (!vitalsData?.length) return [];

    const regIds = vitalsData.map((v) => v.service_registration_id);
    const { data: regsData } = await admin
      .from("service_registrations")
      .select("id, nursing_completed_at, service_type, chief_complaint, person:people(name, age, cpf)")
      .in("id", regIds)
      .eq("event_id", input.eventId);

    if (!regsData) return [];

    const results: HistoryEntry[] = [];
    for (const reg of regsData) {
      const v = vitalsData.find((x) => x.service_registration_id === reg.id);
      const personRaw = reg.person as unknown;
      const person = Array.isArray(personRaw) ? (personRaw[0] as { name: string; age: number; cpf: string } | undefined) : (personRaw as { name: string; age: number; cpf: string } | null);
      if (!person) continue;
      results.push({
        registrationId: reg.id,
        person: { name: person.name, age: person.age, cpf: person.cpf },
        completedAt: reg.nursing_completed_at ?? v?.recorded_at ?? null,
        serviceType: reg.service_type as import("@/lib/types").ServiceType,
        chiefComplaint: reg.chief_complaint,
        vitals: v ? {
          bp_systolic: v.bp_systolic,
          bp_diastolic: v.bp_diastolic,
          blood_glucose: v.blood_glucose,
          weight: v.weight,
          temperature: v.temperature,
        } : null,
      });
    }
    return results;
  }

  // Clinical professionals: query by completed_by
  const { data } = await admin
    .from("service_registrations")
    .select("id, completed_at, service_type, chief_complaint, person:people(name, age, cpf), appointments(data), health_vitals(bp_systolic, bp_diastolic, blood_glucose, weight, temperature)")
    .eq("event_id", input.eventId)
    .eq("completed_by", input.professionalId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(50);

  if (!data) return [];

  const results: HistoryEntry[] = [];
  for (const reg of data) {
    const personRaw = reg.person as unknown;
    const person = Array.isArray(personRaw) ? (personRaw[0] as { name: string; age: number; cpf: string } | undefined) : (personRaw as { name: string; age: number; cpf: string } | null);
    if (!person) continue;
    const appts = reg.appointments as Array<{ data: AppointmentData }> | null;
    const vitalsArr = reg.health_vitals as Array<{ bp_systolic: number | null; bp_diastolic: number | null; blood_glucose: number | null; weight: number | null; temperature: number | null }> | null;
    results.push({
      registrationId: reg.id,
      person: { name: person.name, age: person.age, cpf: person.cpf },
      completedAt: reg.completed_at,
      serviceType: reg.service_type as import("@/lib/types").ServiceType,
      chiefComplaint: reg.chief_complaint,
      appointmentData: appts?.[0]?.data ?? null,
      vitals: vitalsArr?.[0] ?? null,
    });
  }
  return results;
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
