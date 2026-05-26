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
  // Controller's own specialty — determines which medicina phase they manage
  const controllerSpecialty = profile.medical_specialty ?? null;

  const queueTasks: Promise<[string, QueueEntry[]]>[] = [];
  const professionalTasks: Promise<[string, ProfessionalStatus[]]>[] = [];

  for (const st of serviceTypes) {
    const config = ASSIGNMENT_CONFIG[st];
    if (config) {
      if (config.secondPhase && controllerSpecialty) {
        // Specialty controller → only doctor assignment phase, filtered by specialty
        const key = `${st}:2`;
        queueTasks.push(
          getControllerEntries(event.id, st, config.secondPhase.waitingStatus, controllerSpecialty).then((e) => [key, e])
        );
        professionalTasks.push(
          getProfessionalStatuses(event.id, config.secondPhase.role, config.secondPhase.busyStatus).then((s) => [key, s])
        );
      } else if (config.secondPhase && !controllerSpecialty) {
        // Nursing controller → only first phase (nursing triage)
        queueTasks.push(getControllerEntries(event.id, st).then((e) => [st, e]));
        professionalTasks.push(
          getProfessionalStatuses(event.id, config.role, config.busyStatus).then((s) => [st, s])
        );
      } else {
        // Single-phase service
        queueTasks.push(getControllerEntries(event.id, st).then((e) => [st, e]));
        professionalTasks.push(
          getProfessionalStatuses(event.id, config.role, config.busyStatus).then((s) => [st, s])
        );
      }
    } else {
      queueTasks.push(getQueueEntries(event.id, st).then((e) => [st, e]));
      professionalTasks.push(Promise.resolve([st, []]));
    }
  }

  const [queueEntries, professionalEntries] = await Promise.all([
    Promise.all(queueTasks),
    Promise.all(professionalTasks),
  ]);

  const queues = Object.fromEntries(queueEntries) as Record<string, QueueEntry[]>;
  const professionalsMap = Object.fromEntries(professionalEntries) as Record<string, ProfessionalStatus[]>;

  return (
    <ControllerClient
      eventId={event.id}
      serviceTypes={serviceTypes}
      controllerSpecialty={controllerSpecialty}
      initialQueues={queues}
      initialProfessionals={professionalsMap}
    />
  );
}
