import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SERVICE_LABELS } from "@/lib/types";
import type { ServiceType } from "@/lib/types";

export interface RecapData {
  eventName: string;
  completedCount: number;
  peopleSeen: number;
  services: { label: string; count: number }[];
  startedAt: string | null;
  endedAt: string | null;
  // Extra metrics for roles that don't have completed_by records
  registeredCount?: number; // reception: people registered
  nursingCount?: number;    // nursing: nursing steps completed
  // For share card
  volunteerName: string;
  volunteerSpecialty: string | null;
  volunteerIsProfessional: boolean;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json(null, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return Response.json(null, { status: 400 });

  const admin = createAdminClient();

  const [
    { data: eventRow },
    { data: userRow },
    { data: completedRows },
    { data: nursingRows },
  ] = await Promise.all([
    admin.from("events").select("name").eq("id", eventId).single(),
    admin.from("users").select("name, role").eq("id", user.id).single(),

    // Professionals: appointments they directly completed
    admin
      .from("service_registrations")
      .select("person_id, service_type, started_at, completed_at")
      .eq("event_id", eventId)
      .eq("completed_by", user.id)
      .eq("status", "completed"),

    // Nursing: registrations they handled the nursing step for
    admin
      .from("service_registrations")
      .select("person_id, nursing_completed_at")
      .eq("event_id", eventId)
      .eq("assigned_to", user.id)
      .not("nursing_completed_at", "is", null),
  ]);

  const completedCount = completedRows?.length ?? 0;
  const nursingCount = nursingRows?.length ?? 0;
  const peopleSeen = new Set(completedRows?.map((r) => r.person_id)).size;

  const serviceCounts: Record<string, number> = {};
  for (const r of completedRows ?? []) {
    serviceCounts[r.service_type] = (serviceCounts[r.service_type] ?? 0) + 1;
  }
  const services = Object.entries(serviceCounts)
    .map(([st, count]) => ({
      label: SERVICE_LABELS[st as ServiceType] ?? st,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const timestamps = (completedRows ?? [])
    .flatMap((r) => [r.started_at, r.completed_at])
    .filter(Boolean) as string[];
  const startedAt = timestamps.length
    ? timestamps.reduce((a, b) => (a < b ? a : b))
    : null;
  const endedAt = timestamps.length
    ? timestamps.reduce((a, b) => (a > b ? a : b))
    : null;

  // Only count for recepcao: people this specific user registered
  let registeredCount: number | undefined;
  if (userRow?.role === "recepcao") {
    const { data: registeredRows } = await admin
      .from("people")
      .select("id")
      .eq("event_id", eventId)
      .eq("registered_by", user.id);
    registeredCount = registeredRows?.length ?? 0;
  }

  // Reception and controllers get the generic volunteer card
  const NON_PROFESSIONAL_ROLES = new Set([
    "recepcao",
    "controlador",
    "bazar_controlador",
    "bazar_caixa",
    "admin",
  ]);
  const volunteerIsProfessional = userRow?.role
    ? !NON_PROFESSIONAL_ROLES.has(userRow.role)
    : false;

  const ROLE_SPECIALTY: Record<string, string> = {
    medico: "Medicina",
    odontologo: "Odontologia",
    fonoaudiologo: "Fonoaudiologia",
    psicologo: "Psicologia",
    assistente_social: "Serviço Social",
    enfermagem: "Enfermagem",
    recepcao: "Recepção",
    consultor_juridico: "Consultoria Jurídica",
    consultor_financeiro: "Consultoria Financeira",
    beleza: "Beleza",
    controlador: "Coordenação",
    bazar_controlador: "Bazar",
    bazar_caixa: "Bazar",
    admin: "Administração",
  };

  const data: RecapData = {
    eventName: eventRow?.name ?? "Ação Social",
    completedCount,
    peopleSeen,
    services,
    startedAt,
    endedAt,
    registeredCount,
    nursingCount,
    volunteerName: userRow?.name ?? "Voluntário",
    volunteerSpecialty: userRow?.role ? (ROLE_SPECIALTY[userRow.role] ?? null) : null,
    volunteerIsProfessional,
  };

  return Response.json(data);
}
