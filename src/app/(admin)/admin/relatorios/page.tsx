import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getReportsData } from "@/lib/reports";
import { ReportsClient } from "./reports-client";

export default async function RelatoriosPage() {
  // getActiveEvent is React.cache — returns instantly (layout already resolved it)
  const event = await getActiveEvent();
  if (!event) {
    // Still need auth check before rendering anything
    await requireProfile();
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum evento ativo no momento.
      </div>
    );
  }

  // Overlap auth (354ms) with reports fetch (360ms) — saves ~350ms TTFB
  const [profile, data] = await Promise.all([
    requireProfile(),
    getReportsData(event.id),
  ]);
  if (profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  return (
    <ReportsClient
      eventId={event.id}
      eventName={event.name}
      initialData={data}
    />
  );
}
