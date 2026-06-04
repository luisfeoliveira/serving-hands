"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ExpenseCategory } from "./categories";

export interface Expense {
  id: string;
  event_id: string;
  category: ExpenseCategory;
  item: string;
  unit_value: number;
  quantity: number;
  created_at: string;
}

export async function listExpenses(eventId: string): Promise<Expense[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("event_expenses")
    .select("id, event_id, category, item, unit_value, quantity, created_at")
    .eq("event_id", eventId)
    .order("category")
    .order("created_at");
  return (data ?? []) as Expense[];
}

export async function addExpense(input: {
  eventId: string;
  category: ExpenseCategory;
  item: string;
  unitValue: number;
  quantity: number;
}): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Acesso negado." };

  const item = input.item.trim();
  if (!item) return { error: "Descrição do item é obrigatória." };
  if (input.unitValue <= 0) return { error: "Valor deve ser maior que zero." };
  if (input.quantity < 1) return { error: "Quantidade deve ser ao menos 1." };

  const admin = createAdminClient();
  const { error } = await admin.from("event_expenses").insert({
    event_id: input.eventId,
    category: input.category,
    item,
    unit_value: input.unitValue,
    quantity: input.quantity,
    created_by: profile.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/expenses");
  return {};
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Acesso negado." };

  const admin = createAdminClient();
  const { error } = await admin.from("event_expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/expenses");
  return {};
}
