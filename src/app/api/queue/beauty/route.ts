import { createClient } from "@/lib/supabase/server";
import { getBeautyEntries } from "@/lib/queue";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json([], { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const professionalId = searchParams.get("professionalId");
  if (!eventId) return Response.json([], { status: 400 });

  const resolvedId = professionalId === "null" || !professionalId ? null : professionalId;
  const entries = await getBeautyEntries(eventId, resolvedId);
  return Response.json(entries);
}
