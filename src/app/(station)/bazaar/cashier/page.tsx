import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { getBazaarBrowsingEntries } from "@/lib/queue";
import { BazaarCashierClient } from "./bazaar-cashier-client";

export default async function BazaarCashierPage() {
  const profile = await requireProfile();
  if (profile.role !== "bazar_caixa" && profile.role !== "admin") {
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

  const initialEntries = await getBazaarBrowsingEntries(event.id);

  return (
    <BazaarCashierClient
      eventId={event.id}
      initialEntries={initialEntries}
    />
  );
}
