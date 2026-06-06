"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface EvangelismRecord {
  id: string;
  event_id: string;
  person_id: string | null;
  person_name: string;
  prayer: boolean;
  conversion: boolean;
  reconciliation: boolean;
  recorded_by: string | null;
  created_at: string;
}

export async function searchEventPeople(
  eventId: string,
  query: string
): Promise<{ id: string; name: string; doc_type: string; doc_number: string }[]> {
  if (!query.trim()) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("people")
    .select("id, name, doc_type, doc_number")
    .eq("event_id", eventId)
    .ilike("name", `%${query}%`)
    .limit(10);
  return data ?? [];
}

export async function getPersonRecord(
  eventId: string,
  personId: string
): Promise<EvangelismRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("evangelism_records")
    .select("*")
    .eq("event_id", eventId)
    .eq("person_id", personId)
    .maybeSingle();
  return data ?? null;
}

export async function saveRecord(input: {
  eventId: string;
  personId?: string;
  personName: string;
  prayer: boolean;
  conversion: boolean;
  reconciliation: boolean;
}): Promise<{ error?: string }> {
  const profile = await requireProfile();

  const row = {
    event_id: input.eventId,
    person_id: input.personId ?? null,
    person_name: input.personName.trim(),
    prayer: input.prayer,
    conversion: input.conversion,
    reconciliation: input.reconciliation,
    recorded_by: profile.id,
  };

  const admin = createAdminClient();

  if (input.personId) {
    const { data: existing } = await admin
      .from("evangelism_records")
      .select("id")
      .eq("event_id", input.eventId)
      .eq("person_id", input.personId)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("evangelism_records")
        .update({ prayer: input.prayer, conversion: input.conversion, reconciliation: input.reconciliation })
        .eq("id", existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await admin.from("evangelism_records").insert(row);
      if (error) return { error: error.message };
    }
  } else {
    const { error } = await admin.from("evangelism_records").insert(row);
    if (error) return { error: error.message };
  }

  revalidatePath("/evangelism");
  return {};
}

export async function listRecords(eventId: string): Promise<EvangelismRecord[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("evangelism_records")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  return (data ?? []) as EvangelismRecord[];
}

export async function deleteRecord(id: string): Promise<{ error?: string }> {
  await requireProfile();
  const admin = createAdminClient();
  const { error } = await admin.from("evangelism_records").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/evangelism");
  return {};
}
