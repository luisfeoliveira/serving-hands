"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole, ServiceType, DbUser } from "@/lib/types";

export async function inviteUser(input: {
  name: string;
  email: string;
  role: UserRole;
  service_types?: ServiceType[] | null;
  medical_specialty?: string | null;
  medical_specialties?: string[] | null;
}): Promise<{ error?: string }> {
  const admin = createAdminClient();

  // Creates auth user + sends invite email; trigger auto-creates users row with name from metadata
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const { data, error: authError } = await admin.auth.admin.inviteUserByEmail(
    input.email,
    {
      data: { name: input.name },
      redirectTo: `${siteUrl}/auth/confirm`,
    }
  );
  if (authError) return { error: authError.message };
  if (!data.user) return { error: "Erro ao criar conta." };

  // Upsert: handles trigger-race (trigger may fire before or after this runs)
  const { error } = await admin
    .from("users")
    .upsert({
      id: data.user.id,
      name: input.name,
      role: input.role,
      service_types: input.service_types?.length ? input.service_types : null,
      medical_specialty: input.medical_specialty || null,
      medical_specialties: input.medical_specialties?.length ? input.medical_specialties : null,
      active: true,
    }, { onConflict: "id" });

  if (error) return { error: error.message };
  revalidatePath("/admin/usuarios");
  return {};
}

export interface UserWithEmail extends DbUser {
  email: string;
}

export async function listUsers(): Promise<UserWithEmail[]> {
  const admin = createAdminClient();

  const [{ data: profiles }, { data: authData }] = await Promise.all([
    admin.from("users").select("*").order("name"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailMap: Record<string, string> = {};
  for (const u of authData?.users ?? []) {
    emailMap[u.id] = u.email ?? "";
  }

  return (profiles ?? []).map((p) => ({
    ...(p as DbUser),
    email: emailMap[p.id] ?? "",
  }));
}

export async function updateUser(input: {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
  service_types: ServiceType[] | null;
  medical_specialty: string | null;
  medical_specialties?: string[] | null;
  registration_number?: string | null;
}): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("users")
    .update({
      name: input.name,
      role: input.role,
      active: input.active,
      service_types: input.service_types?.length ? input.service_types : null,
      medical_specialty: input.medical_specialty || null,
      medical_specialties: input.medical_specialties?.length ? input.medical_specialties : null,
      registration_number: input.registration_number || null,
    })
    .eq("id", input.id);

  if (error) return { error: error.message };
  revalidatePath("/admin/usuarios");
  return {};
}
