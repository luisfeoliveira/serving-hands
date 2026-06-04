import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getProfessionalEntries, getForwardedSocialWorkEntries } from "@/lib/queue";
import { SocialWorkClient } from "./social-work-client";

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

  const professionalId = profile.role === "admin" ? null : profile.id;

  const [initialEntries, initialForwardedEntries] = await Promise.all([
    getProfessionalEntries(event.id, "servico_social", professionalId),
    getForwardedSocialWorkEntries(event.id),
  ]);

  return (
    <SocialWorkClient
      eventId={event.id}
      professionalId={professionalId}
      initialEntries={initialEntries}
      initialForwardedEntries={initialForwardedEntries}
    />
  );
}
