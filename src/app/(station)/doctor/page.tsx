import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getProfessionalEntries } from "@/lib/queue";
import { DoctorClient } from "./doctor-client";

export default async function DoctorPage() {
  const [profile, event] = await Promise.all([requireProfile(), getActiveEvent()]);

  if (profile.role !== "medico" && profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  if (!event) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum evento ativo no momento.
      </div>
    );
  }

  const initialEntries = await getProfessionalEntries(event.id, "medicina", profile.role === "admin" ? null : profile.id, "in_progress");

  return (
    <DoctorClient
      eventId={event.id}
      doctorId={profile.role === "admin" ? null : profile.id}
      initialEntries={initialEntries}
    />
  );
}
