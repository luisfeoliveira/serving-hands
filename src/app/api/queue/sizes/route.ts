import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ACTIVE_STATUSES = [
  "waiting",
  "waiting_nursing",
  "nursing_in_progress",
  "waiting_medico",
  "in_progress",
];

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({}, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return Response.json({}, { status: 400 });

  const admin = createAdminClient();

  const [{ data: activeRows }, { data: completedRows }] = await Promise.all([
    // Active queue counts per service
    admin
      .from("service_registrations")
      .select("service_type")
      .eq("event_id", eventId)
      .in("status", ACTIVE_STATUSES),

    // Completed rows with timing for avg service duration
    admin
      .from("service_registrations")
      .select("service_type, started_at, completed_at")
      .eq("event_id", eventId)
      .eq("status", "completed")
      .not("started_at", "is", null)
      .not("completed_at", "is", null),
  ]);

  // Queue sizes
  const sizes: Record<string, number> = {};
  for (const row of activeRows ?? []) {
    sizes[row.service_type] = (sizes[row.service_type] ?? 0) + 1;
  }

  // Avg service duration in minutes per service type
  const durationSums: Record<string, number> = {};
  const durationCounts: Record<string, number> = {};
  for (const row of completedRows ?? []) {
    if (!row.started_at || !row.completed_at) continue;
    const mins =
      (new Date(row.completed_at).getTime() - new Date(row.started_at).getTime()) / 60_000;
    if (mins <= 0 || mins > 180) continue; // ignore outliers
    durationSums[row.service_type] = (durationSums[row.service_type] ?? 0) + mins;
    durationCounts[row.service_type] = (durationCounts[row.service_type] ?? 0) + 1;
  }

  const avgDurationMins: Record<string, number> = {};
  for (const st of Object.keys(durationSums)) {
    avgDurationMins[st] = Math.round(durationSums[st] / durationCounts[st]);
  }

  return Response.json({ sizes, avgDurationMins });
}
