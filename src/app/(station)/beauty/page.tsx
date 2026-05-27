import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getBeautyEntries } from "@/lib/queue";
import { BeautyClient } from "./beauty-client";

export default async function BeautyPage() {
  const [profile, event] = await Promise.all([requireProfile(), getActiveEvent()]);
  if (profile.role !== "beleza" && profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  if (!event) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum evento ativo no momento.
      </div>
    );
  }

  const initialEntries = await getBeautyEntries(event.id, profile.role === "admin" ? null : profile.id);

  return (
    <BeautyClient
      eventId={event.id}
      professionalId={profile.role === "admin" ? null : profile.id}
      initialEntries={initialEntries}
    />
  );
}
