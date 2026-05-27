import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getBazaarWaitingEntries, getBazaarBrowsingEntries } from "@/lib/queue";
import { BazaarControllerClient } from "./bazaar-controller-client";

export default async function BazaarControllerPage() {
  const [profile, event] = await Promise.all([requireProfile(), getActiveEvent()]);
  if (profile.role !== "bazar_controlador" && profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  if (!event) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum evento ativo no momento.
      </div>
    );
  }

  const [initialWaiting, initialBrowsing] = await Promise.all([
    getBazaarWaitingEntries(event.id),
    getBazaarBrowsingEntries(event.id),
  ]);

  return (
    <BazaarControllerClient
      eventId={event.id}
      initialWaiting={initialWaiting}
      initialBrowsing={initialBrowsing}
    />
  );
}
