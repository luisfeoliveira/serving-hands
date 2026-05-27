import { createClient } from "@/lib/supabase/server";
import { getQueueEntries } from "@/lib/queue";
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
  if (!eventId || !serviceType) return Response.json([], { status: 400 });

  const entries = await getQueueEntries(eventId, serviceType);
  return Response.json(entries);
}
