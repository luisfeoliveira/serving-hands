"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQueueSubscription } from "@/hooks/use-queue-subscription";
import { QueueList } from "@/components/queue/queue-list";
import { QueueRow } from "@/components/queue/queue-row";
import { AbandonButton } from "@/components/queue/abandon-button";
import { createClient } from "@/lib/supabase/client";
import {
  getControllerEntries,
  getProfessionalStatuses,
  getCompletedEntries,
} from "@/lib/queue";
import { ASSIGNMENT_CONFIG } from "@/lib/service-config";
import { assignToProfessional, callEntry, completeEntry } from "./actions";
import { SERVICE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ServiceType, QueueEntry, ProfessionalStatus } from "@/lib/types";
import { useEffect } from "react";

// ─── Generic action buttons ───────────────────────────────────────────────────

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

// ─── History section ──────────────────────────────────────────────────────────

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
        // For medicina: also show patients forwarded to doctor (still active there)
        const extra = serviceType === "medicina" ? ["waiting_medico", "in_progress"] : [];
        const data = await getCompletedEntries(eventId, serviceType, extra);
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
            entries.map((entry) => <QueueRow key={entry.id} entry={entry} />)}
        </div>
      )}
    </div>
  );
}

// ─── Self-managed queue (cabelereiro, bazar) ──────────────────────────────────

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

// ─── Professional picker ──────────────────────────────────────────────────────

function ProfessionalPicker({
  professionals,
  onSelect,
  onCancel,
}: {
  professionals: ProfessionalStatus[];
  onSelect: (id: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-1 rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Selecionar profissional
      </p>
      <div className="space-y-1.5">
        {professionals.map((p) => (
          <button
            key={p.id}
            onClick={() => startTransition(() => onSelect(p.id))}
            disabled={isPending}
            className="w-full text-left rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/60 disabled:opacity-50 flex items-center justify-between"
          >
            <span className="font-medium">{p.name}</span>
            {p.busy ? (
              <span className="text-xs text-amber-700 font-medium">
                ● Atendendo {p.patientName}
              </span>
            ) : (
              <span className="text-xs text-emerald-700 font-medium">
                ● Disponível
              </span>
            )}
          </button>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        disabled={isPending}
        className="h-7 text-xs"
      >
        Cancelar
      </Button>
    </div>
  );
}

// ─── Assignment-based controller section ─────────────────────────────────────

function AssignmentSection({
  eventId,
  serviceType,
  initialQueue,
  initialProfessionals,
}: {
  eventId: string;
  serviceType: ServiceType;
  initialQueue: QueueEntry[];
  initialProfessionals: ProfessionalStatus[];
}) {
  const config = ASSIGNMENT_CONFIG[serviceType]!;
  const [queue, setQueue] = useState(initialQueue);
  const [professionals, setProfessionals] = useState(initialProfessionals);
  const [callingEntryId, setCallingEntryId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [, startRefreshTransition] = useTransition();

  const refresh = useCallback(() => {
    startRefreshTransition(async () => {
      const [freshQueue, freshProfessionals] = await Promise.all([
        getControllerEntries(eventId, serviceType),
        getProfessionalStatuses(eventId, config.role, config.busyStatus),
      ]);
      setQueue(freshQueue);
      setProfessionals(freshProfessionals);
    });
  }, [eventId, serviceType, config.role, config.busyStatus]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`ctrl:${serviceType}:${eventId}`)
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
  }, [eventId, serviceType, refresh]);

  return (
    <div className="space-y-6">
      {/* Professional roster */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Profissionais · {professionals.length}
        </p>
        {professionals.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum profissional ativo cadastrado.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {professionals.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "rounded-md border px-3 py-2",
                  p.busy
                    ? "border-amber-300 bg-amber-50"
                    : "border-emerald-300 bg-emerald-50"
                )}
              >
                <p className="text-sm font-medium">{p.name}</p>
                <p className={cn("text-xs font-medium", p.busy ? "text-amber-700" : "text-emerald-700")}>
                  {p.busy ? `● Atendendo ${p.patientName}` : "● Disponível"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waiting queue */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Aguardando · {queue.length}{" "}
          {queue.length === 1 ? "pessoa" : "pessoas"}
        </p>

        {queue.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {isPending ? "Atualizando…" : "Fila vazia."}
            </p>
          </div>
        ) : (
          queue.map((entry) => (
            <div key={entry.id}>
              <QueueRow
                entry={entry}
                actions={
                  callingEntryId === entry.id ? undefined : (
                    <>
                      <AbandonButton entryId={entry.id} onAbandoned={refresh} />
                      <Button
                        size="sm"
                        onClick={() => setCallingEntryId(entry.id)}
                        className="h-8 px-3 text-xs"
                      >
                        Chamar
                      </Button>
                    </>
                  )
                }
              />
              {callingEntryId === entry.id && (
                <ProfessionalPicker
                  professionals={professionals}
                  onSelect={async (professionalId) => {
                    const r = await assignToProfessional(
                      entry.id,
                      professionalId,
                      config.targetStatus
                    );
                    if (r.error) toast.error(r.error);
                    else {
                      setCallingEntryId(null);
                      refresh();
                    }
                  }}
                  onCancel={() => setCallingEntryId(null)}
                />
              )}
            </div>
          ))
        )}
      </div>

      <HistorySection eventId={eventId} serviceType={serviceType} />
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  serviceTypes: ServiceType[];
  initialQueues: Record<string, QueueEntry[]>;
  initialProfessionals: Record<string, ProfessionalStatus[]>;
}

export function ControllerClient({
  eventId,
  serviceTypes,
  initialQueues,
  initialProfessionals,
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

  function renderService(st: ServiceType) {
    const config = ASSIGNMENT_CONFIG[st];
    if (config) {
      return (
        <AssignmentSection
          eventId={eventId}
          serviceType={st}
          initialQueue={initialQueues[st] ?? []}
          initialProfessionals={initialProfessionals[st] ?? []}
        />
      );
    }
    return (
      <ServiceQueue
        eventId={eventId}
        serviceType={st}
        initialEntries={initialQueues[st] ?? []}
      />
    );
  }

  if (serviceTypes.length === 1) {
    const st = serviceTypes[0];
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {SERVICE_LABELS[st]}
        </p>
        {renderService(st)}
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
          {renderService(st)}
        </TabsContent>
      ))}
    </Tabs>
  );
}
