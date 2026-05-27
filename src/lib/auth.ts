"use server";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleToPath } from "@/lib/roles";
import type { DbUser } from "@/lib/types";

// ─── Get current volunteer profile ───────────────────────────────────────────
// Wrapped in React.cache — layout + page share one DB round-trip per request.

export const getProfile = cache(async (): Promise<DbUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return data ?? null;
});

// ─── Require auth — use in server components/actions ─────────────────────────
// Redirects to /login if not authenticated or inactive.

export async function requireProfile(): Promise<DbUser> {
  const profile = await getProfile();
  if (!profile || !profile.active) redirect("/login");
  return profile;
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

