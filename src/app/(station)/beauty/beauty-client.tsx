"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBeautyQueue } from "@/hooks/use-beauty-queue";
import { PriorityBadge } from "@/components/queue/priority-badge";
import { AbandonButton } from "@/components/queue/abandon-button";
import { startAttendance, completeAppointment } from "@/lib/professional-actions";
import type { QueueEntry, ServiceType } from "@/lib/types";

// ─── Service label badge ──────────────────────────────────────────────────────

const SERVICE_LABELS: Partial<Record<ServiceType, string>> = {
  cabeleireiro: "Cabelereiro",
  sobrancelha: "Design de Sobrancelha",
  estetica: "Estética",
};

const SERVICE_COLORS: Partial<Record<ServiceType, string>> = {
  cabeleireiro: "bg-amber-100 text-amber-700 border-amber-200",
  sobrancelha: "bg-pink-100 text-pink-700 border-pink-200",
  estetica: "bg-purple-100 text-purple-700 border-purple-200",
};

function ServiceBadge({ serviceType }: { serviceType: ServiceType }) {
  const label = SERVICE_LABELS[serviceType] ?? serviceType;
  const color = SERVICE_COLORS[serviceType] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${color}`}>
      {label}
    </span>
  );
}

// ─── Appointment card ─────────────────────────────────────────────────────────

function AppointmentCard({
  entry,
  onSuccess,
}: {
  entry: QueueEntry;
  onSuccess: () => void;
}) {
  const [started, setStarted] = useState(!!entry.started_at);
  const [isPending, startTransition] = useTransition();

  const serviceType = entry.service_type as ServiceType;

  const patientHeader = (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-sm font-bold text-pink-700 tabular-nums leading-none">
          {entry.position}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">{entry.person.name}</span>
          <span className="text-sm text-muted-foreground">{entry.person.age} anos</span>
          {entry.priority && <PriorityBadge />}
        </div>
        <div className="mt-1">
          <ServiceBadge serviceType={serviceType} />
        </div>
      </div>
    </div>
  );

  // ── Not yet started ───────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="rounded-lg border border-border border-l-4 border-l-amber-400 bg-background px-4 py-3 space-y-4">
        {patientHeader}
        <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
          <AbandonButton entryId={entry.id} onAbandoned={onSuccess} />
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              startTransition(async () => {
                const r = await startAttendance(entry.id);
                if (r.error) toast.error(r.error);
                else setStarted(true);
              })
            }
            disabled={isPending}
            className="h-8 px-3 text-xs"
          >
            {isPending ? "…" : "Iniciar atendimento"}
          </Button>
        </div>
      </div>
    );
  }

  // ── In progress ───────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-border border-l-4 border-l-pink-500 bg-background px-4 py-3 space-y-4">
      {patientHeader}
      <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
        <AbandonButton entryId={entry.id} onAbandoned={onSuccess} />
        <Button
          size="sm"
          onClick={() =>
            startTransition(async () => {
              const r = await completeAppointment({ entryId: entry.id, data: {} });
              if (r.error) toast.error(r.error);
              else {
                toast.success("Atendimento concluído.");
                onSuccess();
              }
            })
          }
          disabled={isPending}
          className="h-8 px-3 text-xs"
        >
          {isPending ? "…" : "Concluir atendimento"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  professionalId: string;
  initialEntries: QueueEntry[];
}

export function BeautyClient({ eventId, professionalId, initialEntries }: Props) {
  const { entries, refresh } = useBeautyQueue(eventId, professionalId, initialEntries);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Disponível</p>
        <p className="text-sm text-muted-foreground">
          Aguardando atribuição do controlador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <AppointmentCard key={e.id} entry={e} onSuccess={refresh} />
      ))}
    </div>
  );
}
