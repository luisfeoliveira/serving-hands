"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServiceType, DbPerson } from "@/lib/types";

// ─── Lookup person by CPF ─────────────────────────────────────────────────────

export async function lookupPerson(cpf: string): Promise<
  | { error: string }
  | {
      person: DbPerson | null;
      isCurrentEvent: boolean;
      registeredServices: ServiceType[];
      eventId: string;
    }
> {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return { error: "CPF deve ter 11 dígitos." };

  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id")
    .eq("active", true)
    .single();

  if (!event) return { error: "Nenhum evento ativo." };

  // Try current event first
  const { data: currentPerson } = await admin
    .from("people")
    .select("*")
    .eq("event_id", event.id)
    .eq("cpf", clean)
    .single();

  if (currentPerson) {
    const { data: regs } = await admin
      .from("service_registrations")
      .select("service_type")
      .eq("person_id", currentPerson.id)
      .neq("status", "abandoned");

    return {
      person: currentPerson,
      isCurrentEvent: true,
      registeredServices: (regs ?? []).map((r) => r.service_type as ServiceType),
      eventId: event.id,
    };
  }

  // Try previous editions for pre-fill
  const { data: previousPerson } = await admin
    .from("people")
    .select("*")
    .eq("cpf", clean)
    .order("registered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    person: previousPerson ?? null,
    isCurrentEvent: false,
    registeredServices: [],
    eventId: event.id,
  };
}

// ─── Get queue sizes (active entries per service) ─────────────────────────────

export async function getQueueSizes(
  eventId: string
): Promise<Record<string, number>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("service_registrations")
    .select("service_type")
    .eq("event_id", eventId)
    .in("status", [
      "waiting",
      "waiting_nursing",
      "nursing_in_progress",
      "waiting_medico",
      "in_progress",
    ]);

  const sizes: Record<string, number> = {};
  for (const row of data ?? []) {
    sizes[row.service_type] = (sizes[row.service_type] ?? 0) + 1;
  }
  return sizes;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function nextPosition(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  serviceType: ServiceType
): Promise<number> {
  const { data } = await admin
    .from("service_registrations")
    .select("position")
    .eq("event_id", eventId)
    .eq("service_type", serviceType)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.position ?? 0) + 1;
}

// ─── Register new person + services ──────────────────────────────────────────

export async function registerPerson(input: {
  cpf: string;
  name: string;
  age: number;
  services: ServiceType[];
  chiefComplaint: string;
  priority: boolean;
  eventId: string;
}): Promise<{ error?: string }> {
  if (!input.services.length) return { error: "Selecione ao menos um serviço." };

  const admin = createAdminClient();

  const { data: person, error: personErr } = await admin
    .from("people")
    .upsert(
      {
        event_id: input.eventId,
        cpf: input.cpf.replace(/\D/g, ""),
        name: input.name.trim(),
        age: input.age,
      },
      { onConflict: "event_id,cpf" }
    )
    .select()
    .single();

  if (personErr || !person) return { error: "Erro ao cadastrar participante." };

  return insertServices(admin, person.id, input);
}

// ─── Add services to existing person ─────────────────────────────────────────

export async function addServices(input: {
  personId: string;
  services: ServiceType[];
  chiefComplaint: string;
  priority: boolean;
  eventId: string;
}): Promise<{ error?: string }> {
  if (!input.services.length) return { error: "Selecione ao menos um serviço." };

  const admin = createAdminClient();
  return insertServices(admin, input.personId, input);
}

// ─── Shared insert logic ──────────────────────────────────────────────────────

async function insertServices(
  admin: ReturnType<typeof createAdminClient>,
  personId: string,
  input: {
    services: ServiceType[];
    chiefComplaint: string;
    priority: boolean;
    eventId: string;
  }
): Promise<{ error?: string }> {
  for (const service of input.services) {
    const position = await nextPosition(admin, input.eventId, service);
    const status = service === "medicina" ? "waiting_nursing" : "waiting";

    const { error } = await admin.from("service_registrations").insert({
      event_id: input.eventId,
      person_id: personId,
      service_type: service,
      chief_complaint: service === "medicina" ? input.chiefComplaint || null : null,
      priority: input.priority,
      status,
      position,
    });

    if (error) return { error: `Erro ao registrar ${service}: ${error.message}` };
  }

  revalidatePath("/recepcao");
  return {};
}
