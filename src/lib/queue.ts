"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServiceType, QueueEntry } from "@/lib/types";

const ACTIVE_STATUSES = [
  "waiting",
  "waiting_nursing",
  "nursing_in_progress",
  "waiting_medico",
  "in_progress",
] as const;

// ─── Fetch active queue for a service ────────────────────────────────────────

export async function getQueueEntries(
  eventId: string,
  serviceType: ServiceType
): Promise<QueueEntry[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("service_registrations")
    .select("*, person:people(*)")
    .eq("event_id", eventId)
    .eq("service_type", serviceType)
    .in("status", [...ACTIVE_STATUSES])
    .order("priority", { ascending: false })
    .order("position", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const { person, ...rest } = row as Record<string, unknown>;
    return {
      ...rest,
      person: Array.isArray(person) ? person[0] : person,
    } as QueueEntry;
  });
}

// ─── Abandon a queue entry ────────────────────────────────────────────────────

export async function abandonEntry(entryId: string): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("service_registrations")
    .update({ status: "abandoned" })
    .eq("id", entryId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

// ─── Update entry status (used by station-specific actions) ──────────────────

export async function updateEntryStatus(
  entryId: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("service_registrations")
    .update({ status, ...extra })
    .eq("id", entryId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}
