import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getControllerEntries, getProfessionalStatuses } from "@/lib/queue";
import type { ServiceType, UserRole } from "@/lib/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({}, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const serviceType = searchParams.get("serviceType") as ServiceType | null;
  const waitingStatus = searchParams.get("waitingStatus") ?? undefined;
  const role = searchParams.get("role") as UserRole | null;
  const busyStatus = searchParams.get("busyStatus");
  const specialtyFilter = searchParams.get("specialtyFilter") ?? undefined;
  const professionalSpecialty = searchParams.get("professionalSpecialty") ?? undefined;

  if (!eventId || !serviceType || !role || !busyStatus) {
    return Response.json({}, { status: 400 });
  }

  const admin = createAdminClient();
  const [queue, professionals, { data: completedRows }] = await Promise.all([
    getControllerEntries(eventId, serviceType, waitingStatus, specialtyFilter),
    getProfessionalStatuses(eventId, role, busyStatus, professionalSpecialty),
    admin
      .from("service_registrations")
      .select("started_at, completed_at")
      .eq("event_id", eventId)
      .eq("service_type", serviceType)
      .eq("status", "completed")
      .not("started_at", "is", null)
      .not("completed_at", "is", null),
  ]);

  let avgDurationMin: number | null = null;
  if (completedRows?.length) {
    const total = completedRows.reduce((sum, r) => {
      const mins =
        (new Date(r.completed_at!).getTime() - new Date(r.started_at!).getTime()) / 60_000;
      return mins > 0 && mins < 180 ? sum + mins : sum;
    }, 0);
    const valid = completedRows.filter((r) => {
      const mins =
        (new Date(r.completed_at!).getTime() - new Date(r.started_at!).getTime()) / 60_000;
      return mins > 0 && mins < 180;
    }).length;
    if (valid > 0) avgDurationMin = Math.round(total / valid);
  }

  return Response.json({ queue, professionals, avgDurationMin });
}
