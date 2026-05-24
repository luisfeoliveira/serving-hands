"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { getQueueEntries } from "@/lib/queue";
import type { QueueEntry, ServiceType } from "@/lib/types";

export function useQueueSubscription(
  eventId: string,
  serviceType: ServiceType,
  initialEntries: QueueEntry[]
) {
  const [entries, setEntries] = useState<QueueEntry[]>(initialEntries);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const fresh = await getQueueEntries(eventId, serviceType);
      setEntries(fresh);
    });
  }, [eventId, serviceType]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`queue:${serviceType}:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_registrations",
          filter: `event_id=eq.${eventId}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, serviceType, refresh]);

  return { entries, isLoading: isPending, refresh };
}
