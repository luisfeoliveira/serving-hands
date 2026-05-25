"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppointmentData } from "@/lib/types";

export async function startAttendance(
  entryId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("service_registrations")
    .update({ started_at: new Date().toISOString(), started_by: user.id })
    .eq("id", entryId);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}

export async function completeAppointment(input: {
  entryId: string;
  data: AppointmentData;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const admin = createAdminClient();

  const { error: apptErr } = await admin.from("appointments").insert({
    service_registration_id: input.entryId,
    data: input.data,
    created_by: user.id,
  });
  if (apptErr) return { error: apptErr.message };

  const { error: srErr } = await admin
    .from("service_registrations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: user.id,
      assigned_to: null,
    })
    .eq("id", input.entryId);

  if (srErr) return { error: srErr.message };

  revalidatePath("/", "layout");
  return {};
}
