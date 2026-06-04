import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { listRecords } from "./actions";
import { EvangelismClient } from "./evangelism-client";

export default async function EvangelismPage() {
  const [profile, event] = await Promise.all([requireProfile(), getActiveEvent()]);
  if (profile.role !== "evangelism" && profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  if (!event) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum evento ativo no momento.
      </div>
    );
  }

  const initialRecords = await listRecords(event.id);

  return (
    <EvangelismClient
      eventId={event.id}
      initialRecords={initialRecords}
    />
  );
}
