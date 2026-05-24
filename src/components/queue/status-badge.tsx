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
    className: "bg-yellow-50 text-yellow-800 border-yellow-200",
  },
  nursing_in_progress: {
    label: "Enfermagem",
    className: "bg-blue-50 text-blue-800 border-blue-200",
  },
  waiting_medico: {
    label: "Ag. Médico",
    className: "bg-orange-50 text-orange-800 border-orange-200",
  },
  in_progress: {
    label: "Em atendimento",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  completed: {
    label: "Concluído",
    className: "bg-green-50 text-green-800 border-green-200",
  },
  dispensed: {
    label: "Dispensado",
    className: "bg-muted text-muted-foreground border-border",
  },
  abandoned: {
    label: "Abandonado",
    className: "bg-red-50 text-red-800 border-red-200",
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
