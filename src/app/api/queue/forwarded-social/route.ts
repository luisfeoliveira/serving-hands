import { getForwardedSocialWorkEntries } from "@/lib/queue";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return Response.json([], { status: 400 });

  const entries = await getForwardedSocialWorkEntries(eventId);
  return Response.json(entries);
}
