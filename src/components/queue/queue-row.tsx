import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";
import type { QueueEntry } from "@/lib/types";

// Left border color communicates status at a glance
const STATUS_BORDER: Record<string, string> = {
  waiting: "border-l-slate-300",
  waiting_nursing: "border-l-amber-400",
  nursing_in_progress: "border-l-blue-400",
  waiting_medico: "border-l-violet-400",
  in_progress: "border-l-emerald-500",
  completed: "border-l-green-400",
  dispensed: "border-l-slate-300",
  abandoned: "border-l-red-400",
};

interface QueueRowProps {
  entry: QueueEntry;
  actions?: React.ReactNode;
}

export function QueueRow({ entry, actions }: QueueRowProps) {
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
        </div>

        {/* Status */}
        <div className="shrink-0">
          <StatusBadge status={entry.status} />
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
