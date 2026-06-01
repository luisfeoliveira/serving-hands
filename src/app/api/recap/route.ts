import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SERVICE_LABELS } from "@/lib/types";
import type { ServiceType } from "@/lib/types";

export interface RecapData {
  eventName: string;
  completedCount: number;
  peopleSeen: number;
  services: { label: string; count: number }[];
  startedAt: string | null;
  endedAt: string | null;
  // Extra metrics for roles that don't have completed_by records
  registeredCount?: number; // reception: people registered
  nursingCount?: number;    // nursing: nursing steps completed
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json(null, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return Response.json(null, { status: 400 });

  const admin = createAdminClient();

  const [
    { data: eventRow },
    { data: completedRows },
    { data: nursingRows },
    { data: registeredRows },
  ] = await Promise.all([
    admin.from("events").select("name").eq("id", eventId).single(),

    // Professionals: appointments they directly completed
    admin
      .from("service_registrations")
      .select("person_id, service_type, started_at, completed_at")
      .eq("event_id", eventId)
      .eq("completed_by", user.id)
      .eq("status", "completed"),

    // Nursing: registrations they handled the nursing step for
    admin
      .from("service_registrations")
      .select("person_id, nursing_completed_at")
      .eq("event_id", eventId)
      .eq("assigned_to", user.id)
      .not("nursing_completed_at", "is", null),

    // Reception / general: people registered during the event
    // (rough proxy — counts all registrations for the event)
    admin
      .from("service_registrations")
      .select("person_id")
      .eq("event_id", eventId),
  ]);

  const completedCount = completedRows?.length ?? 0;
  const nursingCount = nursingRows?.length ?? 0;
  const peopleSeen = new Set(completedRows?.map((r) => r.person_id)).size;

  const serviceCounts: Record<string, number> = {};
  for (const r of completedRows ?? []) {
    serviceCounts[r.service_type] = (serviceCounts[r.service_type] ?? 0) + 1;
  }
  const services = Object.entries(serviceCounts)
    .map(([st, count]) => ({
      label: SERVICE_LABELS[st as ServiceType] ?? st,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const timestamps = (completedRows ?? [])
    .flatMap((r) => [r.started_at, r.completed_at])
    .filter(Boolean) as string[];
  const startedAt = timestamps.length
    ? timestamps.reduce((a, b) => (a < b ? a : b))
    : null;
  const endedAt = timestamps.length
    ? timestamps.reduce((a, b) => (a > b ? a : b))
    : null;

  // Total distinct people in the event (for reception recap)
  const registeredCount = new Set(registeredRows?.map((r) => r.person_id)).size;

  const data: RecapData = {
    eventName: eventRow?.name ?? "Ação Social",
    completedCount,
    peopleSeen,
    services,
    startedAt,
    endedAt,
    registeredCount,
    nursingCount,
  };

  return Response.json(data);
}
