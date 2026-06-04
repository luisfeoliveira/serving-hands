"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface Facilitador {
  id: string;
  event_id: string;
  name: string;
  role: string;
  created_at: string;
}

export async function listFacilitadores(eventId: string): Promise<Facilitador[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("collaborators")
    .select("id, event_id, name, role, created_at")
    .eq("event_id", eventId)
    .order("name");
  return (data ?? []) as Facilitador[];
}

export async function addFacilitador(input: {
  eventId: string;
  name: string;
  role: string;
}): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Acesso negado." };

  const name = input.name.trim();
  const role = input.role.trim();
  if (!name || !role) return { error: "Nome e função são obrigatórios." };

  const admin = createAdminClient();
  const { error } = await admin.from("collaborators").insert({
    event_id: input.eventId,
    name,
    role,
    created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/collaborators");
  return {};
}

export async function deleteFacilitador(id: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Acesso negado." };

  const admin = createAdminClient();
  const { error } = await admin.from("collaborators").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/collaborators");
  return {};
}
