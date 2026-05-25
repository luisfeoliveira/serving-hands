"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
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

  const refresh = useCallback(() => {
    startTransition(async () => {
      const fresh = await getProfessionalEntries(eventId, "medicina", nurseId);
      setEntries(fresh);
    });
  }, [eventId, nurseId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`nursing:${nurseId}:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_registrations" },
        () => refresh()
      )
      .subscribe();

    const interval = setInterval(refresh, 10_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [eventId, nurseId, refresh]);

  return { entries, isLoading: isPending, refresh };
}
