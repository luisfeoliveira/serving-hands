"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDoctorEntries } from "@/lib/queue";
import type { QueueEntry } from "@/lib/types";

export function useDoctorQueue(eventId: string, initialEntries: QueueEntry[]) {
  const [entries, setEntries] = useState<QueueEntry[]>(initialEntries);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const fresh = await getDoctorEntries(eventId);
      setEntries(fresh);
    });
  }, [eventId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`doctor:${eventId}`)
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
  }, [eventId, refresh]);

  return { entries, isLoading: isPending, refresh };
}
