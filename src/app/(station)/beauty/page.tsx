import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getBeautyEntries } from "@/lib/queue";
import { BeautyClient } from "./beauty-client";

export default async function BeautyPage() {
  const profile = await requireProfile();
  if (profile.role !== "beleza" && profile.role !== "admin") {
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

  const initialEntries = await getBeautyEntries(event.id, profile.id);

  return (
    <BeautyClient
      eventId={event.id}
      professionalId={profile.id}
      initialEntries={initialEntries}
    />
  );
}
