"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ServiceType, DbPerson, DocType } from "@/lib/types";

// ─── Lookup person by document ────────────────────────────────────────────────

export async function lookupPerson(docType: DocType, docNumber: string): Promise<
  | { error: string }
  | {
      person: DbPerson | null;
      isCurrentEvent: boolean;
      registeredServices: ServiceType[];
      eventId: string;
    }
> {
  const clean = cleanDoc(docType, docNumber);
  if (!clean) return { error: "Documento inválido." };

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
    .eq("doc_type", docType)
    .eq("doc_number", clean)
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
    .eq("doc_type", docType)
    .eq("doc_number", clean)
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

// Strip formatting for storage
function cleanDoc(docType: DocType, value: string): string {
  if (docType === "cpf" || docType === "sus") return value.replace(/\D/g, "");
  // RG: remove separators but keep letters (some states use letters)
  return value.replace(/[\s.\-\/]/g, "").toUpperCase();
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
  docType: DocType;
  docNumber: string;
  name: string;
  age: number;
  services: ServiceType[];
  priority: boolean;
  eventId: string;
}): Promise<{ error?: string }> {
  if (!input.services.length) return { error: "Selecione ao menos um serviço." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const admin = createAdminClient();
  const clean = cleanDoc(input.docType, input.docNumber);

  const { data: person, error: personErr } = await admin
    .from("people")
    .upsert(
      {
        event_id: input.eventId,
        doc_type: input.docType,
        doc_number: clean,
        name: input.name.trim(),
        age: input.age,
        registered_by: user.id,
      },
      { onConflict: "event_id,doc_type,doc_number" }
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
      priority: input.priority,
      status,
      position,
    });

    if (error) return { error: `Erro ao registrar ${service}: ${error.message}` };
  }

  return {};
}
