"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQueueSubscription } from "@/hooks/use-queue-subscription";
import { QueueList } from "@/components/queue/queue-list";
import { QueueRow } from "@/components/queue/queue-row";
import { AbandonButton } from "@/components/queue/abandon-button";
import { getCompletedEntries } from "@/lib/queue";
import { callEntry, completeEntry } from "./actions";
import { SERVICE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ServiceType, QueueEntry } from "@/lib/types";

// ─── Action buttons ───────────────────────────────────────────────────────────

function CallButton({
  entryId,
  onSuccess,
}: {
  entryId: string;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      onClick={() =>
        startTransition(async () => {
          const r = await callEntry(entryId);
          if (r.error) toast.error(r.error);
          else onSuccess?.();
        })
      }
      disabled={isPending}
      className="h-8 px-3 text-xs"
    >
      {isPending ? "…" : "Chamar"}
    </Button>
  );
}

function CompleteButton({
  entryId,
  onSuccess,
}: {
  entryId: string;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() =>
        startTransition(async () => {
          const r = await completeEntry(entryId);
          if (r.error) toast.error(r.error);
          else onSuccess?.();
        })
      }
      disabled={isPending}
      className="h-8 px-3 text-xs"
    >
      {isPending ? "…" : "Concluir"}
    </Button>
  );
}

// ─── History section (load on demand) ────────────────────────────────────────

function HistorySection({
  eventId,
  serviceType,
}: {
  eventId: string;
  serviceType: ServiceType;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    if (!loaded) {
      setOpen(true);
      startTransition(async () => {
        const data = await getCompletedEntries(eventId, serviceType);
        setEntries(data);
        setLoaded(true);
      });
    } else {
      setOpen((v) => !v);
    }
  }

  return (
    <div className="mt-6 pt-4 border-t border-border/50">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
        {open ? "Ocultar histórico" : "Ver histórico de atendimentos"}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {isPending && (
            <p className="text-xs text-muted-foreground">Carregando…</p>
          )}
          {!isPending && entries.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum atendimento concluído ainda.
            </p>
          )}
          {!isPending &&
            entries.map((entry) => (
              <QueueRow key={entry.id} entry={entry} />
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Single-service queue with realtime ──────────────────────────────────────

function ServiceQueue({
  eventId,
  serviceType,
  initialEntries,
}: {
  eventId: string;
  serviceType: ServiceType;
  initialEntries: QueueEntry[];
}) {
  const { entries, isLoading, refresh } = useQueueSubscription(
    eventId,
    serviceType,
    initialEntries
  );

  return (
    <>
      <QueueList
        entries={entries}
        isLoading={isLoading}
        renderActions={(entry) => (
          <>
            <AbandonButton entryId={entry.id} onAbandoned={refresh} />
            {entry.status === "waiting" && (
              <CallButton entryId={entry.id} onSuccess={refresh} />
            )}
            {entry.status === "in_progress" && (
              <CompleteButton entryId={entry.id} onSuccess={refresh} />
            )}
          </>
        )}
      />
      <HistorySection eventId={eventId} serviceType={serviceType} />
    </>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

interface Props {
  eventId: string;
  serviceTypes: ServiceType[];
  initialQueues: Record<string, QueueEntry[]>;
}

export function ControllerClient({
  eventId,
  serviceTypes,
  initialQueues,
}: Props) {
  if (!serviceTypes.length) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Nenhum serviço atribuído a este controlador.
        <br />
        Contacte o administrador.
      </div>
    );
  }

  if (serviceTypes.length === 1) {
    const st = serviceTypes[0];
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {SERVICE_LABELS[st]}
        </p>
        <ServiceQueue
          eventId={eventId}
          serviceType={st}
          initialEntries={initialQueues[st] ?? []}
        />
      </div>
    );
  }

  return (
    <Tabs defaultValue={serviceTypes[0]}>
      <TabsList className="w-full overflow-x-auto">
        {serviceTypes.map((st) => (
          <TabsTrigger key={st} value={st} className="flex-1 min-w-max">
            {SERVICE_LABELS[st]}
          </TabsTrigger>
        ))}
      </TabsList>

      {serviceTypes.map((st) => (
        <TabsContent key={st} value={st} className="mt-4">
          <ServiceQueue
            eventId={eventId}
            serviceType={st}
            initialEntries={initialQueues[st] ?? []}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
