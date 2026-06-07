import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getActiveEvent } from "@/lib/event";
import { createAdminClient } from "@/lib/supabase/admin";
import { SERVICE_LABELS } from "@/lib/types";
import type { ServiceType, ServiceStatus } from "@/lib/types";
import { AtendimentosClient } from "./atendimentos-client";

export type ServiceRow = {
  id: string;
  serviceType: ServiceType;
  medicalSpecialty: string | null;
  status: ServiceStatus;
  enqueuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type PersonJourney = {
  personId: string;
  personName: string;
  personAge: number;
  services: ServiceRow[];
  hasOpen: boolean;
};

export default async function AtendimentosPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/");

  const event = await getActiveEvent();
  if (!event) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhum evento ativo.
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: regs } = await admin
    .from("service_registrations")
    .select("id, service_type, medical_specialty, status, enqueued_at, started_at, completed_at, person_id, person:people(id, name, age)")
    .eq("event_id", event.id)
    .order("enqueued_at", { ascending: true });

  // Group by person
  const map = new Map<string, PersonJourney>();

  for (const r of regs ?? []) {
    const personRaw = r.person as unknown;
    const p = (Array.isArray(personRaw) ? personRaw[0] : personRaw) as { id: string; name: string; age: number } | null;
    if (!p) continue;

    if (!map.has(p.id)) {
      map.set(p.id, { personId: p.id, personName: p.name, personAge: p.age, services: [], hasOpen: false });
    }

    const entry = map.get(p.id)!;
    const status = r.status as ServiceStatus;
    const isOpen = !["completed", "abandoned", "dispensed"].includes(status);

    entry.services.push({
      id: r.id,
      serviceType: r.service_type as ServiceType,
      medicalSpecialty: r.medical_specialty ?? null,
      status,
      enqueuedAt: r.enqueued_at,
      startedAt: r.started_at ?? null,
      completedAt: r.completed_at ?? null,
    });

    if (isOpen) entry.hasOpen = true;
  }

  // Sort: people with open attendances first, then by name
  const journeys = Array.from(map.values()).sort((a, b) => {
    if (a.hasOpen && !b.hasOpen) return -1;
    if (!a.hasOpen && b.hasOpen) return 1;
    return a.personName.localeCompare(b.personName, "pt-BR");
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Jornada de Atendimentos</h1>
        <p className="text-xs text-muted-foreground">
          {journeys.length} pessoas · {journeys.filter(j => j.hasOpen).length} com atendimentos em aberto
        </p>
      </div>
      <AtendimentosClient journeys={journeys} serviceLabels={SERVICE_LABELS} />
    </div>
  );
}
