"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfessionalQueue } from "@/hooks/use-professional-queue";
import { PriorityBadge } from "@/components/queue/priority-badge";
import { AbandonButton } from "@/components/queue/abandon-button";
import { Checkbox } from "@/components/ui/checkbox";
import { startAttendance, completeAppointment, forwardToSocialService } from "@/lib/professional-actions";
import { Odontogram } from "@/components/professional/odontogram";
import { AppointmentHistory } from "@/components/ficha/appointment-history";
import type {
  ServiceType,
  QueueEntry,
  AppointmentData,
  ClinicalData,
  OdontologiaData,
  OdontogramData,
  ConsultoriaJuridicaData,
  ConsultoriaFinanceiraData,
  ProfessionalInfo,
  EventInfo,
} from "@/lib/types";

// ─── Form components ──────────────────────────────────────────────────────────

type FormState = Record<string, string>;
type Setter = (key: string) => (value: string | null) => void;
type EventSetter = (key: string) => (e: React.ChangeEvent<HTMLTextAreaElement>) => void;

const REFERRAL_LABELS: Record<string, string> = {
  resolved: "Resolvido no local",
  sus: "Encaminhar ao SUS",
  other: "Outro",
};

const LEGAL_AREA_LABELS: Record<string, string> = {
  familia: "Direito de Família",
  trabalhista: "Direito Trabalhista",
  previdenciario: "Previdenciário",
  outros: "Outros",
};

const FINANCE_AREA_LABELS: Record<string, string> = {
  dividas: "Dívidas",
  orcamento: "Orçamento",
  microcredito: "Microcrédito",
  outros: "Outros",
};

function ClinicalForm({
  form,
  set,
  onEvent,
  showCestaBasica,
  cestaBasica,
  onCestaBasicaChange,
}: {
  form: FormState;
  set: Setter;
  onEvent: EventSetter;
  showCestaBasica?: boolean;
  cestaBasica?: boolean;
  onCestaBasicaChange?: (v: boolean) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">Queixa principal</Label>
        <Textarea
          value={form.chief_complaint ?? ""}
          onChange={onEvent("chief_complaint")}
          placeholder="Descreva a queixa principal…"
          rows={3}
          className="text-sm resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">
          Encaminhamento <span className="text-red-500">*</span>
        </Label>
        <Select
          value={form.referral ?? ""}
          onValueChange={set("referral")}
          itemToStringLabel={(v) => REFERRAL_LABELS[v as string] ?? String(v)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Selecione…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="resolved">Resolvido no local</SelectItem>
            <SelectItem value="sus">Encaminhar ao SUS</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
        {form.referral === "other" && (
          <Textarea
            value={form.referral_notes ?? ""}
            onChange={onEvent("referral_notes")}
            placeholder="Descreva o encaminhamento…"
            rows={2}
            className="text-sm resize-none"
          />
        )}
      </div>
      {showCestaBasica && (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="cesta-basica"
            checked={cestaBasica ?? false}
            onCheckedChange={(v) => onCestaBasicaChange?.(v === true)}
          />
          <Label htmlFor="cesta-basica" className="text-xs cursor-pointer">
            Recebeu cesta básica
          </Label>
        </div>
      )}
    </>
  );
}

function LegalForm({
  form,
  set,
  onEvent,
}: {
  form: FormState;
  set: Setter;
  onEvent: EventSetter;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">
          Área <span className="text-red-500">*</span>
        </Label>
        <Select value={form.area ?? ""} onValueChange={set("area")} itemToStringLabel={(v) => LEGAL_AREA_LABELS[v as string] ?? String(v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Selecione a área…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="familia">Direito de Família</SelectItem>
            <SelectItem value="trabalhista">Direito Trabalhista</SelectItem>
            <SelectItem value="previdenciario">Previdenciário</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Resumo do caso</Label>
        <Textarea
          value={form.case_summary ?? ""}
          onChange={onEvent("case_summary")}
          placeholder="Descreva brevemente o caso…"
          rows={3}
          className="text-sm resize-none"
        />
      </div>
    </>
  );
}

function FinanceForm({
  form,
  set,
  onEvent,
}: {
  form: FormState;
  set: Setter;
  onEvent: EventSetter;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">
          Área <span className="text-red-500">*</span>
        </Label>
        <Select value={form.area ?? ""} onValueChange={set("area")} itemToStringLabel={(v) => FINANCE_AREA_LABELS[v as string] ?? String(v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Selecione a área…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dividas">Dívidas</SelectItem>
            <SelectItem value="orcamento">Orçamento</SelectItem>
            <SelectItem value="microcredito">Microcrédito</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Resumo</Label>
        <Textarea
          value={form.case_summary ?? ""}
          onChange={onEvent("case_summary")}
          placeholder="Descreva brevemente o caso…"
          rows={3}
          className="text-sm resize-none"
        />
      </div>
    </>
  );
}

function AppointmentForm({
  serviceType,
  form,
  set,
  onEvent,
  cestaBasica,
  onCestaBasicaChange,
  odontogramData,
  onOdontogramChange,
}: {
  serviceType: ServiceType;
  form: FormState;
  set: Setter;
  onEvent: EventSetter;
  cestaBasica?: boolean;
  onCestaBasicaChange?: (v: boolean) => void;
  odontogramData?: OdontogramData;
  onOdontogramChange?: (data: OdontogramData) => void;
}) {
  switch (serviceType) {
    case "odontologia":
      return (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Odontograma</Label>
            <Odontogram
              value={odontogramData ?? {}}
              onChange={onOdontogramChange}
            />
          </div>
          <ClinicalForm form={form} set={set} onEvent={onEvent} />
        </>
      );
    case "fonoaudiologia":
    case "psicologia":
      return <ClinicalForm form={form} set={set} onEvent={onEvent} />;
    case "servico_social":
      return (
        <ClinicalForm
          form={form}
          set={set}
          onEvent={onEvent}
          showCestaBasica
          cestaBasica={cestaBasica}
          onCestaBasicaChange={onCestaBasicaChange}
        />
      );
    case "consultoria_juridica":
      return <LegalForm form={form} set={set} onEvent={onEvent} />;
    case "consultoria_financeira":
      return <FinanceForm form={form} set={set} onEvent={onEvent} />;
    case "estetica":
      return null; // no form fields for beauty services
    default:
      return null;
  }
}

function buildAppointmentData(
  serviceType: ServiceType,
  form: FormState,
  odontogramData?: OdontogramData
): AppointmentData | null {
  switch (serviceType) {
    case "odontologia": {
      if (!form.referral) return null;
      return {
        chief_complaint: form.chief_complaint ?? "",
        referral: form.referral as OdontologiaData["referral"],
        ...(form.referral === "other" && { referral_notes: form.referral_notes ?? "" }),
        odontogram: odontogramData ?? {},
      } satisfies OdontologiaData;
    }
    case "fonoaudiologia":
    case "psicologia":
    case "servico_social": {
      if (!form.referral) return null;
      return {
        chief_complaint: form.chief_complaint ?? "",
        referral: form.referral as ClinicalData["referral"],
        ...(form.referral === "other" && { referral_notes: form.referral_notes ?? "" }),
      };
    }
    case "consultoria_juridica": {
      if (!form.area) return null;
      return {
        area: form.area as ConsultoriaJuridicaData["area"],
        case_summary: form.case_summary ?? "",
      };
    }
    case "consultoria_financeira": {
      if (!form.area) return null;
      return {
        area: form.area as ConsultoriaFinanceiraData["area"],
        case_summary: form.case_summary ?? "",
      };
    }
    case "estetica":
      return {}; // BelezaData — no fields required
    default:
      return null;
  }
}

// ─── Appointment card ─────────────────────────────────────────────────────────

function PatientHeader({ entry }: { entry: QueueEntry }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-sm font-bold text-emerald-700 tabular-nums leading-none">
          {entry.position}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">{entry.person.name}</span>
          <span className="text-sm text-muted-foreground">{entry.person.age} anos</span>
          {entry.priority && <PriorityBadge />}
        </div>
      </div>
    </div>
  );
}

function AppointmentCard({
  entry,
  serviceType,
  professional,
  event,
  onSuccess,
}: {
  entry: QueueEntry;
  serviceType: ServiceType;
  professional: ProfessionalInfo;
  event: EventInfo;
  onSuccess: () => void;
}) {
  const [started, setStarted] = useState(!!entry.started_at);
  const [form, setForm] = useState<FormState>({});
  const [cestaBasica, setCestaBasica] = useState(false);
  const [forwarded, setForwarded] = useState(false);
  const [odontogramData, setOdontogramData] = useState<OdontogramData>({});
  const [isPending, startTransition] = useTransition();

  const set: Setter = (key) => (value) =>
    setForm((prev) => ({ ...prev, [key]: value ?? "" }));

  const onEvent: EventSetter = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  function handleStart() {
    startTransition(async () => {
      const r = await startAttendance(entry.id);
      if (r.error) toast.error(r.error);
      else setStarted(true);
    });
  }

  function handleForward() {
    startTransition(async () => {
      const r = await forwardToSocialService(entry.id);
      if (r.error) toast.error(r.error);
      else {
        toast.success("Pessoa encaminhada para o Serviço Social.");
        setForwarded(true);
      }
    });
  }

  function submit() {
    const data = buildAppointmentData(serviceType, form, odontogramData);
    if (!data) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    startTransition(async () => {
      const r = await completeAppointment({
        entryId: entry.id,
        data,
        cestaBasica: serviceType === "servico_social" ? cestaBasica : undefined,
      });
      if (r.error) toast.error(r.error);
      else {
        toast.success("Atendimento concluído.");
        onSuccess();
      }
    });
  }

  // ── Not yet started ───────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="rounded-lg border border-border border-l-4 border-l-amber-400 bg-background px-4 py-3 space-y-4">
        <PatientHeader entry={entry} />
        <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
          <AbandonButton entryId={entry.id} onAbandoned={onSuccess} />
          <Button
            size="sm"
            onClick={handleStart}
            disabled={isPending}
            className="h-8 px-3 text-xs"
          >
            {isPending ? "…" : "Iniciar atendimento"}
          </Button>
        </div>
      </div>
    );
  }

  // ── In progress ───────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-border border-l-4 border-l-emerald-500 bg-background px-4 py-3 space-y-4">
      <PatientHeader entry={entry} />

      <div className="border-t border-border/50 pt-3 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Registro do atendimento
        </p>
        <AppointmentForm
          serviceType={serviceType}
          form={form}
          set={set}
          onEvent={onEvent}
          cestaBasica={cestaBasica}
          onCestaBasicaChange={setCestaBasica}
          odontogramData={odontogramData}
          onOdontogramChange={setOdontogramData}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-1 border-t border-border/50">
        <AbandonButton entryId={entry.id} onAbandoned={onSuccess} />
        {serviceType === "psicologia" && (
          forwarded ? (
            <span className="text-xs text-emerald-700 font-medium px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 shrink-0">
              ✓ Encaminhado para SS
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleForward}
              disabled={isPending}
              className="h-8 px-3 text-xs"
            >
              {isPending ? "…" : "Encaminhar para Serviço Social"}
            </Button>
          )
        )}
        <Button
          size="sm"
          onClick={submit}
          disabled={isPending}
          className="h-8 px-3 text-xs"
        >
          {isPending ? "…" : "Concluir atendimento"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  serviceType: ServiceType;
  professionalId: string | null;
  initialEntries: QueueEntry[];
  professional: ProfessionalInfo;
  event: EventInfo;
}

const HISTORY_ROLES: Partial<Record<ServiceType, import("@/lib/types").UserRole>> = {
  odontologia: "odontologo",
  fonoaudiologia: "fonoaudiologo",
  psicologia: "psicologo",
  servico_social: "assistente_social",
};

export function ProfessionalClient({
  eventId,
  serviceType,
  professionalId,
  initialEntries,
  professional,
  event,
}: Props) {
  const { entries, refresh } = useProfessionalQueue(
    eventId,
    serviceType,
    professionalId,
    initialEntries
  );

  const historyRole = HISTORY_ROLES[serviceType] ?? professional.role;
  const historySection = professionalId ? (
    <AppointmentHistory
      eventId={eventId}
      professionalId={professionalId}
      role={historyRole}
      professional={professional}
      event={event}
    />
  ) : null;

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed border-border py-16 text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Disponível</p>
          <p className="text-sm text-muted-foreground">
            Aguardando atribuição do controlador.
          </p>
        </div>
        {historySection}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <AppointmentCard
          key={e.id}
          entry={e}
          serviceType={serviceType}
          professional={professional}
          event={event}
          onSuccess={refresh}
        />
      ))}
      {historySection}
    </div>
  );
}
