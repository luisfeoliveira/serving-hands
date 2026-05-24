"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { lookupPerson, registerPerson, addServices } from "./actions";
import { SERVICE_LABELS } from "@/lib/types";
import type { ServiceType, DbPerson } from "@/lib/types";

// Services shown at reception (all except bazar goes through its own controller)
const RECEPTION_SERVICES: ServiceType[] = [
  "medicina",
  "odontologia",
  "fonoaudiologia",
  "psicologia",
  "servico_social",
  "consultoria_juridica",
  "consultoria_financeira",
  "cabelereiro",
  "sobrancelha",
  "estetica",
  "bazar",
];

function formatCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

type Mode = "idle" | "new" | "existing";

interface Props {
  eventId: string;
  initialQueueSizes: Record<string, number>;
}

export function RecepcaoClient({ eventId, initialQueueSizes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // CPF step
  const [cpf, setCpf] = useState("");
  const [mode, setMode] = useState<Mode>("idle");

  // Found person state
  const [foundPerson, setFoundPerson] = useState<DbPerson | null>(null);
  const [registeredServices, setRegisteredServices] = useState<ServiceType[]>([]);

  // Form fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [priority, setPriority] = useState(false);

  const needsComplaint = selectedServices.includes("medicina");

  function handleSearch() {
    const clean = cpf.replace(/\D/g, "");
    if (clean.length !== 11) {
      toast.error("CPF deve ter 11 dígitos.");
      return;
    }

    startTransition(async () => {
      const result = await lookupPerson(cpf);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      if (result.isCurrentEvent && result.person) {
        setFoundPerson(result.person);
        setRegisteredServices(result.registeredServices);
        setMode("existing");
      } else {
        // Pre-fill name from previous edition
        if (result.person) setName(result.person.name);
        setMode("new");
      }
    });
  }

  function toggleService(service: ServiceType) {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
    if (service === "medicina") setChiefComplaint("");
  }

  function handleSubmit() {
    if (!selectedServices.length) {
      toast.error("Selecione ao menos um serviço.");
      return;
    }
    if (needsComplaint && !chiefComplaint.trim()) {
      toast.error("Preencha a queixa/motivo para medicina.");
      return;
    }

    startTransition(async () => {
      let result: { error?: string };

      if (mode === "new") {
        if (!name.trim()) { toast.error("Preencha o nome."); return; }
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
          toast.error("Idade inválida.");
          return;
        }
        result = await registerPerson({
          cpf,
          name,
          age: ageNum,
          services: selectedServices,
          chiefComplaint,
          priority,
          eventId,
        });
      } else {
        result = await addServices({
          personId: foundPerson!.id,
          services: selectedServices,
          chiefComplaint,
          priority,
          eventId,
        });
      }

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const personName = mode === "new" ? name : foundPerson!.name;
      toast.success(`${personName} registrado com sucesso!`);
      reset();
      router.refresh();
    });
  }

  function reset() {
    setCpf("");
    setMode("idle");
    setFoundPerson(null);
    setRegisteredServices([]);
    setName("");
    setAge("");
    setSelectedServices([]);
    setChiefComplaint("");
    setPriority(false);
  }

  return (
    <div className="space-y-6">
      {/* CPF Search */}
      <div className="space-y-2">
        <Label htmlFor="cpf">CPF do participante</Label>
        <div className="flex gap-2">
          <Input
            id="cpf"
            value={cpf}
            onChange={(e) => {
              setCpf(formatCPF(e.target.value));
              if (mode !== "idle") reset();
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="000.000.000-00"
            inputMode="numeric"
            className="h-11 font-mono"
          />
          <Button
            onClick={handleSearch}
            disabled={isPending}
            className="h-11 px-5 shrink-0"
          >
            {isPending && mode === "idle" ? "Buscando…" : "Buscar"}
          </Button>
        </div>
      </div>

      {/* Existing person banner */}
      {mode === "existing" && foundPerson && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">{foundPerson.name}</p>
            <p className="text-sm text-muted-foreground">{foundPerson.age} anos</p>
          </div>
          <Badge variant="secondary">Já cadastrado</Badge>
        </div>
      )}

      {/* New person fields */}
      {mode === "new" && (
        <div className="space-y-4">
          <Separator />
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
            Novo cadastro
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do participante"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="age">Idade</Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Ex: 42"
              min={0}
              max={150}
              className="h-11 w-32"
            />
          </div>
        </div>
      )}

      {/* Service selection */}
      {mode !== "idle" && (
        <>
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {mode === "existing" ? "Adicionar serviços" : "Serviços desejados"}
            </p>

            <div className="space-y-2">
              {RECEPTION_SERVICES.map((service) => {
                const alreadyRegistered =
                  mode === "existing" && registeredServices.includes(service);
                const checked =
                  alreadyRegistered || selectedServices.includes(service);
                const queueCount = initialQueueSizes[service] ?? 0;

                return (
                  <label
                    key={service}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 border transition-colors cursor-pointer
                      ${alreadyRegistered ? "opacity-50 cursor-not-allowed border-border bg-muted/30" : "border-border hover:bg-muted/40"}
                      ${selectedServices.includes(service) && !alreadyRegistered ? "border-foreground bg-muted/40" : ""}
                    `}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={alreadyRegistered}
                      onCheckedChange={() =>
                        !alreadyRegistered && toggleService(service)
                      }
                    />
                    <span className="flex-1 text-sm font-medium">
                      {SERVICE_LABELS[service]}
                    </span>
                    {queueCount > 0 && (
                      <Badge variant="outline" className="text-xs tabular-nums">
                        {queueCount} na fila
                      </Badge>
                    )}
                    {alreadyRegistered && (
                      <Badge variant="secondary" className="text-xs">
                        Inscrito
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Chief complaint — medicina only */}
          {needsComplaint && (
            <div className="space-y-1.5">
              <Label htmlFor="complaint">
                Queixa / Motivo{" "}
                <span className="text-muted-foreground font-normal">(Medicina)</span>
              </Label>
              <Textarea
                id="complaint"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Descreva a queixa principal do participante…"
                rows={3}
              />
            </div>
          )}

          {/* Priority */}
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={priority}
              onCheckedChange={(v) => setPriority(!!v)}
            />
            <span className="text-sm font-medium">Atendimento prioritário</span>
          </label>

          <Button
            onClick={handleSubmit}
            disabled={isPending || !selectedServices.length}
            className="w-full h-11 rounded-full font-medium"
          >
            {isPending
              ? "Registrando…"
              : mode === "existing"
              ? "Adicionar serviços"
              : "Cadastrar participante"}
          </Button>
        </>
      )}
    </div>
  );
}
