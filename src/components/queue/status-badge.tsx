import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  ServiceStatus,
  { label: string; className: string }
> = {
  waiting: {
    label: "Aguardando",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  waiting_nursing: {
    label: "Ag. Enfermagem",
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
  nursing_in_progress: {
    label: "Em triagem",
    className: "bg-blue-100 text-blue-800 border-blue-300",
  },
  waiting_medico: {
    label: "Ag. Médico",
    className: "bg-violet-100 text-violet-800 border-violet-300",
  },
  in_progress: {
    label: "Em atendimento",
    className: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  completed: {
    label: "Concluído",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  dispensed: {
    label: "Dispensado",
    className: "bg-slate-100 text-slate-500 border-slate-200",
  },
  abandoned: {
    label: "Abandonado",
    className: "bg-red-100 text-red-700 border-red-300",
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
