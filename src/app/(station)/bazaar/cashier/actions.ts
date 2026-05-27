"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BAZAAR_PRICE_PER_ITEM, BAZAAR_MAX_ITEMS } from "../constants";

export async function completeBazaarSale(input: {
  entryId: string;        // service_registration id
  personId: string;       // people id
  eventId: string;
  qty: number;
  method: "cash" | "pix";
  received?: number;
}): Promise<{ error?: string }> {
  if (input.qty < 1 || input.qty > BAZAAR_MAX_ITEMS) {
    return { error: `Quantidade deve ser entre 1 e ${BAZAAR_MAX_ITEMS}.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const amount = input.qty * BAZAAR_PRICE_PER_ITEM;

  if (input.method === "cash" && (input.received ?? 0) < amount) {
    return { error: "Valor recebido insuficiente." };
  }

  const admin = createAdminClient();

  const { error: txErr } = await admin.from("bazar_transactions").insert({
    event_id: input.eventId,
    person_id: input.personId,
    item_count: input.qty,
    amount,
    payment_method: input.method,
    processed_by: user.id,
  });
  if (txErr) return { error: txErr.message };

  const { error: srErr } = await admin
    .from("service_registrations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    })
    .eq("id", input.entryId);

  if (srErr) return { error: srErr.message };

  return {};
}
