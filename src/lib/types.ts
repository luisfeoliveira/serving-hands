// ─── Roles ───────────────────────────────────────────────────────────────────

export type UserRole =
  | "recepcao"
  | "controlador"
  | "enfermagem"
  | "medico"
  | "odontologo"
  | "fonoaudiologo"
  | "psicologo"
  | "assistente_social"
  | "consultor_juridico"
  | "consultor_financeiro"
  | "beleza"
  | "bazar_controlador"
  | "bazar_caixa"
  | "admin";

// ─── Service types ────────────────────────────────────────────────────────────

export type ServiceType =
  | "medicina"
  | "odontologia"
  | "fonoaudiologia"
  | "psicologia"
  | "servico_social"
  | "consultoria_juridica"
  | "consultoria_financeira"
  | "cabeleireiro"
  | "estetica"
  | "bazar";

export const SERVICE_LABELS: Record<ServiceType, string> = {
  medicina: "Medicina",
  odontologia: "Odontologia",
  fonoaudiologia: "Fonoaudiologia",
  psicologia: "Psicologia",
  servico_social: "Serviço Social",
  consultoria_juridica: "Consultoria Jurídica",
  consultoria_financeira: "Consultoria Financeira",
  cabeleireiro: "Cabeleireiro",
  estetica: "Estética",
  bazar: "Bazar",
};

// ─── Queue statuses ───────────────────────────────────────────────────────────

export type ServiceStatus =
  | "waiting"
  | "waiting_nursing"
  | "nursing_in_progress"
  | "waiting_medico"
  | "in_progress"
  | "completed"
  | "dispensed"
  | "abandoned";

// ─── DB row types ─────────────────────────────────────────────────────────────

export interface DbEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  active: boolean;
  service_limits: Record<string, number> | null;
}

export interface DbUser {
  id: string;
  name: string;
  role: UserRole;
  service_types: ServiceType[] | null;
  active: boolean;
  medical_specialty: string | null;
  medical_specialties: string[] | null; // multi-specialty for controllers
  day_finished_at?: string | null;
  day_finished_event_id?: string | null;
}

export interface DbPerson {
  id: string;
  event_id: string;
  cpf: string;
  name: string;
  age: number;
  registered_at: string;
}

export interface DbServiceRegistration {
  id: string;
  event_id: string;
  person_id: string;
  service_type: ServiceType;
  medical_specialty: string | null;
  chief_complaint: string | null;
  priority: boolean;
  status: ServiceStatus;
  position: number;
  enqueued_at: string;
  nursing_completed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  started_by: string | null;
  completed_by: string | null;
  assigned_to: string | null;
}

export interface ProfessionalStatus {
  id: string;
  name: string;
  role: UserRole;
  busy: boolean;
  patientName?: string;
  specialty?: string | null;
}

export interface DbHealthVitals {
  id: string;
  service_registration_id: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  blood_glucose: number | null;
  weight: number | null;
  temperature: number | null;
  recorded_by: string;
  recorded_at: string;
}

export interface DbAppointment {
  id: string;
  service_registration_id: string;
  data: AppointmentData;
  created_by: string;
  created_at: string;
}

export interface DbBazarTransaction {
  id: string;
  event_id: string;
  person_id: string;
  item_count: number;
  amount: number;
  payment_method: "cash" | "pix" | "card";
  processed_by: string;
  processed_at: string;
}

export interface DbMedicalSpecialty {
  id: string;
  event_id: string;
  name: string;
  active: boolean;
}

// ─── Appointment data variants ────────────────────────────────────────────────

export type MedicinaData = {
  observacao: string;
  referral: "resolved" | "sus" | "other";
  referral_notes?: string;
};

export type ClinicalData = {
  chief_complaint: string;
  referral: "resolved" | "sus" | "other";
  referral_notes?: string;
};

export type ConsultoriaJuridicaData = {
  area: "familia" | "trabalhista" | "previdenciario" | "outros";
  case_summary: string;
};

export type ConsultoriaFinanceiraData = {
  area: "dividas" | "orcamento" | "microcredito" | "outros";
  case_summary: string;
};

export type BelezaData = Record<string, never>;

export type BazaarData = {
  qty: number;
  total: number;
  method: "dinheiro" | "pix";
  received?: number;
  change?: number;
};

export type AppointmentData =
  | MedicinaData
  | ClinicalData
  | ConsultoriaJuridicaData
  | ConsultoriaFinanceiraData
  | BelezaData
  | BazaarData;

// ─── Enriched queue row (used in UI) ─────────────────────────────────────────

export interface QueueEntry extends DbServiceRegistration {
  person: DbPerson;
  vitals?: DbHealthVitals;
  active_services?: ServiceType[]; // other services person is currently in_progress
}
