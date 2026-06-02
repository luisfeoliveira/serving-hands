import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { SettingsClient } from "./settings-client";

export default async function ConfiguracoesPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect(roleToPath(profile.role));

  const event = await getActiveEvent();
  if (!event) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhum evento ativo no momento.
      </div>
    );
  }

  return (
    <SettingsClient
      eventId={event.id}
      initialLimits={event.service_limits ?? {}}
    />
  );
}
