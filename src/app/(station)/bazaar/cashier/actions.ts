"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BAZAAR_PRICE_PER_ITEM, BAZAAR_MAX_ITEMS } from "../constants";

export async function completeBazaarSale(input: {
  entryId: string;
  qty: number;
  method: "dinheiro" | "pix";
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

  const total = input.qty * BAZAAR_PRICE_PER_ITEM;

  if (input.method === "dinheiro" && (input.received ?? 0) < total) {
    return { error: "Valor recebido insuficiente." };
  }

  const admin = createAdminClient();

  const { error: apptErr } = await admin.from("appointments").insert({
    service_registration_id: input.entryId,
    data: {
      qty: input.qty,
      total,
      method: input.method,
      ...(input.method === "dinheiro" && input.received != null && {
        received: input.received,
        change: input.received - total,
      }),
    },
    created_by: user.id,
  });
  if (apptErr) return { error: apptErr.message };

  const { error: srErr } = await admin
    .from("service_registrations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    })
    .eq("id", input.entryId);

  if (srErr) return { error: srErr.message };

  revalidatePath("/", "layout");
  return {};
}
