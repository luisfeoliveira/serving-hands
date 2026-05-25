"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useDoctorQueue } from "@/hooks/use-doctor-queue";
import { QueueRow } from "@/components/queue/queue-row";
import { PriorityBadge } from "@/components/queue/priority-badge";
import { StatusBadge } from "@/components/queue/status-badge";
import { AbandonButton } from "@/components/queue/abandon-button";
import { callPatient, completeAppointment } from "./actions";
import { cn } from "@/lib/utils";
import type { QueueEntry, DbHealthVitals } from "@/lib/types";

// ─── Vitals summary strip ─────────────────────────────────────────────────────

function VitalsSummary({ vitals }: { vitals: DbHealthVitals }) {
  const parts: string[] = [];
  if (vitals.bp_systolic && vitals.bp_diastolic)
    parts.push(`PA ${vitals.bp_systolic}/${vitals.bp_diastolic}`);
  if (vitals.blood_glucose) parts.push(`Gli ${vitals.blood_glucose} mg/dL`);
  if (vitals.weight) parts.push(`${vitals.weight} kg`);
  if (vitals.temperature) parts.push(`${vitals.temperature} °C`);

  if (!parts.length) return null;

  return (
    <p className="text-xs text-muted-foreground mt-1 font-mono">
      {parts.join(" · ")}
    </p>
  );
}

// ─── Call patient button ──────────────────────────────────────────────────────

function CallButton({
  entryId,
  onSuccess,
}: {
  entryId: string;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      onClick={() =>
        startTransition(async () => {
          const r = await callPatient(entryId);
          if (r.error) toast.error(r.error);
          else onSuccess();
        })
      }
      disabled={isPending}
      className="h-8 px-3 text-xs"
    >
      {isPending ? "…" : "Chamar"}
    </Button>
  );
}

// ─── Referral options ─────────────────────────────────────────────────────────

const REFERRAL_OPTIONS = [
  { value: "resolved" as const, label: "Resolvido" },
  { value: "sus" as const, label: "Encaminhar SUS" },
  { value: "return" as const, label: "Retorno" },
];

// ─── Active appointment card ──────────────────────────────────────────────────

function AppointmentCard({
  entry,
  onSuccess,
}: {
  entry: QueueEntry;
  onSuccess: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [referral, setReferral] = useState<"resolved" | "sus" | "return">("resolved");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!notes.trim()) {
      toast.error("Preencha as observações.");
      return;
    }
    startTransition(async () => {
      const r = await completeAppointment({
        entryId: entry.id,
        notes,
        referral,
      });
      if (r.error) toast.error(r.error);
      else {
        toast.success("Atendimento concluído.");
        onSuccess();
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <span className="text-sm font-bold tabular-nums">{entry.position}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{entry.person.name}</span>
            <span className="text-sm text-muted-foreground">{entry.person.age} anos</span>
            {entry.priority && <PriorityBadge />}
          </div>
          {entry.chief_complaint && (
            <p className="text-sm text-muted-foreground mt-0.5">{entry.chief_complaint}</p>
          )}
          {entry.vitals && <VitalsSummary vitals={entry.vitals} />}
        </div>
        <StatusBadge status={entry.status} />
      </div>

      {/* Appointment form */}
      <div className="border-t border-border/50 pt-3 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Observações
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anotações do atendimento…"
            rows={3}
            className="text-sm resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Encaminhamento
          </Label>
          <div className="flex gap-2 flex-wrap">
            {REFERRAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setReferral(opt.value)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md border transition-colors",
                  referral === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted/40 text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
          <AbandonButton entryId={entry.id} onAbandoned={onSuccess} />
          <Button
            size="sm"
            onClick={submit}
            disabled={isPending || !notes.trim()}
            className="h-8 px-3 text-xs"
          >
            {isPending ? "…" : "Concluir atendimento"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Waiting row (waiting_medico) — shows vitals if available ─────────────────

function WaitingRow({
  entry,
  onSuccess,
}: {
  entry: QueueEntry;
  onSuccess: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-sm font-bold tabular-nums">{entry.position}</span>
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{entry.person.name}</span>
            <span className="text-sm text-muted-foreground">{entry.person.age} anos</span>
            {entry.priority && <PriorityBadge />}
          </div>
          {entry.chief_complaint && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {entry.chief_complaint}
            </p>
          )}
          {entry.vitals && <VitalsSummary vitals={entry.vitals} />}
        </div>
        <StatusBadge status={entry.status} />
      </div>
      <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
        <AbandonButton entryId={entry.id} onAbandoned={onSuccess} />
        <CallButton entryId={entry.id} onSuccess={onSuccess} />
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  initialEntries: QueueEntry[];
}

export function DoctorClient({ eventId, initialEntries }: Props) {
  const { entries, isLoading, refresh } = useDoctorQueue(eventId, initialEntries);

  const active = entries.filter((e) => e.status === "in_progress");
  const waiting = entries.filter((e) => e.status === "waiting_medico");

  return (
    <div className="space-y-6">
      {/* In appointment now */}
      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Em atendimento
          </p>
          {active.map((e) => (
            <AppointmentCard key={e.id} entry={e} onSuccess={refresh} />
          ))}
        </div>
      )}

      {/* Waiting for doctor */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Aguardando médico · {waiting.length}{" "}
          {waiting.length === 1 ? "pessoa" : "pessoas"}
        </p>

        {waiting.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Carregando…" : "Nenhum paciente aguardando."}
            </p>
          </div>
        ) : (
          waiting.map((e) => (
            <WaitingRow key={e.id} entry={e} onSuccess={refresh} />
          ))
        )}
      </div>
    </div>
  );
}
