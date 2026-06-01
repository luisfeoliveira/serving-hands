"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNursingQueue } from "@/hooks/use-nursing-queue";
import { PriorityBadge } from "@/components/queue/priority-badge";
import { AbandonButton } from "@/components/queue/abandon-button";
import { startAttendance } from "@/lib/professional-actions";
import { submitTriage } from "./actions";
import { cn } from "@/lib/utils";
import type { QueueEntry } from "@/lib/types";

const SPECIALTY_OPTIONS = [
  { value: "clinica_geral", label: "Clínica Geral" },
  { value: "cardiologia", label: "Cardiologia" },
  { value: "pneumologia", label: "Pneumologia" },
  { value: "dermatologia", label: "Dermatologia" },
];

// ─── Vitals helpers ───────────────────────────────────────────────────────────

interface VitalsState {
  bp_systolic: string;
  bp_diastolic: string;
  weight: string;
  temperature: string;
}

function parseVitals(v: VitalsState) {
  return {
    bp_systolic: v.bp_systolic ? parseInt(v.bp_systolic) : null,
    bp_diastolic: v.bp_diastolic ? parseInt(v.bp_diastolic) : null,
    weight: v.weight ? parseFloat(v.weight) : null,
    temperature: v.temperature ? parseFloat(v.temperature) : null,
  };
}

// ─── Triage card ──────────────────────────────────────────────────────────────

function TriageCard({
  entry,
  onSuccess,
}: {
  entry: QueueEntry;
  onSuccess: () => void;
}) {
  const [started, setStarted] = useState(!!entry.started_at);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [vitals, setVitals] = useState<VitalsState>({
    bp_systolic: "",
    bp_diastolic: "",
    weight: "",
    temperature: "",
  });
  const [specialty, setSpecialty] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    startTransition(async () => {
      const r = await startAttendance(entry.id);
      if (r.error) toast.error(r.error);
      else setStarted(true);
    });
  }

  const set =
    (field: keyof VitalsState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setVitals((prev) => ({ ...prev, [field]: e.target.value }));

  function submit(action: "dispense" | "forward") {
    startTransition(async () => {
      const r = await submitTriage({
        entryId: entry.id,
        chiefComplaint,
        vitals: parseVitals(vitals),
        action,
        specialty: action === "forward" ? specialty || undefined : undefined,
      });
      if (r.error) {
        toast.error(r.error);
      } else {
        toast.success(
          action === "dispense"
            ? "Paciente dispensado."
            : "Encaminhado ao médico."
        );
        onSuccess();
      }
    });
  }

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
        {entry.chief_complaint && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{entry.chief_complaint}</p>
        )}
      </div>
    </div>
  );

  if (!started) {
    return (
      <div className="rounded-lg border border-border border-l-4 border-l-amber-400 bg-background px-4 py-3 space-y-4">
        {patientHeader}
        <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
          <AbandonButton entryId={entry.id} onAbandoned={onSuccess} />
          <Button
            size="sm"
            onClick={handleStart}
            disabled={isPending}
            className="h-8 px-3 text-xs"
          >
            {isPending ? "…" : "Iniciar triagem"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border border-l-4 border-l-blue-400 bg-background px-4 py-3 space-y-3">
      {/* Patient info */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <span className="text-sm font-bold tabular-nums">{entry.position}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">
              {entry.person.name}
            </span>
            <span className="text-sm text-muted-foreground">
              {entry.person.age} anos
            </span>
            {entry.priority && <PriorityBadge />}
          </div>
          {entry.chief_complaint && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {entry.chief_complaint}
            </p>
          )}
        </div>
      </div>

      {/* Chief complaint */}
      <div className="border-t border-border/50 pt-3 space-y-1.5">
        <Label htmlFor={`complaint-${entry.id}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Queixa principal
        </Label>
        <Textarea
          id={`complaint-${entry.id}`}
          value={chiefComplaint}
          onChange={(e) => setChiefComplaint(e.target.value)}
          placeholder="Descreva a queixa principal do participante…"
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {/* Vitals form */}
      <div className="border-t border-border/50 pt-3 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Medições (opcional)
        </p>

        <div className="space-y-1">
          <Label className="text-xs">Pressão Arterial</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="120"
              value={vitals.bp_systolic}
              onChange={set("bp_systolic")}
              className="h-9 text-sm"
              min={0}
              max={300}
            />
            <span className="text-muted-foreground text-sm">/</span>
            <Input
              type="number"
              placeholder="80"
              value={vitals.bp_diastolic}
              onChange={set("bp_diastolic")}
              className="h-9 text-sm"
              min={0}
              max={200}
            />
            <span className="text-xs text-muted-foreground shrink-0">mmHg</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Peso</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="72"
                value={vitals.weight}
                onChange={set("weight")}
                className="h-9 text-sm"
                step="0.1"
                min={0}
              />
              <span className="text-xs text-muted-foreground shrink-0">kg</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Temperatura</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="36.8"
                value={vitals.temperature}
                onChange={set("temperature")}
                className="h-9 text-sm"
                step="0.1"
                min={30}
                max={45}
              />
              <span className="text-xs text-muted-foreground shrink-0">°C</span>
            </div>
          </div>
        </div>

        {/* Specialty picker */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Especialidade (encaminhamento)
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSpecialty(specialty === opt.value ? "" : opt.value)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md border transition-colors",
                  specialty === opt.value
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
            variant="outline"
            size="sm"
            onClick={() => submit("dispense")}
            disabled={isPending}
            className="h-8 px-3 text-xs"
          >
            {isPending ? "…" : "Dispensar"}
          </Button>
          <Button
            size="sm"
            onClick={() => submit("forward")}
            disabled={isPending}
            className="h-8 px-3 text-xs"
          >
            {isPending ? "…" : "Encaminhar ao médico"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  nurseId: string | null;
  initialEntries: QueueEntry[];
}

export function NursingClient({ eventId, nurseId, initialEntries }: Props) {
  const { entries, refresh } = useNursingQueue(eventId, nurseId, initialEntries);

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
        <TriageCard key={e.id} entry={e} onSuccess={refresh} />
      ))}
    </div>
  );
}
