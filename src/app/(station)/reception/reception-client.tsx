"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { lookupPerson, registerPerson, addServices } from "./actions";
import { SERVICE_LABELS, DOC_TYPE_LABEL } from "@/lib/types";
import type { ServiceType, DbPerson, DocType } from "@/lib/types";

// Services shown at reception (all except bazar goes through its own controller)
const RECEPTION_SERVICES: ServiceType[] = [
  "medicina",
  "odontologia",
  "fonoaudiologia",
  "psicologia",
  "servico_social",
  "consultoria_juridica",
  "consultoria_financeira",
  "cabeleireiro_feminino",
  "cabeleireiro_masculino",
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

function isValidCPF(value: string): boolean {
  const d = value.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10 || check === 11) check = 0;
  if (check !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10 || check === 11) check = 0;
  if (check !== parseInt(d[10])) return false;
  return true;
}

function validateDoc(docType: DocType, value: string): string | null {
  if (docType === "cpf") {
    if (!isValidCPF(value)) return "CPF inválido.";
  } else if (docType === "sus") {
    if (value.replace(/\D/g, "").length !== 15) return "Cartão SUS deve ter 15 dígitos.";
  } else {
    // RG: flexible — at least 5 chars after stripping separators
    if (value.replace(/[\s.\-\/]/g, "").length < 5) return "RG inválido.";
  }
  return null;
}

function formatDoc(docType: DocType, value: string): string {
  if (docType === "cpf") return formatCPF(value);
  if (docType === "sus") return value.replace(/\D/g, "").slice(0, 15);
  return value; // RG: free-form
}

function docPlaceholder(docType: DocType): string {
  if (docType === "cpf") return "000.000.000-00";
  if (docType === "sus") return "000000000000000";
  return "Ex: 12.345.678-9";
}

const DOC_TYPES: DocType[] = ["cpf", "rg", "sus"];

type Mode = "idle" | "new" | "existing";

interface Props {
  eventId: string;
  initialQueueSizes: Record<string, number>;
  serviceLimits: Record<string, number>;
}

export function ReceptionClient({ eventId, initialQueueSizes, serviceLimits }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [queueSizes, setQueueSizes] = useState(initialQueueSizes);
  const [avgDurationMins, setAvgDurationMins] = useState<Record<string, number>>({});

  useEffect(() => {
    const supabase = createClient();
    const refresh = async () => {
      try {
        const res = await fetch(`/api/queue/sizes?eventId=${eventId}`);
        if (!res.ok) return;
        const data = await res.json();
        setQueueSizes(data.sizes ?? {});
        setAvgDurationMins(data.avgDurationMins ?? {});
      } catch {
        // keep current state
      }
    };
    // Initial fetch to get avg durations (SSR only gives queue sizes)
    refresh();
    const channel = supabase
      .channel(`reception:sizes:${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_registrations" }, refresh)
      .subscribe();
    const interval = setInterval(refresh, 15_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [eventId]);

  // Document step
  const [docType, setDocType] = useState<DocType>("cpf");
  const [docNumber, setDocNumber] = useState("");
  const [mode, setMode] = useState<Mode>("idle");

  // Found person state
  const [foundPerson, setFoundPerson] = useState<DbPerson | null>(null);
  const [registeredServices, setRegisteredServices] = useState<ServiceType[]>([]);

  // Form fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);
  const [priority, setPriority] = useState(false);

  function handleSearch() {
    const err = validateDoc(docType, docNumber);
    if (err) { toast.error(err); return; }

    startTransition(async () => {
      const result = await lookupPerson(docType, docNumber);

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
  }

  function handleSubmit() {
    if (!selectedServices.length) {
      toast.error("Selecione ao menos um serviço.");
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
          docType,
          docNumber,
          name,
          age: ageNum,
          services: selectedServices,
          priority,
          eventId,
        });
      } else {
        result = await addServices({
          personId: foundPerson!.id,
          services: selectedServices,
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
    setDocNumber("");
    setMode("idle");
    setFoundPerson(null);
    setRegisteredServices([]);
    setName("");
    setAge("");
    setSelectedServices([]);
    setPriority(false);
  }

  return (
    <div className="space-y-6">
      {/* Document Search */}
      <div className="space-y-2">
        <Label>Documento do participante</Label>
        <div className="flex gap-2">
          {/* Doc type selector */}
          <div className="flex rounded-lg border border-input overflow-hidden shrink-0">
            {DOC_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setDocType(t); setDocNumber(""); if (mode !== "idle") reset(); }}
                className={`px-3 h-11 text-sm font-medium transition-colors ${
                  docType === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {DOC_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <Input
            value={docNumber}
            onChange={(e) => {
              setDocNumber(formatDoc(docType, e.target.value));
              if (mode !== "idle") reset();
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={docPlaceholder(docType)}
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
                const queueCount = queueSizes[service] ?? 0;
                const limit = serviceLimits[service];
                const atCapacity = !alreadyRegistered && limit != null && queueCount >= limit;
                const disabled = alreadyRegistered || atCapacity;
                const checked =
                  alreadyRegistered || selectedServices.includes(service);
                const avgMins = avgDurationMins[service];
                const estimatedWaitMins = avgMins ? Math.round(queueCount * avgMins) : null;

                return (
                  <label
                    key={service}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 border transition-colors
                      ${disabled ? "opacity-50 cursor-not-allowed border-border bg-muted/30" : "border-border hover:bg-muted/40 cursor-pointer"}
                      ${selectedServices.includes(service) && !disabled ? "border-foreground bg-muted/40" : ""}
                    `}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={() =>
                        !disabled && toggleService(service)
                      }
                    />
                    <span className="flex-1 text-sm font-medium">
                      {SERVICE_LABELS[service]}
                    </span>
                    {atCapacity ? (
                      <Badge variant="destructive" className="text-xs shrink-0">
                        Cheio
                      </Badge>
                    ) : (
                      <>
                        {queueCount > 0 && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline" className="text-xs tabular-nums">
                              {limit != null ? `${queueCount}/${limit}` : `${queueCount} na fila`}
                            </Badge>
                            {estimatedWaitMins !== null && estimatedWaitMins > 0 && (
                              <Badge variant="secondary" className="text-xs tabular-nums text-muted-foreground">
                                ~{estimatedWaitMins} min
                              </Badge>
                            )}
                          </div>
                        )}
                        {alreadyRegistered && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            Inscrito
                          </Badge>
                        )}
                      </>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

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
