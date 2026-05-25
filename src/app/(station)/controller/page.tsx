import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import {
  getQueueEntries,
  getControllerEntries,
  getProfessionalStatuses,
} from "@/lib/queue";
import { ASSIGNMENT_CONFIG } from "@/lib/service-config";
import { ControllerClient } from "./controller-client";
import type { ServiceType, QueueEntry, ProfessionalStatus } from "@/lib/types";

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

  const [queues, professionalsMap] = await Promise.all([
    Promise.all(
      serviceTypes.map(async (st) => {
        const config = ASSIGNMENT_CONFIG[st];
        const entries = config
          ? await getControllerEntries(event.id, st)
          : await getQueueEntries(event.id, st);
        return [st, entries] as [string, QueueEntry[]];
      })
    ).then(Object.fromEntries) as Promise<Record<string, QueueEntry[]>>,
    Promise.all(
      serviceTypes.map(async (st) => {
        const config = ASSIGNMENT_CONFIG[st];
        if (!config) return [st, []] as [string, ProfessionalStatus[]];
        const statuses = await getProfessionalStatuses(
          event.id,
          config.role,
          config.busyStatus
        );
        return [st, statuses] as [string, ProfessionalStatus[]];
      })
    ).then(Object.fromEntries) as Promise<Record<string, ProfessionalStatus[]>>,
  ]);

  return (
    <ControllerClient
      eventId={event.id}
      serviceTypes={serviceTypes}
      initialQueues={queues}
      initialProfessionals={professionalsMap}
    />
  );
}
