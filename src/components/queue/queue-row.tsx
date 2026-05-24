import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";
import type { QueueEntry } from "@/lib/types";

interface QueueRowProps {
  entry: QueueEntry;
  actions?: React.ReactNode;
}

export function QueueRow({ entry, actions }: QueueRowProps) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3 space-y-2">
      {/* Top: position + info + status */}
      <div className="flex items-start gap-3">
        {/* Position circle */}
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
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
