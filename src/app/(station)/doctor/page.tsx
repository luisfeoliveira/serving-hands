import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getDoctorEntries } from "@/lib/queue";
import { DoctorClient } from "./doctor-client";

export default async function DoctorPage() {
  const profile = await requireProfile();

  if (profile.role !== "medico" && profile.role !== "admin") {
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

  const initialEntries = await getDoctorEntries(event.id);

  return <DoctorClient eventId={event.id} initialEntries={initialEntries} />;
}
