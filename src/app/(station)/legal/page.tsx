import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getProfessionalEntries } from "@/lib/queue";
import { ProfessionalClient } from "@/components/professional/professional-client";

export default async function LegalPage() {
  const [profile, event] = await Promise.all([requireProfile(), getActiveEvent()]);
  if (profile.role !== "consultor_juridico" && profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  if (!event) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum evento ativo no momento.
      </div>
    );
  }

  const initialEntries = await getProfessionalEntries(event.id, "consultoria_juridica", profile.role === "admin" ? null : profile.id);

  return (
    <ProfessionalClient
      eventId={event.id}
      serviceType="consultoria_juridica"
      professionalId={profile.role === "admin" ? null : profile.id}
      initialEntries={initialEntries}
      professional={{ name: profile.name, role: profile.role, registration_number: profile.registration_number }}
      event={{ name: event.name, date: event.date }}
    />
  );
}
