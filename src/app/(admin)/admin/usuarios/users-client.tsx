"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listUsers, updateUser, inviteUser, resendInvite } from "./actions";
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { UserWithEmail } from "./actions";
import type { UserRole, ServiceType } from "@/lib/types";
import { REGISTRATION_LABEL } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES: UserRole[] = [
  "recepcao",
  "controlador",
  "enfermagem",
  "medico",
  "odontologo",
  "fonoaudiologo",
  "psicologo",
  "assistente_social",
  "consultor_juridico",
  "consultor_financeiro",
  "beleza",
  "bazar_controlador",
  "bazar_caixa",
  "evangelism",
  "admin",
];

const CONTROLLER_SERVICES: { value: ServiceType; label: string }[] = [
  { value: "medicina", label: "Medicina / Enfermagem" },
  { value: "odontologia", label: "Odontologia" },
  { value: "fonoaudiologia", label: "Fonoaudiologia" },
  { value: "psicologia", label: "Psicologia" },
  { value: "servico_social", label: "Serviço Social" },
  { value: "consultoria_juridica", label: "Consultoria Jurídica" },
  { value: "consultoria_financeira", label: "Consultoria Financeira" },
  { value: "cabeleireiro_feminino", label: "Cabeleireiro Feminino" },
  { value: "cabeleireiro_masculino", label: "Cabeleireiro Masculino" },
  { value: "estetica", label: "Estética" },
];

const MEDICAL_SPECIALTIES = [
  { value: "clinica_geral", label: "Clínica Geral" },
  { value: "cardiologia", label: "Cardiologia" },
  { value: "pneumologia", label: "Pneumologia" },
  { value: "dermatologia", label: "Dermatologia" },
];

const BEAUTY_SPECIALTIES = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "estetica", label: "Estética" },
];

// ─── Shared specialty logic ───────────────────────────────────────────────────

// Single specialty — medico and beleza
function showsSpecialty(role: UserRole) {
  return role === "medico" || role === "beleza";
}

function isMedicalSpecialty(role: UserRole) {
  return role === "medico";
}

// Multi-specialty chips — controller with medicina service
function showsControllerSpecialties(role: UserRole, serviceTypes: ServiceType[]) {
  return role === "controlador" && serviceTypes.includes("medicina");
}

function specialtyLabel(role: UserRole) {
  if (role === "beleza") return "Especialidade";
  return "Especialidade médica";
}

// ─── Shared service-type chips ────────────────────────────────────────────────

function ServiceTypeChips({
  selected,
  onChange,
}: {
  selected: ServiceType[];
  onChange: (next: ServiceType[]) => void;
}) {
  function toggle(st: ServiceType) {
    onChange(selected.includes(st) ? selected.filter((s) => s !== st) : [...selected, st]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {CONTROLLER_SERVICES.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => toggle(s.value)}
          className={cn(
            "px-2.5 py-1 text-xs rounded-md border transition-colors",
            selected.includes(s.value)
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:bg-muted/40 text-foreground"
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ─── Controller specialty chips (multi-select) ────────────────────────────────

function ControllerSpecialtyChips({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Especialidades médicas (controlador)</Label>
      <div className="flex flex-wrap gap-1.5">
        {MEDICAL_SPECIALTIES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => toggle(s.value)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md border transition-colors",
              selected.includes(s.value)
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-muted/40 text-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Specialty field (chips for medico and beleza) ────────────────────────────

function SpecialtyField({
  role,
  value,
  onChange,
}: {
  role: UserRole;
  value: string;
  onChange: (v: string) => void;
}) {
  if (!showsSpecialty(role)) return null;

  const options = role === "beleza" ? BEAUTY_SPECIALTIES : MEDICAL_SPECIALTIES;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{specialtyLabel(role)}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(value === s.value ? "" : s.value)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md border transition-colors",
              value === s.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-muted/40 text-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Invite form ──────────────────────────────────────────────────────────────

function InviteForm({ onInvited }: { onInvited: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("recepcao");
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [specialty, setSpecialty] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const showServiceTypes = role === "controlador";

  function reset() {
    setName("");
    setEmail("");
    setRole("recepcao");
    setServiceTypes([]);
    setSpecialty("");
    setSpecialties([]);
    setOpen(false);
  }

  function submit() {
    startTransition(async () => {
      const r = await inviteUser({
        name: name.trim(),
        email: email.trim(),
        role,
        service_types: showServiceTypes ? serviceTypes : null,
        medical_specialty: showsSpecialty(role) ? specialty || null : null,
        medical_specialties: showsControllerSpecialties(role, serviceTypes) ? specialties : null,
      });
      if (r.error) {
        toast.error(r.error);
      } else {
        toast.success(`Convite enviado para ${email}.`);
        reset();
        onInvited();
      }
    });
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} className="h-8 px-3 text-xs">
        + Convidar voluntário
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-4">
      <p className="text-sm font-medium">Convidar voluntário</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome completo</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: João Silva"
            className="h-9 text-sm"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">E-mail</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voluntario@email.com"
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5 max-w-xs">
        <Label className="text-xs">Função</Label>
        <Select
          value={role}
          onValueChange={(v) => { setRole(v as UserRole); setServiceTypes([]); setSpecialty(""); }}
          itemToStringLabel={(v) => roleLabel(v as UserRole)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showServiceTypes && (
        <div className="space-y-1.5">
          <Label className="text-xs">Serviços gerenciados</Label>
          <ServiceTypeChips selected={serviceTypes} onChange={setServiceTypes} />
        </div>
      )}

      <SpecialtyField
        role={role}
        value={specialty}
        onChange={setSpecialty}
      />

      {showsControllerSpecialties(role, serviceTypes) && (
        <ControllerSpecialtyChips selected={specialties} onChange={setSpecialties} />
      )}

      <p className="text-xs text-muted-foreground">
        O voluntário receberá um e-mail com link para definir a senha.
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={reset} disabled={isPending} className="h-8 px-3 text-xs">
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={submit}
          disabled={isPending || !name.trim() || !email.trim()}
          className="h-8 px-3 text-xs"
        >
          {isPending ? "Enviando…" : "Enviar convite"}
        </Button>
      </div>
    </div>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditForm({
  user,
  onSaved,
  onCancel,
}: {
  user: UserWithEmail;
  onSaved: (updated: UserWithEmail) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [active, setActive] = useState(user.active);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(user.service_types ?? []);
  const [specialty, setSpecialty] = useState(user.medical_specialty ?? "");
  // For controllers: prefer medical_specialties array; fall back to legacy single specialty
  const [specialties, setSpecialties] = useState<string[]>(
    user.medical_specialties?.length
      ? user.medical_specialties
      : user.medical_specialty && user.role === "controlador"
        ? [user.medical_specialty]
        : []
  );
  const [registrationNumber, setRegistrationNumber] = useState(user.registration_number ?? "");
  const [isPending, startTransition] = useTransition();

  const showServiceTypes = role === "controlador";

  function save() {
    startTransition(async () => {
      const specValue = showsSpecialty(role) ? specialty || null : null;
      const specArray = showsControllerSpecialties(role, serviceTypes) ? specialties : null;
      const r = await updateUser({
        id: user.id,
        name,
        role,
        active,
        service_types: showServiceTypes ? serviceTypes : null,
        medical_specialty: specValue,
        medical_specialties: specArray,
        registration_number: registrationNumber || null,
      });
      if (r.error) {
        toast.error(r.error);
      } else {
        toast.success("Voluntário atualizado.");
        onSaved({
          ...user,
          name,
          role,
          active,
          service_types: showServiceTypes ? serviceTypes : null,
          medical_specialty: specValue,
          medical_specialties: specArray,
          registration_number: registrationNumber || null,
        });
      }
    });
  }

  return (
    <div className="px-4 pb-4 pt-2 border-t border-border/60 space-y-4 bg-muted/20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Função</Label>
          <Select
            value={role}
            onValueChange={(v) => { setRole(v as UserRole); setServiceTypes([]); setSpecialty(""); setSpecialties([]); }}
            itemToStringLabel={(v) => roleLabel(v as UserRole)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_ROLES.map((r) => (
                <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full border-2 border-transparent transition-colors",
            active ? "bg-primary" : "bg-muted"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
              active ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
        <span className="text-sm text-foreground">
          {active ? "Ativo" : "Inativo"}{" "}
          <span className="text-muted-foreground text-xs">
            {active ? "— pode fazer login" : "— bloqueado"}
          </span>
        </span>
      </div>

      {showServiceTypes && (
        <div className="space-y-1.5">
          <Label className="text-xs">Serviços gerenciados</Label>
          <ServiceTypeChips selected={serviceTypes} onChange={setServiceTypes} />
        </div>
      )}

      <SpecialtyField
        role={role}
        value={specialty}
        onChange={setSpecialty}
      />

      {showsControllerSpecialties(role, serviceTypes) && (
        <ControllerSpecialtyChips selected={specialties} onChange={setSpecialties} />
      )}

      {REGISTRATION_LABEL[role] && (
        <div className="space-y-1.5 max-w-xs">
          <Label className="text-xs">Nº de registro ({REGISTRATION_LABEL[role]})</Label>
          <Input
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            placeholder={`ex: ${REGISTRATION_LABEL[role]}-SP 123456`}
            className="h-9 text-sm"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 px-3 text-xs">
          Cancelar
        </Button>
        <Button size="sm" onClick={save} disabled={isPending || !name.trim()} className="h-8 px-3 text-xs">
          {isPending ? "…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

// ─── User row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  expanded,
  onToggle,
  onSaved,
}: {
  user: UserWithEmail;
  expanded: boolean;
  onToggle: () => void;
  onSaved: (updated: UserWithEmail) => void;
}) {
  const [resendPending, startResend] = useTransition();
  const pendingSetup = !user.last_sign_in_at;

  function handleResend(e: React.MouseEvent) {
    e.stopPropagation();
    startResend(async () => {
      const r = await resendInvite(user.email);
      if (r.error) toast.error(r.error);
      else toast.success(`Convite reenviado para ${user.email}.`);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <span
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            pendingSetup ? "bg-amber-400" : user.active ? "bg-emerald-500" : "bg-muted-foreground/30"
          )}
        />

        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-0.5 sm:gap-2">
          <span className="font-medium text-sm truncate">{user.name}</span>
          <span className="text-xs text-muted-foreground truncate">{user.email}</span>
          <span className="text-xs text-muted-foreground truncate">
            {roleLabel(user.role)}
            {user.medical_specialties?.length ? (
              <> · {user.medical_specialties.map((s) => MEDICAL_SPECIALTIES.find((m) => m.value === s)?.label ?? s).join(", ")}</>
            ) : user.medical_specialty ? (
              <> · {MEDICAL_SPECIALTIES.find((s) => s.value === user.medical_specialty)?.label ?? user.medical_specialty}</>
            ) : null}
            {user.service_types?.length ? (
              <> · {user.service_types.length} serviço{user.service_types.length !== 1 ? "s" : ""}</>
            ) : null}
          </span>
        </div>

        {pendingSetup && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendPending}
            className="shrink-0 text-xs text-amber-600 dark:text-amber-400 border border-amber-400/40 rounded px-2 py-0.5 hover:bg-amber-400/10 transition-colors"
          >
            {resendPending ? "…" : "Reenviar convite"}
          </button>
        )}
        <span className="text-xs text-muted-foreground shrink-0">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <EditForm
          user={user}
          onSaved={(updated) => { onSaved(updated); onToggle(); }}
          onCancel={onToggle}
        />
      )}
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export function UsersClient({ initialUsers }: { initialUsers: UserWithEmail[] }) {
  const [users, setUsers] = useState<UserWithEmail[]>(initialUsers);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  function refresh() {
    startTransition(async () => {
      const fresh = await listUsers();
      setUsers(fresh);
    });
  }

  function handleSaved(updated: UserWithEmail) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      roleLabel(u.role).toLowerCase().includes(search.toLowerCase())
  );

  const active = filtered.filter((u) => u.active);
  const inactive = filtered.filter((u) => !u.active);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Voluntários</h2>
          <p className="text-xs text-muted-foreground">
            {users.filter((u) => u.active).length} ativos · {users.filter((u) => !u.active).length} inativos
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isPending}
          className="h-8 px-3 text-xs shrink-0"
        >
          {isPending ? "…" : "Atualizar"}
        </Button>
      </div>

      <InviteForm onInvited={refresh} />

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome, e-mail ou função…"
        className="h-9 text-sm max-w-sm mx-2"
      />

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ativos ({active.length})
          </p>
          {active.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              expanded={expandedId === u.id}
              onToggle={() => setExpandedId(expandedId === u.id ? null : u.id)}
              onSaved={handleSaved}
            />
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Inativos ({inactive.length})
          </p>
          {inactive.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              expanded={expandedId === u.id}
              onToggle={() => setExpandedId(expandedId === u.id ? null : u.id)}
              onSaved={handleSaved}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum voluntário encontrado.
        </p>
      )}
    </div>
  );
}
