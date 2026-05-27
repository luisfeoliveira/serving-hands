import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getReportsData } from "@/lib/reports";
import { ReportsClient } from "./reports-client";

export default async function RelatoriosPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  const event = await getActiveEvent();
  if (!event) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum evento ativo no momento.
      </div>
    );
  }

  const data = await getReportsData(event.id);

  return (
    <ReportsClient
      eventId={event.id}
      eventName={event.name}
      initialData={data}
    />
  );
}
