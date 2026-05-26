"use client";

import { useEffect, useState, useCallback, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getBazaarWaitingEntries, getBazaarBrowsingEntries } from "@/lib/queue";
import { PriorityBadge } from "@/components/queue/priority-badge";
import { callBazaarEntry } from "./actions";
import type { QueueEntry } from "@/lib/types";

// ─── Queue row ────────────────────────────────────────────────────────────────

function WaitingRow({
  entry,
  onCalled,
}: {
  entry: QueueEntry;
  onCalled: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background">
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
        <span className="text-xs font-bold tabular-nums">{entry.position}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground">{entry.person.name}</span>
          <span className="text-xs text-muted-foreground">{entry.person.age} anos</span>
          {entry.priority && <PriorityBadge />}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          startTransition(async () => {
            const r = await callBazaarEntry(entry.id);
            if (r.error) toast.error(r.error);
            else onCalled();
          })
        }
        disabled={isPending}
        className="h-7 px-2.5 text-xs shrink-0"
      >
        {isPending ? "…" : "Chamar"}
      </Button>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  initialWaiting: QueueEntry[];
  initialBrowsing: QueueEntry[];
}

export function BazaarControllerClient({
  eventId,
  initialWaiting,
  initialBrowsing,
}: Props) {
  const [waiting, setWaiting] = useState<QueueEntry[]>(initialWaiting);
  const [browsing, setBrowsing] = useState<QueueEntry[]>(initialBrowsing);
  const [, startTransition] = useTransition();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const [w, b] = await Promise.all([
        getBazaarWaitingEntries(eventId),
        getBazaarBrowsingEntries(eventId),
      ]);
      setWaiting(w);
      setBrowsing(b);
    });
  }, [eventId]);

  useEffect(() => {
    refresh();

    const supabase = createClient();
    const channel = supabase
      .channel(`bazaar-controller:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_registrations" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
          if (row?.event_id && row.event_id !== eventId) return;
          if (row?.service_type !== "bazar") return;

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
  }, [eventId, refresh]);

  return (
    <div className="space-y-6">
      {/* Browsing count chip */}
      {browsing.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {browsing.length} {browsing.length === 1 ? "pessoa no bazar" : "pessoas no bazar"}
          </span>
        </div>
      )}

      {/* Waiting queue */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Fila de espera
        </p>
        {waiting.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma pessoa aguardando.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {waiting.map((e) => (
              <WaitingRow key={e.id} entry={e} onCalled={refresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
