"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ASSIGNMENT_CONFIG } from "@/lib/service-config";
import type {
  ServiceType,
  QueueEntry,
  DbHealthVitals,
  ProfessionalStatus,
  UserRole,
} from "@/lib/types";

// ─── Shared row mapper ────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): QueueEntry {
  const { person, ...rest } = row;
  return {
    ...rest,
    person: Array.isArray(person) ? person[0] : person,
  } as QueueEntry;
}

const ACTIVE_STATUSES = [
  "waiting",
  "waiting_nursing",
  "nursing_in_progress",
  "waiting_medico",
  "in_progress",
] as const;

// ─── Generic active queue for a service ──────────────────────────────────────

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
  return data.map(mapRow);
}

// ─── Completed/abandoned entries (history) ────────────────────────────────────

export async function getCompletedEntries(
  eventId: string,
  serviceType: ServiceType,
  extraStatuses: string[] = []
): Promise<QueueEntry[]> {
  const admin = createAdminClient();
  const statuses = ["completed", "dispensed", "abandoned", ...extraStatuses];
  const { data, error } = await admin
    .from("service_registrations")
    .select("*, person:people(*)")
    .eq("event_id", eventId)
    .eq("service_type", serviceType)
    .in("status", statuses)
    .order("completed_at", { ascending: false })
    .order("nursing_completed_at", { ascending: false })
    .order("position", { ascending: false });

  if (error || !data) return [];
  return data.map(mapRow);
}

// ─── Controller: waiting entries for a service ────────────────────────────────

export async function getControllerEntries(
  eventId: string,
  serviceType: ServiceType,
  waitingStatusOverride?: string,
  medicalSpecialty?: string | null
): Promise<QueueEntry[]> {
  const config = ASSIGNMENT_CONFIG[serviceType];
  const waitingStatus = waitingStatusOverride ?? config?.waitingStatus ?? "waiting";

  const admin = createAdminClient();
  let query = admin
    .from("service_registrations")
    .select("*, person:people(*)")
    .eq("event_id", eventId)
    .eq("service_type", serviceType)
    .eq("status", waitingStatus);

  if (medicalSpecialty) {
    query = query.eq("medical_specialty", medicalSpecialty);
  }

  const { data, error } = await query
    .order("priority", { ascending: false })
    .order("position", { ascending: true });

  if (error || !data) return [];
  const entries = data.map(mapRow);

  // Batch-fetch other active services for these persons
  const personIds = entries.map((e) => e.person_id);
  if (!personIds.length) return entries;

  // Only statuses that mean they're actively being attended (not just waiting in queue)
  const { data: others } = await admin
    .from("service_registrations")
    .select("person_id, service_type")
    .eq("event_id", eventId)
    .in("person_id", personIds)
    .in("status", ["nursing_in_progress", "waiting_medico", "in_progress"])
    .neq("service_type", serviceType);

  const otherMap: Record<string, ServiceType[]> = {};
  for (const row of others ?? []) {
    if (!otherMap[row.person_id]) otherMap[row.person_id] = [];
    otherMap[row.person_id].push(row.service_type as ServiceType);
  }

  return entries.map((e) => ({
    ...e,
    active_services: otherMap[e.person_id] ?? [],
  }));
}

// ─── Professional roster with busy status ─────────────────────────────────────

export async function getProfessionalStatuses(
  eventId: string,
  role: UserRole,
  busyStatus: string,
  specialtyFilter?: string
): Promise<ProfessionalStatus[]> {
  const admin = createAdminClient();

  let profQuery = admin
    .from("users")
    .select("id, name, role, medical_specialty")
    .eq("role", role)
    .eq("active", true);

  if (specialtyFilter) {
    profQuery = profQuery.eq("medical_specialty", specialtyFilter);
  }

  const { data: professionals } = await profQuery.order("name");

  if (!professionals?.length) return [];

  // Find who is currently busy (assigned + in busyStatus)
  const { data: busy } = await admin
    .from("service_registrations")
    .select("assigned_to, person:people(name)")
    .eq("event_id", eventId)
    .eq("status", busyStatus)
    .not("assigned_to", "is", null);

  const busyMap: Record<string, string> = {};
  for (const b of busy ?? []) {
    const row = b as Record<string, unknown>;
    const assignedTo = row.assigned_to as string;
    const person = row.person;
    const resolved = (Array.isArray(person) ? person[0] : person) as
      | { name?: string }
      | undefined;
    if (assignedTo) busyMap[assignedTo] = resolved?.name ?? "?";
  }

  return professionals.map((p) => ({
    id: p.id,
    name: p.name,
    role: (p as Record<string, unknown>).role as UserRole,
    busy: !!busyMap[p.id],
    patientName: busyMap[p.id],
    specialty: (p as Record<string, unknown>).medical_specialty as string | null ?? null,
  }));
}

// ─── Professional's own assigned entries ──────────────────────────────────────

export async function getProfessionalEntries(
  eventId: string,
  serviceType: ServiceType,
  professionalId: string | null, // null = admin acting as professional (show all)
  statusOverride?: string
): Promise<QueueEntry[]> {
  const config = ASSIGNMENT_CONFIG[serviceType];
  const busyStatus = statusOverride ?? config?.busyStatus ?? "in_progress";

  const admin = createAdminClient();
  let query = admin
    .from("service_registrations")
    .select("*, person:people(*)")
    .eq("event_id", eventId)
    .eq("service_type", serviceType)
    .eq("status", busyStatus);

  if (professionalId) query = query.eq("assigned_to", professionalId);

  const { data, error } = await query
    .order("priority", { ascending: false })
    .order("position", { ascending: true });

  if (error || !data) return [];
  const entries = data.map(mapRow);

  // For medicina: attach nursing vitals so doctor can see triage measurements
  if (serviceType === "medicina" && entries.length > 0) {
    const ids = entries.map((e) => e.id);
    const { data: vitalsData } = await admin
      .from("health_vitals")
      .select("*")
      .in("service_registration_id", ids)
      .order("recorded_at", { ascending: false });

    const vitalsMap: Record<string, DbHealthVitals> = {};
    for (const v of vitalsData ?? []) {
      if (!vitalsMap[v.service_registration_id]) {
        vitalsMap[v.service_registration_id] = v as DbHealthVitals;
      }
    }
    return entries.map((e) => ({ ...e, vitals: vitalsMap[e.id] }));
  }

  return entries;
}

// ─── Doctor queue (waiting_medico + in_progress) with vitals ──────────────────

export async function getDoctorEntries(eventId: string): Promise<QueueEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("service_registrations")
    .select("*, person:people(*)")
    .eq("event_id", eventId)
    .eq("service_type", "medicina")
    .in("status", ["waiting_medico", "in_progress"])
    .order("priority", { ascending: false })
    .order("position", { ascending: true });

  if (error || !data) return [];
  const entries = data.map(mapRow);

  const ids = entries.map((e) => e.id);
  if (!ids.length) return entries;

  const { data: vitalsData } = await admin
    .from("health_vitals")
    .select("*")
    .in("service_registration_id", ids)
    .order("recorded_at", { ascending: false });

  const vitalsMap: Record<string, DbHealthVitals> = {};
  for (const v of vitalsData ?? []) {
    if (!vitalsMap[v.service_registration_id]) {
      vitalsMap[v.service_registration_id] = v as DbHealthVitals;
    }
  }

  return entries.map((e) => ({ ...e, vitals: vitalsMap[e.id] }));
}

// ─── Bazaar controller: waiting entries ──────────────────────────────────────

export async function getBazaarWaitingEntries(
  eventId: string
): Promise<QueueEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("service_registrations")
    .select("*, person:people(*)")
    .eq("event_id", eventId)
    .eq("service_type", "bazar")
    .eq("status", "waiting")
    .order("priority", { ascending: false })
    .order("position", { ascending: true });

  if (error || !data) return [];
  return data.map(mapRow);
}

// ─── Bazaar cashier: browsing (in_progress) entries ───────────────────────────

export async function getBazaarBrowsingEntries(
  eventId: string
): Promise<QueueEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("service_registrations")
    .select("*, person:people(*)")
    .eq("event_id", eventId)
    .eq("service_type", "bazar")
    .eq("status", "in_progress")
    .order("priority", { ascending: false })
    .order("position", { ascending: true });

  if (error || !data) return [];
  return data.map(mapRow);
}

// ─── Beauty professional: cabeleireiro + estetica combined ───────────────────

export async function getBeautyEntries(
  eventId: string,
  professionalId: string | null // null = admin (show all)
): Promise<QueueEntry[]> {
  const admin = createAdminClient();
  let query = admin
    .from("service_registrations")
    .select("*, person:people(*)")
    .eq("event_id", eventId)
    .in("service_type", ["cabeleireiro_feminino", "cabeleireiro_masculino", "estetica"])
    .eq("status", "in_progress");

  if (professionalId) query = query.eq("assigned_to", professionalId);

  const { data, error } = await query
    .order("priority", { ascending: false })
    .order("position", { ascending: true });

  if (error || !data) return [];
  return data.map(mapRow);
}

// ─── Forwarded social work entries (psicologia → servico_social, unclaimed) ───

export async function getForwardedSocialWorkEntries(
  eventId: string
): Promise<QueueEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("service_registrations")
    .select("*, person:people(*)")
    .eq("event_id", eventId)
    .eq("service_type", "servico_social")
    .eq("forwarded_from", "psicologia")
    .eq("status", "waiting")
    .order("priority", { ascending: false })
    .order("position", { ascending: true });

  if (error || !data) return [];
  return data.map(mapRow);
}

// ─── Abandon ──────────────────────────────────────────────────────────────────

export async function abandonEntry(entryId: string): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("service_registrations")
    .update({ status: "abandoned" })
    .eq("id", entryId);

  if (error) return { error: error.message };
  return {};
}

// ─── Generic status update ────────────────────────────────────────────────────

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
  return {};
}
