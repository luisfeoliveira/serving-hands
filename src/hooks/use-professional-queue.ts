"use client";

import { useEffect, useState, useCallback, useTransition, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { QueueEntry, ServiceType } from "@/lib/types";

export function useProfessionalQueue(
  eventId: string,
  serviceType: ServiceType,
  professionalId: string | null,
  initialEntries: QueueEntry[],
  statusOverride?: string
) {
  const [entries, setEntries] = useState<QueueEntry[]>(initialEntries);
  const [isPending, startTransition] = useTransition();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams({ eventId, serviceType });
        if (professionalId) params.set("professionalId", professionalId);
        if (statusOverride) params.set("status", statusOverride);
        const res = await fetch(`/api/queue/professional?${params}`);
        if (!res.ok) return;
        setEntries(await res.json());
      } catch {
        // network error — keep current state
      }
    });
  }, [eventId, serviceType, professionalId, statusOverride]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`professional:${professionalId ?? "admin"}:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_registrations" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
          if (row?.event_id && row.event_id !== eventId) return;
          if (row?.service_type && row.service_type !== serviceType) return;

          if (debounceTimer.current) clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(() => refresh(), 200);
        }
      )
      .subscribe();

    const interval = setInterval(refresh, 10_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [eventId, serviceType, professionalId, refresh]);

  return { entries, isLoading: isPending, refresh };
}
