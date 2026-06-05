"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DownloadFichaButton } from "./download-ficha-button";
import { getCompletedHistory } from "@/lib/professional-actions";
import type {
  UserRole,
  HistoryEntry,
  FichaData,
  ProfessionalInfo,
  EventInfo,
  AppointmentData,
} from "@/lib/types";

function entryToFichaData(
  entry: HistoryEntry,
  professional: ProfessionalInfo,
  event: EventInfo
): FichaData {
  const apptData = entry.appointmentData as (AppointmentData & Record<string, unknown>) | null;
  return {
    event,
    person: entry.person,
    professional,
    serviceType: entry.serviceType,
    completedAt: entry.completedAt ?? undefined,
    chief_complaint: entry.chiefComplaint ?? undefined,
    observacao: (apptData as { observacao?: string } | null)?.observacao,
    referral: (apptData as { referral?: FichaData["referral"] } | null)?.referral,
    referral_notes: (apptData as { referral_notes?: string } | null)?.referral_notes,
    vitals: entry.vitals ?? undefined,
    odontogram: (apptData as { odontogram?: FichaData["odontogram"] } | null)?.odontogram,
  };
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  eventId: string;
  professionalId: string;
  role: UserRole;
  professional: ProfessionalInfo;
  event: EventInfo;
}

export function AppointmentHistory({ eventId, professionalId, role, professional, event }: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function load() {
    if (entries !== null) {
      setOpen((v) => !v);
      return;
    }
    setOpen(true);
    startTransition(async () => {
      const result = await getCompletedHistory({ eventId, professionalId, role });
      setEntries(result);
    });
  }

  return (
    <div className="border-t border-border/40 pt-4">
      <button
        type="button"
        onClick={load}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{open ? "▲" : "▼"}</span>
        Histórico de hoje
        {entries !== null && entries.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
            {entries.length}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-1.5">
          {isPending && (
            <p className="text-xs text-muted-foreground">Carregando…</p>
          )}
          {entries !== null && entries.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum atendimento concluído hoje.</p>
          )}
          {entries?.map((entry) => (
            <div
              key={entry.registrationId}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{entry.person.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(entry.completedAt)}
                </span>
              </div>
              <DownloadFichaButton
                data={entryToFichaData(entry, professional, event)}
                className="h-7 px-2.5 text-xs shrink-0"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
