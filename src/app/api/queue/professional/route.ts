import { createClient } from "@/lib/supabase/server";
import { getProfessionalEntries } from "@/lib/queue";
import type { ServiceType } from "@/lib/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json([], { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const serviceType = searchParams.get("serviceType") as ServiceType | null;
  const professionalId = searchParams.get("professionalId"); // null string → treat as null
  const statusOverride = searchParams.get("status") ?? undefined;
  if (!eventId || !serviceType) return Response.json([], { status: 400 });

  const resolvedProfessionalId = professionalId === "null" || !professionalId ? null : professionalId;
  const entries = await getProfessionalEntries(eventId, serviceType, resolvedProfessionalId, statusOverride);
  return Response.json(entries);
}
