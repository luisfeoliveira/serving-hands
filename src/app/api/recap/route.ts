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

  const [{ data: eventRow }, { data: rows }] = await Promise.all([
    admin.from("events").select("name").eq("id", eventId).single(),
    admin
      .from("service_registrations")
      .select("person_id, service_type, started_at, completed_at")
      .eq("event_id", eventId)
      .eq("completed_by", user.id)
      .eq("status", "completed"),
  ]);

  const completedCount = rows?.length ?? 0;
  const peopleSeen = new Set(rows?.map((r) => r.person_id)).size;

  const serviceCounts: Record<string, number> = {};
  for (const r of rows ?? []) {
    serviceCounts[r.service_type] = (serviceCounts[r.service_type] ?? 0) + 1;
  }
  const services = Object.entries(serviceCounts)
    .map(([st, count]) => ({
      label: SERVICE_LABELS[st as ServiceType] ?? st,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const timestamps = (rows ?? [])
    .flatMap((r) => [r.started_at, r.completed_at])
    .filter(Boolean) as string[];
  const startedAt = timestamps.length ? timestamps.reduce((a, b) => (a < b ? a : b)) : null;
  const endedAt = timestamps.length ? timestamps.reduce((a, b) => (a > b ? a : b)) : null;

  const data: RecapData = {
    eventName: eventRow?.name ?? "Ação Social",
    completedCount,
    peopleSeen,
    services,
    startedAt,
    endedAt,
  };

  return Response.json(data);
}
