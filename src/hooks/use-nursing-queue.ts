"use client";

import { useEffect, useState, useCallback, useTransition, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getProfessionalEntries } from "@/lib/queue";
import type { QueueEntry } from "@/lib/types";

export function useNursingQueue(
  eventId: string,
  nurseId: string,
  initialEntries: QueueEntry[]
) {
  const [entries, setEntries] = useState<QueueEntry[]>(initialEntries);
  const [isPending, startTransition] = useTransition();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const fresh = await getProfessionalEntries(eventId, "medicina", nurseId);
      setEntries(fresh);
    });
  }, [eventId, nurseId]);

  useEffect(() => {
    refresh();

    const supabase = createClient();
    const channel = supabase
      .channel(`nursing:${nurseId}:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_registrations" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
          if (row?.event_id && row.event_id !== eventId) return;

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
  }, [eventId, nurseId, refresh]);

  return { entries, isLoading: isPending, refresh };
}
