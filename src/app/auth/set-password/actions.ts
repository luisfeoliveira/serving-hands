"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleToPath } from "@/lib/roles";

export type SetPasswordState = { error: string } | null;

export async function setPassword(
  _prev: SetPasswordState,
  formData: FormData
): Promise<SetPasswordState> {
  const name     = ((formData.get("name") as string) ?? "").trim();
  const password = (formData.get("password") as string) ?? "";
  const confirm  = (formData.get("confirm") as string) ?? "";

  if (!name)
    return { error: "Preencha seu nome." };
  if (password.length < 8)
    return { error: "Senha deve ter ao menos 8 caracteres." };
  if (password !== confirm)
    return { error: "As senhas não coincidem." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ password });

  if (error || !data.user)
    return { error: error?.message ?? "updateUser returned no user" };

  const admin = createAdminClient();

  // Save name + fetch role/active in parallel
  const [, { data: profile }] = await Promise.all([
    admin.from("users").update({ name }).eq("id", data.user.id),
    admin.from("users").select("role, active").eq("id", data.user.id).single(),
  ]);

  if (!profile?.active)
    return { error: "Conta inativa. Contacte o administrador." };

  redirect(roleToPath(profile.role));
}
