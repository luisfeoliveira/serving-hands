import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getProfessionalEntries } from "@/lib/queue";
import { NursingClient } from "./nursing-client";

export default async function NursingPage() {
  const profile = await requireProfile();

  if (profile.role !== "enfermagem" && profile.role !== "admin") {
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

  const initialEntries = await getProfessionalEntries(event.id, "medicina", profile.id);

  return (
    <NursingClient
      eventId={event.id}
      nurseId={profile.id}
      initialEntries={initialEntries}
    />
  );
}
