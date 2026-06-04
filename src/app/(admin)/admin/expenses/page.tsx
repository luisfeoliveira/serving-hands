import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { getActiveEvent } from "@/lib/event";
import { listExpenses } from "./actions";
import { ExpensesClient } from "./expenses-client";

export default async function ExpensesPage() {
  const event = await getActiveEvent();
  if (!event) {
    await requireProfile();
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum evento ativo no momento.
      </div>
    );
  }

  const [profile, expenses] = await Promise.all([
    requireProfile(),
    listExpenses(event.id),
  ]);
  if (profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  return (
    <ExpensesClient eventId={event.id} initialExpenses={expenses} />
  );
}
