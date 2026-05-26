// No directive — shared between server and client

import type { ServiceType, UserRole } from "@/lib/types";

export interface AssignmentConfig {
  /** Role of professionals who handle this service */
  role: UserRole;
  /** Status an entry gets when assigned to a professional */
  targetStatus: string;
  /** Status that means a professional is currently busy */
  busyStatus: string;
  /** Status of entries waiting to be assigned */
  waitingStatus: string;
  /** Optional second assignment phase (medicina: doctor after nursing) */
  secondPhase?: Omit<AssignmentConfig, "secondPhase">;
}

/**
 * Services that use controller assignment.
 * Absent from map = self-managed (cabelereiro, bazar).
 */
export const ASSIGNMENT_CONFIG: Partial<Record<ServiceType, AssignmentConfig>> = {
  medicina: {
    role: "enfermagem",
    targetStatus: "nursing_in_progress",
    busyStatus: "nursing_in_progress",
    waitingStatus: "waiting_nursing",
    secondPhase: {
      role: "medico",
      targetStatus: "in_progress",
      busyStatus: "in_progress",
      waitingStatus: "waiting_medico",
    },
  },
  odontologia: {
    role: "odontologo",
    targetStatus: "in_progress",
    busyStatus: "in_progress",
    waitingStatus: "waiting",
  },
  fonoaudiologia: {
    role: "fonoaudiologo",
    targetStatus: "in_progress",
    busyStatus: "in_progress",
    waitingStatus: "waiting",
  },
  psicologia: {
    role: "psicologo",
    targetStatus: "in_progress",
    busyStatus: "in_progress",
    waitingStatus: "waiting",
  },
  servico_social: {
    role: "assistente_social",
    targetStatus: "in_progress",
    busyStatus: "in_progress",
    waitingStatus: "waiting",
  },
  consultoria_juridica: {
    role: "consultor_juridico",
    targetStatus: "in_progress",
    busyStatus: "in_progress",
    waitingStatus: "waiting",
  },
  consultoria_financeira: {
    role: "consultor_financeiro",
    targetStatus: "in_progress",
    busyStatus: "in_progress",
    waitingStatus: "waiting",
  },
  sobrancelha: {
    role: "beleza",
    targetStatus: "in_progress",
    busyStatus: "in_progress",
    waitingStatus: "waiting",
  },
  estetica: {
    role: "beleza",
    targetStatus: "in_progress",
    busyStatus: "in_progress",
    waitingStatus: "waiting",
  },
  // cabelereiro — no assignment (self-managed queue)
  // bazar       — no assignment (own flow)
};

export function hasAssignment(serviceType: ServiceType): boolean {
  return serviceType in ASSIGNMENT_CONFIG;
}
