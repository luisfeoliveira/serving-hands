import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getProfessionalEntries } from "@/lib/queue";
import { ProfessionalClient } from "@/components/professional/professional-client";

export default async function SocialWorkPage() {
  const [profile, event] = await Promise.all([requireProfile(), getActiveEvent()]);
  if (profile.role !== "assistente_social" && profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  if (!event) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum evento ativo no momento.
      </div>
    );
  }

  const initialEntries = await getProfessionalEntries(event.id, "servico_social", profile.role === "admin" ? null : profile.id);

  return (
    <ProfessionalClient
      eventId={event.id}
      serviceType="servico_social"
      professionalId={profile.role === "admin" ? null : profile.id}
      initialEntries={initialEntries}
    />
  );
}
