"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQueueSubscription } from "@/hooks/use-queue-subscription";
import { QueueList } from "@/components/queue/queue-list";
import { QueueRow } from "@/components/queue/queue-row";
import { AbandonButton } from "@/components/queue/abandon-button";
import { createClient } from "@/lib/supabase/client";
import { getCompletedEntries } from "@/lib/queue";
import { ASSIGNMENT_CONFIG, type AssignmentConfig } from "@/lib/service-config";
import { assignToProfessional, callEntry, completeEntry } from "./actions";
import { SERVICE_LABELS } from "@/lib/types";
import { roleLabel } from "@/lib/roles";
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

// ─── Self-managed queue (cabeleireiro, bazar) ─────────────────────────────────

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

const SPECIALTY_LABELS: Record<string, string> = {
  clinica_geral: "Clínica Geral",
  cardiologia: "Cardiologia",
  pneumologia: "Pneumologia",
  dermatologia: "Dermatologia",
};

/** "Médico · Cardiologia", "Cabeleireira · Feminino", "Odontólogo" */
function professionLabel(p: ProfessionalStatus): string {
  const base = roleLabel(p.role);
  if (!p.specialty) return base;
  return `${base} · ${SPECIALTY_LABELS[p.specialty] ?? p.specialty}`;
}

function ProfessionalPicker({
  professionals,
  patientSpecialty,
  onSelect,
  onCancel,
}: {
  professionals: ProfessionalStatus[];
  patientSpecialty?: string | null;
  onSelect: (id: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  // For medicina: filter to matching specialty; fall back to all if none match
  const filtered = patientSpecialty
    ? professionals.filter((p) => !p.specialty || p.specialty === patientSpecialty)
    : professionals;
  const list = filtered.length > 0 ? filtered : professionals;
  const noMatch = patientSpecialty && filtered.length === 0;

  return (
    <div className="mt-1 rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Selecionar profissional
        </p>
        {patientSpecialty && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-medium">
            {SPECIALTY_LABELS[patientSpecialty] ?? patientSpecialty}
          </span>
        )}
      </div>
      {noMatch && (
        <p className="text-xs text-amber-700">
          Nenhum médico com esta especialidade — mostrando todos.
        </p>
      )}
      <div className="space-y-1.5">
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => startTransition(() => onSelect(p.id))}
            disabled={isPending}
            className="w-full text-left rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/60 disabled:opacity-50 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {professionLabel(p)}
              </span>
            </div>
            {p.busy ? (
              <span className="text-xs text-amber-700 font-medium shrink-0">
                ● Atendendo {p.patientName}
              </span>
            ) : (
              <span className="text-xs text-emerald-700 font-medium shrink-0">
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
  config,
  channelSuffix = "",
  initialQueue,
  initialProfessionals,
  label,
  showHistory = true,
  patientSpecialtyFilter,
}: {
  eventId: string;
  serviceType: ServiceType;
  config: Omit<AssignmentConfig, "secondPhase">;
  channelSuffix?: string;
  initialQueue: QueueEntry[];
  initialProfessionals: ProfessionalStatus[];
  label?: string;
  showHistory?: boolean;
  patientSpecialtyFilter?: string;
}) {
  const [queue, setQueue] = useState(initialQueue);
  const [professionals, setProfessionals] = useState(initialProfessionals);
  const [avgDurationMin, setAvgDurationMin] = useState<number | null>(null);
  const [callingEntryId, setCallingEntryId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [, startRefreshTransition] = useTransition();

  const refresh = useCallback(() => {
    startRefreshTransition(async () => {
      try {
        const params = new URLSearchParams({
          eventId,
          serviceType,
          waitingStatus: config.waitingStatus,
          role: config.role,
          busyStatus: config.busyStatus,
        });
        if (patientSpecialtyFilter) params.set("specialtyFilter", patientSpecialtyFilter);
        const res = await fetch(`/api/queue/controller?${params}`);
        if (!res.ok) return;
        const { queue: freshQueue, professionals: freshProfessionals, avgDurationMin: avg } = await res.json();
        setQueue(freshQueue);
        setProfessionals(freshProfessionals);
        if (typeof avg === "number") setAvgDurationMin(avg);
      } catch {
        // network error — keep current state
      }
    });
  }, [eventId, serviceType, config.waitingStatus, config.role, config.busyStatus, patientSpecialtyFilter]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`ctrl:${serviceType}${channelSuffix}:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_registrations" },
        (payload) => {
          // Only refresh for rows relevant to this service type
          const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
          if (row?.event_id && row.event_id !== eventId) return;
          if (row?.service_type && row.service_type !== serviceType) return;

          // Debounce rapid successive events into a single refresh
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
  }, [eventId, serviceType, channelSuffix, refresh]);

  return (
    <div className="space-y-6">
      {label && (
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
          {label}
        </p>
      )}
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
                <p className="text-xs text-muted-foreground">
                  {professionLabel(p)}
                </p>
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
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Aguardando · {queue.length}{" "}
            {queue.length === 1 ? "pessoa" : "pessoas"}
          </p>
          {avgDurationMin !== null && (
            <span className="text-xs text-muted-foreground">
              · ~{avgDurationMin} min/atendimento
            </span>
          )}
        </div>

        {queue.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {isPending ? "Atualizando…" : "Fila vazia."}
            </p>
          </div>
        ) : (
          queue.map((entry, idx) => {
            const estimatedMin = avgDurationMin !== null ? (idx + 1) * avgDurationMin : null;
            const busyElsewhere = entry.active_services && entry.active_services.length > 0;
            const busyLabel = busyElsewhere
              ? entry.active_services!.map((s) => SERVICE_LABELS[s] ?? s).join(", ")
              : null;
            return (
            <div key={entry.id}>
              <QueueRow
                entry={entry}
                waitLabel={estimatedMin !== null ? `~${estimatedMin} min` : undefined}
                actions={
                  callingEntryId === entry.id ? undefined : (
                    <>
                      <AbandonButton entryId={entry.id} onAbandoned={refresh} />
                      {busyElsewhere ? (
                        <span className="text-xs text-amber-700 font-medium px-2 py-1 rounded-md bg-amber-50 border border-amber-200 shrink-0">
                          Em atendimento · {busyLabel}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setCallingEntryId(entry.id)}
                          className="h-8 px-3 text-xs"
                        >
                          Chamar
                        </Button>
                      )}
                    </>
                  )
                }
              />
              {callingEntryId === entry.id && (
                <ProfessionalPicker
                  professionals={professionals}
                  patientSpecialty={entry.medical_specialty}
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
            );
          })
        )}
      </div>

      {showHistory && <HistorySection eventId={eventId} serviceType={serviceType} />}
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

// All medical specialties shown to admin in doctor phase
const ALL_MEDICAL_SPECIALTIES = [
  { value: "clinica_geral",  label: "Clínica Geral" },
  { value: "cardiologia",    label: "Cardiologia" },
  { value: "pneumologia",    label: "Pneumologia" },
  { value: "dermatologia",   label: "Dermatologia" },
];

interface Props {
  eventId: string;
  serviceTypes: ServiceType[];
  controllerSpecialties: string[];
  isAdmin?: boolean;
  initialQueues: Record<string, QueueEntry[]>;
  initialProfessionals: Record<string, ProfessionalStatus[]>;
}

/** Returns the label the controller sees for a service.
 *  medicina + no specialties + not admin = nursing controller → "Enfermagem"
 *  otherwise → normal SERVICE_LABELS value
 */
function getServiceDisplayLabel(st: ServiceType, controllerSpecialties: string[], isAdmin: boolean): string {
  const config = ASSIGNMENT_CONFIG[st];
  if (config?.secondPhase && controllerSpecialties.length === 0 && !isAdmin) return "Enfermagem";
  return SERVICE_LABELS[st];
}

export function ControllerClient({
  eventId,
  serviceTypes,
  controllerSpecialties,
  isAdmin = false,
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
    if (!config) {
      return (
        <ServiceQueue
          eventId={eventId}
          serviceType={st}
          initialEntries={initialQueues[st] ?? []}
        />
      );
    }

    if (config.secondPhase) {
      // Admin: show both nursing and doctor phases
      if (isAdmin && controllerSpecialties.length === 0) {
        return (
          <div className="space-y-8">
            {/* Nursing phase */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                Enfermagem
              </p>
              <AssignmentSection
                eventId={eventId}
                serviceType={st}
                config={config}
                channelSuffix=""
                initialQueue={initialQueues[st] ?? []}
                initialProfessionals={initialProfessionals[st] ?? []}
                showHistory={false}
              />
            </div>
            {/* Doctor phase — tabs per specialty */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                Médico
              </p>
              <Tabs defaultValue={ALL_MEDICAL_SPECIALTIES[0].value}>
                <div className="w-full overflow-x-auto">
                  <TabsList className="min-w-max justify-start">
                    {ALL_MEDICAL_SPECIALTIES.map((spec) => (
                      <TabsTrigger key={spec.value} value={spec.value} className="flex-none">
                        {spec.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {ALL_MEDICAL_SPECIALTIES.map((spec) => (
                  <TabsContent key={spec.value} value={spec.value} className="mt-4 data-hidden:hidden" keepMounted>
                    <AssignmentSection
                      eventId={eventId}
                      serviceType={st}
                      config={config.secondPhase!}
                      channelSuffix={`:${spec.value}`}
                      initialQueue={initialQueues[`${st}:${spec.value}`] ?? []}
                      initialProfessionals={initialProfessionals[`${st}:${spec.value}`] ?? []}
                      patientSpecialtyFilter={spec.value}
                      showHistory={true}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        );
      }

      if (controllerSpecialties.length > 0) {
        // Doctor controller — one section per specialty, tabs when > 1
        if (controllerSpecialties.length === 1) {
          const spec = controllerSpecialties[0];
          return (
            <AssignmentSection
              eventId={eventId}
              serviceType={st}
              config={config.secondPhase}
              channelSuffix={`:${spec}`}
              initialQueue={initialQueues[`${st}:${spec}`] ?? []}
              initialProfessionals={initialProfessionals[`${st}:${spec}`] ?? []}
              patientSpecialtyFilter={spec}
              showHistory={true}
            />
          );
        }
        return (
          <Tabs defaultValue={controllerSpecialties[0]}>
            <div className="w-full overflow-x-auto">
              <TabsList className="min-w-max justify-start">
                {controllerSpecialties.map((spec) => (
                  <TabsTrigger key={spec} value={spec} className="flex-none">
                    {SPECIALTY_LABELS[spec] ?? spec}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {controllerSpecialties.map((spec) => (
              <TabsContent key={spec} value={spec} className="mt-4 data-hidden:hidden" keepMounted>
                <AssignmentSection
                  eventId={eventId}
                  serviceType={st}
                  config={config.secondPhase!}
                  channelSuffix={`:${spec}`}
                  initialQueue={initialQueues[`${st}:${spec}`] ?? []}
                  initialProfessionals={initialProfessionals[`${st}:${spec}`] ?? []}
                  patientSpecialtyFilter={spec}
                  showHistory={true}
                />
              </TabsContent>
            ))}
          </Tabs>
        );
      }
      // Nursing controller → only nursing triage phase
      return (
        <AssignmentSection
          eventId={eventId}
          serviceType={st}
          config={config}
          channelSuffix=""
          initialQueue={initialQueues[st] ?? []}
          initialProfessionals={initialProfessionals[st] ?? []}
          showHistory={false}
        />
      );
    }

    return (
      <AssignmentSection
        eventId={eventId}
        serviceType={st}
        config={config}
        initialQueue={initialQueues[st] ?? []}
        initialProfessionals={initialProfessionals[st] ?? []}
      />
    );
  }

  if (serviceTypes.length === 1) {
    const st = serviceTypes[0];
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {getServiceDisplayLabel(st, controllerSpecialties, isAdmin)}
        </p>
        {renderService(st)}
      </div>
    );
  }

  return (
    <Tabs defaultValue={serviceTypes[0]}>
      <div className="w-full overflow-x-auto">
        <TabsList className="min-w-max justify-start">
          {serviceTypes.map((st) => (
            <TabsTrigger key={st} value={st} className="flex-none">
              {getServiceDisplayLabel(st, controllerSpecialties, isAdmin)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {serviceTypes.map((st) => (
        <TabsContent key={st} value={st} className="mt-4 data-hidden:hidden" keepMounted>
          {renderService(st)}
        </TabsContent>
      ))}
    </Tabs>
  );
}
