"use server";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DbEvent } from "@/lib/types";

export const getActiveEvent = cache(async (): Promise<DbEvent | null> => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("events")
    .select("*")
    .eq("active", true)
    .single();
  return data ?? null;
});
