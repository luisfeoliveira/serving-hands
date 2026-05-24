import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getQueueSizes } from "./actions";
import { ReceptionClient } from "./reception-client";

export default async function ReceptionPage() {
  const profile = await requireProfile();

  if (profile.role !== "recepcao" && profile.role !== "admin") {
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

  const queueSizes = await getQueueSizes(event.id);

  return (
    <ReceptionClient
      eventId={event.id}
      initialQueueSizes={queueSizes}
    />
  );
}
