"use client";

import { useState, useCallback, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProfessionalQueue } from "@/hooks/use-professional-queue";
import { ProfessionalClient } from "@/components/professional/professional-client";
import { PriorityBadge } from "@/components/queue/priority-badge";
import { AbandonButton } from "@/components/queue/abandon-button";
import { claimForwardedEntry } from "@/lib/professional-actions";
import { createClient } from "@/lib/supabase/client";
import type { QueueEntry } from "@/lib/types";

// ─── Forwarded entry card ─────────────────────────────────────────────────────

function ForwardedEntryCard({
  entry,
  onClaimed,
}: {
  entry: QueueEntry;
  onClaimed: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClaim() {
    startTransition(async () => {
      const r = await claimForwardedEntry(entry.id);
      if (r.error) toast.error(r.error);
      else {
        toast.success("Atendimento iniciado.");
        onClaimed();
      }
    });
  }

  return (
    <div className="rounded-lg border border-border border-l-4 border-l-violet-400 bg-background px-4 py-3 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-sm font-bold text-violet-700 tabular-nums leading-none">
            {entry.position}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{entry.person.name}</span>
            <span className="text-sm text-muted-foreground">{entry.person.age} anos</span>
            {entry.priority && <PriorityBadge />}
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-medium">
              Enc. pela Psicologia
            </span>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
        <AbandonButton entryId={entry.id} onAbandoned={onClaimed} />
        <Button
          size="sm"
          onClick={handleClaim}
          disabled={isPending}
          className="h-8 px-3 text-xs"
        >
          {isPending ? "…" : "Iniciar atendimento"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  professionalId: string | null;
  initialEntries: QueueEntry[];
  initialForwardedEntries: QueueEntry[];
}

export function SocialWorkClient({
  eventId,
  professionalId,
  initialEntries,
  initialForwardedEntries,
}: Props) {
  const [forwarded, setForwarded] = useState<QueueEntry[]>(initialForwardedEntries);
  const [, startTransition] = useTransition();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshForwarded = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/queue/forwarded-social?eventId=${eventId}`);
        if (!res.ok) return;
        setForwarded(await res.json());
      } catch {
        // keep current state
      }
    });
  }, [eventId]);

  // Realtime subscription for forwarded entries
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`forwarded-social:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_registrations" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
          if (row?.event_id && row.event_id !== eventId) return;
          if (row?.service_type && row.service_type !== "servico_social") return;
          if (debounceTimer.current) clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(() => refreshForwarded(), 200);
        }
      )
      .subscribe();

    const interval = setInterval(refreshForwarded, 10_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [eventId, refreshForwarded]);

  return (
    <div className="space-y-6">
      {forwarded.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
            Encaminhados pela Psicologia · {forwarded.length}
          </p>
          {forwarded.map((entry) => (
            <ForwardedEntryCard
              key={entry.id}
              entry={entry}
              onClaimed={refreshForwarded}
            />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {forwarded.length > 0 && (
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
            Seus atendimentos
          </p>
        )}
        <ProfessionalClient
          eventId={eventId}
          serviceType="servico_social"
          professionalId={professionalId}
          initialEntries={initialEntries}
        />
      </div>
    </div>
  );
}
