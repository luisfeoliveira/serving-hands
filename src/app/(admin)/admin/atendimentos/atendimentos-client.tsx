"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PersonJourney, ServiceRow } from "./page";
import type { ServiceType } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  waiting:             "Aguardando",
  waiting_nursing:     "Ag. Enfermagem",
  nursing_in_progress: "Enfermagem",
  waiting_medico:      "Ag. Médico",
  in_progress:         "Em atendimento",
  completed:           "Concluído",
  dispensed:           "Dispensado",
  abandoned:           "Abandonado",
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

const SPECIALTY_LABEL: Record<string, string> = {
  clinica_geral: "Clínica Geral",
  cardiologia:   "Cardiologia",
  pneumologia:   "Pneumologia",
  dermatologia:  "Dermatologia",
};

function ServicePill({ s, labels }: { s: ServiceRow; labels: Record<string, string> }) {
  const isOpen = !["completed", "abandoned", "dispensed"].includes(s.status);
  const label = labels[s.serviceType] ?? s.serviceType;
  const specialty = s.medicalSpecialty ? (SPECIALTY_LABEL[s.medicalSpecialty] ?? s.medicalSpecialty) : null;

  return (
    <div className={cn(
      "rounded-md border px-3 py-2 text-xs space-y-0.5",
      isOpen ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : "border-border bg-muted/20"
    )}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">
          {label}{specialty ? ` · ${specialty}` : ""}
        </span>
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-medium",
          isOpen ? "bg-amber-200 text-amber-800" : "bg-muted text-muted-foreground"
        )}>
          {STATUS_LABEL[s.status] ?? s.status}
        </span>
      </div>
      <div className="text-muted-foreground">
        Entrada {fmt(s.enqueuedAt)}
        {s.startedAt && ` · Início ${fmt(s.startedAt)}`}
        {s.completedAt && ` · Fim ${fmt(s.completedAt)}`}
      </div>
    </div>
  );
}

function PersonCard({ journey, labels }: { journey: PersonJourney; labels: Record<string, string> }) {
  const [open, setOpen] = useState(journey.hasOpen);

  return (
    <div className={cn(
      "rounded-lg border bg-background overflow-hidden",
      journey.hasOpen ? "border-amber-400" : "border-border"
    )}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        {journey.hasOpen && (
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{journey.personName}</span>
          <span className="ml-2 text-xs text-muted-foreground">{journey.personAge} anos</span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {journey.services.length} serviço{journey.services.length !== 1 ? "s" : ""}
          {journey.hasOpen && <span className="ml-1 text-amber-600 font-medium">· em aberto</span>}
        </span>
        <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-border/50">
          {journey.services.map(s => (
            <ServicePill key={s.id} s={s} labels={labels} />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  journeys: PersonJourney[];
  serviceLabels: Record<string, string>;
}

export function AtendimentosClient({ journeys, serviceLabels }: Props) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? journeys.filter(j =>
        j.personName.toLowerCase().includes(search.toLowerCase())
      )
    : journeys;

  const openCount = filtered.filter(j => j.hasOpen).length;

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nome…"
        className="h-9 text-sm max-w-sm"
      />

      {search && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} encontrado{filtered.length !== 1 ? "s" : ""}
          {openCount > 0 && ` · ${openCount} em aberto`}
        </p>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma pessoa encontrada.</p>
        ) : (
          filtered.map(j => (
            <PersonCard key={j.personId} journey={j} labels={serviceLabels} />
          ))
        )}
      </div>
    </div>
  );
}
