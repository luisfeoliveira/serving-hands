"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleToPath } from "@/lib/roles";
export type LoginState = { error: string } | null;

export async function signIn(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  const supabase = await createClient();

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }

  // Use admin client — session cookie hasn't flushed yet at this point in the
  // Server Action, so the regular client would query unauthenticated (RLS blocks).
  // Admin client bypasses RLS safely since this is server-only code.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Perfil não encontrado. Contacte o administrador." };
  }

  if (!profile.active) {
    await supabase.auth.signOut();
    return { error: "Conta inativa. Contacte o administrador." };
  }

  redirect(roleToPath(profile.role));
}
