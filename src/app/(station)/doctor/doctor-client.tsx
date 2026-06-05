"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useProfessionalQueue } from "@/hooks/use-professional-queue";
import { PriorityBadge } from "@/components/queue/priority-badge";
import { StatusBadge } from "@/components/queue/status-badge";
import { AbandonButton } from "@/components/queue/abandon-button";
import { startAttendance } from "@/lib/professional-actions";
import { completeAppointment } from "./actions";
import { AppointmentHistory } from "@/components/ficha/appointment-history";
import { cn } from "@/lib/utils";
import type { QueueEntry, DbHealthVitals, ProfessionalInfo, EventInfo } from "@/lib/types";

const SPECIALTY_LABELS: Record<string, string> = {
  clinica_geral: "Clínica Geral",
  cardiologia: "Cardiologia",
  pneumologia: "Pneumologia",
  dermatologia: "Dermatologia",
};

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

// ─── Referral options ─────────────────────────────────────────────────────────

const REFERRAL_OPTIONS = [
  { value: "resolved" as const, label: "Resolvido" },
  { value: "sus" as const, label: "Encaminhar SUS" },
  { value: "other" as const, label: "Outro" },
];

// ─── Appointment card ─────────────────────────────────────────────────────────

function AppointmentCard({
  entry,
  professional,
  event,
  onSuccess,
}: {
  entry: QueueEntry;
  professional: ProfessionalInfo;
  event: EventInfo;
  onSuccess: () => void;
}) {
  const [started, setStarted] = useState(!!entry.started_at);
  const [notes, setNotes] = useState("");
  const [referral, setReferral] = useState<"resolved" | "sus" | "other">("resolved");
  const [referralNotes, setReferralNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const patientHeader = (
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
        {entry.medical_specialty && (
          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700 border border-violet-200">
            {SPECIALTY_LABELS[entry.medical_specialty] ?? entry.medical_specialty}
          </span>
        )}
        {entry.chief_complaint && (
          <p className="text-sm text-muted-foreground mt-0.5">{entry.chief_complaint}</p>
        )}
        {entry.vitals && <VitalsSummary vitals={entry.vitals} />}
      </div>
      <StatusBadge status={entry.status} />
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
        ...(referral === "other" && { referral_notes: referralNotes }),
      });
      if (r.error) toast.error(r.error);
      else {
        toast.success("Atendimento concluído.");
        onSuccess();
      }
    });
  }

  return (
    <div className="rounded-lg border border-border border-l-4 border-l-emerald-500 bg-background px-4 py-3 space-y-3">
      {patientHeader}

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
          {referral === "other" && (
            <Textarea
              value={referralNotes}
              onChange={(e) => setReferralNotes(e.target.value)}
              placeholder="Descreva o encaminhamento…"
              rows={2}
              className="text-sm resize-none"
            />
          )}
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

// ─── Main client ──────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  doctorId: string | null;
  initialEntries: QueueEntry[];
  professional: ProfessionalInfo;
  event: EventInfo;
}

export function DoctorClient({ eventId, doctorId, initialEntries, professional, event }: Props) {
  const { entries, refresh } = useProfessionalQueue(
    eventId,
    "medicina",
    doctorId,
    initialEntries,
    "in_progress"
  );

  const historySection = doctorId ? (
    <AppointmentHistory
      eventId={eventId}
      professionalId={doctorId}
      role="medico"
      professional={professional}
      event={event}
    />
  ) : null;

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed border-border py-16 text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Disponível</p>
          <p className="text-sm text-muted-foreground">
            Aguardando atribuição do controlador.
          </p>
        </div>
        {historySection}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <AppointmentCard key={e.id} entry={e} professional={professional} event={event} onSuccess={refresh} />
      ))}
      {historySection}
    </div>
  );
}
