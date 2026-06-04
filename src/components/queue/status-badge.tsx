import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  ServiceStatus,
  { label: string; className: string }
> = {
  waiting: {
    label: "Aguardando",
    className: "bg-muted text-muted-foreground border-border",
  },
  waiting_nursing: {
    label: "Ag. Enfermagem",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  nursing_in_progress: {
    label: "Em triagem",
    className: "bg-primary/15 text-primary border-primary/25",
  },
  waiting_medico: {
    label: "Ag. Médico",
    className: "bg-primary/20 text-primary border-primary/30",
  },
  in_progress: {
    label: "Em atendimento",
    className: "bg-primary/25 text-primary border-primary/40 font-semibold",
  },
  completed: {
    label: "Concluído",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  dispensed: {
    label: "Dispensado",
    className: "bg-muted text-muted-foreground border-border",
  },
  abandoned: {
    label: "Abandonado",
    className: "bg-red-50 text-red-600 border-red-200",
  },
};

interface StatusBadgeProps {
  status: ServiceStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className)}
    >
      {config.label}
    </Badge>
  );
}
