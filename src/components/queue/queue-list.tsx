import { QueueRow } from "./queue-row";
import type { QueueEntry } from "@/lib/types";

interface QueueListProps {
  entries: QueueEntry[];
  isLoading?: boolean;
  emptyMessage?: string;
  renderActions?: (entry: QueueEntry) => React.ReactNode;
}

export function QueueList({
  entries,
  isLoading,
  emptyMessage = "Fila vazia.",
  renderActions,
}: QueueListProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Carregando…" : emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <QueueRow
          key={entry.id}
          entry={entry}
          actions={renderActions?.(entry)}
        />
      ))}
      {isLoading && (
        <p className="text-center text-xs text-muted-foreground py-1">
          Atualizando…
        </p>
      )}
    </div>
  );
}
