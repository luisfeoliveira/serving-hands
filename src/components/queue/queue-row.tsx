import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";
import { SERVICE_LABELS } from "@/lib/types";
import type { QueueEntry } from "@/lib/types";

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  });
}

// Left border color communicates status at a glance
const STATUS_BORDER: Record<string, string> = {
  waiting:            "border-l-border",
  waiting_nursing:    "border-l-primary/40",
  nursing_in_progress:"border-l-primary/60",
  waiting_medico:     "border-l-primary/80",
  in_progress:        "border-l-primary",
  completed:          "border-l-emerald-400",
  dispensed:          "border-l-border",
  abandoned:          "border-l-red-400",
};

interface QueueRowProps {
  entry: QueueEntry;
  actions?: React.ReactNode;
  waitLabel?: string; // e.g. "~15 min"
}

export function QueueRow({ entry, actions, waitLabel }: QueueRowProps) {
  const borderColor = STATUS_BORDER[entry.status] ?? "border-l-border";

  return (
    <div
      className={cn(
        "rounded-lg border border-border border-l-4 bg-background px-4 py-3 space-y-2",
        borderColor
      )}
    >
      {/* Top: position + info + status */}
      <div className="flex items-start gap-3">
        {/* Position circle */}
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5",
            entry.priority ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"
          )}
        >
          <span className="text-sm font-bold tabular-nums leading-none">
            {entry.position}
          </span>
        </div>

        {/* Name + age + priority */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground leading-tight">
              {entry.person.name}
            </span>
            <span className="text-sm text-muted-foreground">
              {entry.person.age} anos
            </span>
            {entry.priority && <PriorityBadge />}
          </div>
          {entry.chief_complaint && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {entry.chief_complaint}
            </p>
          )}
          {!!entry.active_services?.length && (
            <p className="text-xs text-amber-700 font-medium">
              Em atendimento:{" "}
              {entry.active_services.map((s) => SERVICE_LABELS[s]).join(" · ")}
            </p>
          )}
          {(entry.started_at || entry.completed_at) && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {entry.started_at && `Iniciado ${fmtTime(entry.started_at)}`}
              {entry.started_at && entry.completed_at && " · "}
              {entry.completed_at && `Concluído ${fmtTime(entry.completed_at)}`}
            </p>
          )}
        </div>

        {/* Status + wait estimate */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <StatusBadge status={entry.status} />
          {waitLabel && (
            <span className="text-[10px] text-muted-foreground tabular-nums">{waitLabel}</span>
          )}
        </div>
      </div>

      {/* Bottom: actions */}
      {actions && (
        <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
          {actions}
        </div>
      )}
    </div>
  );
}
