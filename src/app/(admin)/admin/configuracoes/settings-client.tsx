"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { saveServiceLimits } from "./actions";

const BEAUTY_SERVICES = [
  { value: "cabeleireiro_feminino",  label: "Cabeleireiro Feminino" },
  { value: "cabeleireiro_masculino", label: "Cabeleireiro Masculino" },
  { value: "estetica",               label: "Estética" },
] as const;

interface Props {
  eventId: string;
  initialLimits: Record<string, number>;
}

export function SettingsClient({ eventId, initialLimits }: Props) {
  const [limits, setLimits] = useState<Record<string, number | "">>(() =>
    Object.fromEntries(
      BEAUTY_SERVICES.map(({ value }) => [value, initialLimits[value] ?? ""])
    )
  );
  const [isPending, startTransition] = useTransition();

  function handleChange(service: string, raw: string) {
    const n = raw === "" ? "" : Math.max(0, parseInt(raw) || 0);
    setLimits((prev) => ({ ...prev, [service]: n }));
  }

  function handleSave() {
    const toSave: Record<string, number> = {};
    for (const [k, v] of Object.entries(limits)) {
      if (v !== "" && Number(v) > 0) toSave[k] = Number(v);
    }
    startTransition(async () => {
      const r = await saveServiceLimits(eventId, toSave);
      if (r.error) toast.error(r.error);
      else toast.success("Configurações salvas.");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Configurações</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Limites de capacidade por serviço. Recepção bloqueia novos registros quando o limite é atingido.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background p-4 space-y-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide text-xs">
          Beleza — vagas simultâneas
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BEAUTY_SERVICES.map(({ value, label }) => (
            <div key={value} className="space-y-1.5">
              <Label className="text-sm">{label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={limits[value]}
                  onChange={(e) => handleChange(value, e.target.value)}
                  placeholder="Sem limite"
                  className="h-9 w-28 text-sm"
                />
                <span className="text-xs text-muted-foreground">pessoas</span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border/50 flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="h-8 px-4 text-xs"
          >
            {isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
