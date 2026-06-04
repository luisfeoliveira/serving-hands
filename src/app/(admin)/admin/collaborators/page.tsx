import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { listFacilitadores } from "./actions";
import { FacilitadoresClient } from "./facilitadores-client";

export default async function FacilitadoresPage() {
  const event = await getActiveEvent();
  if (!event) {
    await requireProfile();
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum evento ativo no momento.
      </div>
    );
  }

  const [profile, facilitadores] = await Promise.all([
    requireProfile(),
    listFacilitadores(event.id),
  ]);
  if (profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  return (
    <FacilitadoresClient
      eventId={event.id}
      initialFacilitadores={facilitadores}
    />
  );
}
