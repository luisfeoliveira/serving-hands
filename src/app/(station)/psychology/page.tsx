import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getProfessionalEntries } from "@/lib/queue";
import { ProfessionalClient } from "@/components/professional/professional-client";

export default async function PsychologyPage() {
  const profile = await requireProfile();
  if (profile.role !== "psicologo" && profile.role !== "admin") {
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

  const initialEntries = await getProfessionalEntries(event.id, "psicologia", profile.id);

  return (
    <ProfessionalClient
      eventId={event.id}
      serviceType="psicologia"
      professionalId={profile.id}
      initialEntries={initialEntries}
    />
  );
}
