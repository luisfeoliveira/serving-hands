import { createClient } from "@/lib/supabase/server";
import { getDoctorEntries } from "@/lib/queue";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json([], { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return Response.json([], { status: 400 });

  const entries = await getDoctorEntries(eventId);
  return Response.json(entries);
}
