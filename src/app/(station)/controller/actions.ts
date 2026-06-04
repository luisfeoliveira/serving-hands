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

export async function assignToProfessional(
  entryId: string,
  professionalId: string,
  targetStatus: string
): Promise<{ error?: string }> {
  return updateEntryStatus(entryId, targetStatus, {
    assigned_to: professionalId,
  });
}

export async function callEntry(entryId: string): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Não autenticado." };

  return updateEntryStatus(entryId, "in_progress", {
    started_at: new Date().toISOString(),
    started_by: userId,
  });
}

export async function completeEntry(
  entryId: string
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Não autenticado." };

  return updateEntryStatus(entryId, "completed", {
    completed_at: new Date().toISOString(),
    completed_by: userId,
  });
}

export async function searchEventPeople(
  eventId: string,
  query: string
): Promise<{ id: string; name: string; age: number }[]> {
  if (!query.trim()) return [];
  const admin = createAdminClient();

  const q = query.trim().toLowerCase();
  const isNumeric = /^\d+$/.test(q.replace(/\D/g, ""));

  let baseQuery = admin
    .from("people")
    .select("id, name, age")
    .eq("event_id", eventId);

  if (isNumeric) {
    baseQuery = baseQuery.ilike("cpf", `%${q.replace(/\D/g, "")}%`);
  } else {
    baseQuery = baseQuery.ilike("name", `%${q}%`);
  }

  const { data: people } = await baseQuery.limit(10);
  if (!people?.length) return [];

  // Exclude people already in active servico_social queue
  const { data: active } = await admin
    .from("service_registrations")
    .select("person_id")
    .eq("event_id", eventId)
    .eq("service_type", "servico_social")
    .not("status", "in", '("completed","abandoned","dispensed")');

  const activeIds = new Set((active ?? []).map((r) => r.person_id));
  return people.filter((p) => !activeIds.has(p.id));
}

export async function addPersonToSocialWorkQueue(
  personId: string,
  eventId: string
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  // Verify person belongs to this event
  const { data: person } = await admin
    .from("people")
    .select("id")
    .eq("id", personId)
    .eq("event_id", eventId)
    .single();
  if (!person) return { error: "Pessoa não encontrada neste evento." };

  // Next position
  const { data: last } = await admin
    .from("service_registrations")
    .select("position")
    .eq("event_id", eventId)
    .eq("service_type", "servico_social")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin.from("service_registrations").insert({
    event_id: eventId,
    person_id: personId,
    service_type: "servico_social",
    status: "waiting",
    priority: false,
    position: (last?.position ?? 0) + 1,
  });

  if (error) return { error: error.message };
  return {};
}
