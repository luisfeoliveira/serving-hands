import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getQueueEntries } from "@/lib/queue";
import { ControllerClient } from "./controller-client";
import type { ServiceType, QueueEntry } from "@/lib/types";

export default async function ControllerPage() {
  const profile = await requireProfile();

  if (profile.role !== "controlador" && profile.role !== "admin") {
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

  const serviceTypes = (profile.service_types ?? []) as ServiceType[];

  const queues = Object.fromEntries(
    await Promise.all(
      serviceTypes.map(async (st) => [st, await getQueueEntries(event.id, st)])
    )
  ) as Record<string, QueueEntry[]>;

  return (
    <ControllerClient
      eventId={event.id}
      serviceTypes={serviceTypes}
      initialQueues={queues}
    />
  );
}
