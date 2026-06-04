"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { SERVICE_LABELS } from "@/lib/types";
import type { ServiceType } from "@/lib/types";

export interface ServiceStat {
  label: string;
  value: number;
}

export interface HourStat {
  hour: string; // "HH:00"
  count: number;
}

export interface AgeStat {
  group: string;
  count: number;
}

export interface ExpenseStat {
  category: string;
  total: number;
  itemCount: number;
}

export interface ReportsData {
  totalPeople: number;
  peoplePerService: ServiceStat[];
  avgServicesPerPerson: number;
  avgWaitMinutes: ServiceStat[];
  peakByHour: HourStat[];
  dropoutRate: ServiceStat[];        // value = percentage 0–100
  bazaarAvgItems: number | null;
  bazaarRevenue: { cash: number; pix: number; total: number };
  ageDistribution: AgeStat[];
  avgAge: number | null;
  cestaBasicaCount: number;
  facilitadoresCount: number;
  expenses: ExpenseStat[];
  totalExpenses: number;
  evangelismo: {
    total: number;
    prayer: number;
    conversion: number;
    reconciliation: number;
  };
}

function ageGroup(age: number): string {
  if (age <= 12) return "0–12";
  if (age <= 17) return "13–17";
  if (age <= 30) return "18–30";
  if (age <= 60) return "31–60";
  return "60+";
}

const AGE_GROUPS = ["0–12", "13–17", "18–30", "31–60", "60+"];

export async function getReportsData(eventId: string): Promise<ReportsData> {
  const admin = createAdminClient();

  // Fetch in parallel
  const [
    { data: people },
    { data: registrations },
    { data: bazaarTx },
    { count: cestaBasicaCount },
    { count: facilitadoresCount },
    { data: expenseRows },
    { data: evangelismoRows },
  ] = await Promise.all([
    admin.from("people").select("id, age").eq("event_id", eventId),
    admin
      .from("service_registrations")
      .select("person_id, service_type, status, enqueued_at, started_at")
      .eq("event_id", eventId),
    admin
      .from("bazar_transactions")
      .select("item_count, amount, payment_method")
      .eq("event_id", eventId),
    admin
      .from("service_registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("cesta_basica", true),
    admin
      .from("collaborators")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId),
    admin
      .from("event_expenses")
      .select("category, unit_value, quantity")
      .eq("event_id", eventId),
    admin
      .from("evangelism_records")
      .select("prayer, conversion, reconciliation")
      .eq("event_id", eventId),
  ]);

  const regs = registrations ?? [];
  const persons = people ?? [];
  const tx = bazaarTx ?? [];

  // ── 1. Total unique people ───────────────────────────────────────────────
  const totalPeople = persons.length;

  // ── 2. People per service (distinct person_id, completed or dispensed) ──
  const completedRegs = regs.filter((r) =>
    ["completed", "dispensed"].includes(r.status)
  );
  const servicePersonMap: Record<string, Set<string>> = {};
  for (const r of completedRegs) {
    if (!servicePersonMap[r.service_type]) servicePersonMap[r.service_type] = new Set();
    servicePersonMap[r.service_type].add(r.person_id);
  }
  const peoplePerService: ServiceStat[] = Object.entries(servicePersonMap)
    .map(([st, set]) => ({
      label: SERVICE_LABELS[st as ServiceType] ?? st,
      value: set.size,
    }))
    .sort((a, b) => b.value - a.value);

  // ── 3. Avg services per person ───────────────────────────────────────────
  const perPerson: Record<string, number> = {};
  for (const r of completedRegs) {
    perPerson[r.person_id] = (perPerson[r.person_id] ?? 0) + 1;
  }
  const personCounts = Object.values(perPerson);
  const avgServicesPerPerson =
    personCounts.length > 0
      ? personCounts.reduce((a, b) => a + b, 0) / personCounts.length
      : 0;

  // ── 4. Avg wait time per service (minutes) ───────────────────────────────
  const waitMap: Record<string, number[]> = {};
  for (const r of regs) {
    if (!r.started_at || !r.enqueued_at) continue;
    const mins =
      (new Date(r.started_at).getTime() - new Date(r.enqueued_at).getTime()) /
      60_000;
    if (mins < 0) continue;
    if (!waitMap[r.service_type]) waitMap[r.service_type] = [];
    waitMap[r.service_type].push(mins);
  }
  const avgWaitMinutes: ServiceStat[] = Object.entries(waitMap)
    .map(([st, vals]) => ({
      label: SERVICE_LABELS[st as ServiceType] ?? st,
      value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }))
    .sort((a, b) => b.value - a.value);

  // ── 5. Peak by hour ──────────────────────────────────────────────────────
  const hourMap: Record<string, number> = {};
  for (const r of regs) {
    if (!r.started_at) continue;
    const d = new Date(r.started_at);
    const key = `${String(d.getHours()).padStart(2, "0")}:00`;
    hourMap[key] = (hourMap[key] ?? 0) + 1;
  }
  const peakByHour: HourStat[] = Object.entries(hourMap)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // ── 6. Dropout rate per service ──────────────────────────────────────────
  const totalMap: Record<string, number> = {};
  const abandonedMap: Record<string, number> = {};
  for (const r of regs) {
    totalMap[r.service_type] = (totalMap[r.service_type] ?? 0) + 1;
    if (r.status === "abandoned") {
      abandonedMap[r.service_type] = (abandonedMap[r.service_type] ?? 0) + 1;
    }
  }
  const dropoutRate: ServiceStat[] = Object.entries(totalMap)
    .map(([st, total]) => ({
      label: SERVICE_LABELS[st as ServiceType] ?? st,
      value: total > 0 ? Math.round(((abandonedMap[st] ?? 0) / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // ── 7 & 8. Bazar ─────────────────────────────────────────────────────────
  const bazaarAvgItems =
    tx.length > 0
      ? tx.reduce((a, b) => a + b.item_count, 0) / tx.length
      : null;

  const bazaarRevenue = tx.reduce(
    (acc, t) => {
      const amt = Number(t.amount);
      if (t.payment_method === "cash") acc.cash += amt;
      else if (t.payment_method === "pix") acc.pix += amt;
      acc.total += amt;
      return acc;
    },
    { cash: 0, pix: 0, total: 0 }
  );

  // ── 9. Age distribution ──────────────────────────────────────────────────
  const ageGroupMap: Record<string, number> = {};
  let totalAge = 0;
  for (const p of persons) {
    const g = ageGroup(p.age);
    ageGroupMap[g] = (ageGroupMap[g] ?? 0) + 1;
    totalAge += p.age;
  }
  const ageDistribution: AgeStat[] = AGE_GROUPS.map((g) => ({
    group: g,
    count: ageGroupMap[g] ?? 0,
  }));
  const avgAge = persons.length > 0 ? totalAge / persons.length : null;

  // ── 10. Expenses by category ─────────────────────────────────────────────
  const expenseCatMap: Record<string, { total: number; itemCount: number }> = {};
  for (const e of expenseRows ?? []) {
    const line = Number(e.unit_value) * Number(e.quantity);
    if (!expenseCatMap[e.category]) expenseCatMap[e.category] = { total: 0, itemCount: 0 };
    expenseCatMap[e.category].total += line;
    expenseCatMap[e.category].itemCount += 1;
  }
  const expenses: ExpenseStat[] = Object.entries(expenseCatMap)
    .map(([category, { total, itemCount }]) => ({ category, total, itemCount }))
    .sort((a, b) => b.total - a.total);
  const totalExpenses = expenses.reduce((s, e) => s + e.total, 0);

  // ── 11. Evangelismo ──────────────────────────────────────────────────────
  const evRows = evangelismoRows ?? [];
  const evangelismo = {
    total: evRows.length,
    prayer: evRows.filter((r) => r.prayer).length,
    conversion: evRows.filter((r) => r.conversion).length,
    reconciliation: evRows.filter((r) => r.reconciliation).length,
  };

  return {
    totalPeople,
    peoplePerService,
    avgServicesPerPerson,
    avgWaitMinutes,
    peakByHour,
    dropoutRate,
    bazaarAvgItems,
    bazaarRevenue,
    ageDistribution,
    avgAge,
    cestaBasicaCount: cestaBasicaCount ?? 0,
    facilitadoresCount: facilitadoresCount ?? 0,
    expenses,
    totalExpenses,
    evangelismo,
  };
}
