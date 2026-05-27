"use client";

import { useEffect, useState, useCallback, useTransition, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { QueueEntry } from "@/lib/types";

export function useBeautyQueue(
  eventId: string,
  professionalId: string | null,
  initialEntries: QueueEntry[]
) {
  const [entries, setEntries] = useState<QueueEntry[]>(initialEntries);
  const [isPending, startTransition] = useTransition();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams({ eventId });
        if (professionalId) params.set("professionalId", professionalId);
        const res = await fetch(`/api/queue/beauty?${params}`);
        if (!res.ok) return;
        setEntries(await res.json());
      } catch {
        // network error — keep current state
      }
    });
  }, [eventId, professionalId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`beauty:${professionalId ?? "admin"}:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_registrations" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
          if (row?.event_id && row.event_id !== eventId) return;
          const st = row?.service_type as string | undefined;
          if (st && st !== "cabeleireiro" && st !== "sobrancelha" && st !== "estetica") return;

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
  }, [eventId, professionalId, refresh]);

  return { entries, isLoading: isPending, refresh };
}
