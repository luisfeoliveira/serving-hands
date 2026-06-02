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

// All medical specialties — used to load full doctor view for admin
const ALL_MEDICAL_SPECIALTIES = ["clinica_geral", "cardiologia", "pneumologia", "dermatologia"];

export default async function ControllerPage() {
  const [profile, event] = await Promise.all([requireProfile(), getActiveEvent()]);

  if (profile.role !== "controlador" && profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  if (!event) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum evento ativo no momento.
      </div>
    );
  }

  const isAdmin = profile.role === "admin";

  // Admin with no service_types sees all assignable services
  const allServices = Object.keys(ASSIGNMENT_CONFIG) as ServiceType[];
  const serviceTypes =
    isAdmin && !profile.service_types?.length
      ? allServices
      : ((profile.service_types ?? []) as ServiceType[]);

  // Prefer new medical_specialties array; fall back to legacy single specialty
  const controllerSpecialties: string[] =
    profile.medical_specialties?.length
      ? profile.medical_specialties
      : profile.medical_specialty
      ? [profile.medical_specialty]
      : [];

  const queueTasks: Promise<[string, QueueEntry[]]>[] = [];
  const professionalTasks: Promise<[string, ProfessionalStatus[]]>[] = [];

  for (const st of serviceTypes) {
    const config = ASSIGNMENT_CONFIG[st];
    if (config) {
      if (config.secondPhase && controllerSpecialties.length > 0) {
        // Doctor controller — one queue + professionals per specialty
        for (const specialty of controllerSpecialties) {
          const key = `${st}:${specialty}`;
          queueTasks.push(
            getControllerEntries(event.id, st, config.secondPhase.waitingStatus, specialty).then((e) => [key, e])
          );
          professionalTasks.push(
            getProfessionalStatuses(event.id, config.secondPhase.role, config.secondPhase.busyStatus).then((s) => [key, s])
          );
        }
      } else if (config.secondPhase && controllerSpecialties.length === 0) {
        // Nursing controller (or admin) → always load nursing phase
        queueTasks.push(getControllerEntries(event.id, st).then((e) => [st, e]));
        professionalTasks.push(
          getProfessionalStatuses(event.id, config.role, config.busyStatus).then((s) => [st, s])
        );

        // Admin: also load doctor phase for all specialties
        if (isAdmin && config.secondPhase) {
          for (const specialty of ALL_MEDICAL_SPECIALTIES) {
            const key = `${st}:${specialty}`;
            queueTasks.push(
              getControllerEntries(event.id, st, config.secondPhase.waitingStatus, specialty).then((e) => [key, e])
            );
            professionalTasks.push(
              getProfessionalStatuses(event.id, config.secondPhase.role, config.secondPhase.busyStatus).then((s) => [key, s])
            );
          }
        }
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
      controllerSpecialties={controllerSpecialties}
      isAdmin={isAdmin}
      initialQueues={queues}
      initialProfessionals={professionalsMap}
    />
  );
}
