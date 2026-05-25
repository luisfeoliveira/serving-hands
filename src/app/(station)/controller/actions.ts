"use server";

import { createClient } from "@/lib/supabase/server";
import { updateEntryStatus } from "@/lib/queue";

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function assignToProfessional(
  entryId: string,
  professionalId: string,
  targetStatus: string
): Promise<{ error?: string }> {
  return updateEntryStatus(entryId, targetStatus, {
    assigned_to: professionalId,
  });
}

export async function callEntry(entryId: string): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Não autenticado." };

  return updateEntryStatus(entryId, "in_progress", {
    started_at: new Date().toISOString(),
    started_by: userId,
  });
}

export async function completeEntry(
  entryId: string
): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Não autenticado." };

  return updateEntryStatus(entryId, "completed", {
    completed_at: new Date().toISOString(),
    completed_by: userId,
  });
}
