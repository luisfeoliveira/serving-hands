"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  searchEventPeople,
  getPersonRecord,
  saveRecord,
  deleteRecord,
} from "./actions";
import type { EvangelismRecord } from "./actions";

interface Props {
  eventId: string;
  initialRecords: EvangelismRecord[];
}

interface Checks {
  prayer: boolean;
  conversion: boolean;
  reconciliation: boolean;
}

const EMPTY_CHECKS: Checks = { prayer: false, conversion: false, reconciliation: false };

function CheckboxRow({
  checks,
  onChange,
}: {
  checks: Checks;
  onChange: (k: keyof Checks) => void;
}) {
  return (
    <div className="flex flex-wrap gap-5">
      {(["prayer", "conversion", "reconciliation"] as const).map((k) => (
        <label key={k} className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            checked={checks[k]}
            onCheckedChange={() => onChange(k)}
          />
          <span className="text-sm capitalize">
            {k === "prayer" ? "Oração" : k === "conversion" ? "Conversão" : "Reconciliação"}
          </span>
        </label>
      ))}
    </div>
  );
}

function RecordBadges({ r }: { r: EvangelismRecord }) {
  const tags = [
    r.prayer && "Oração",
    r.conversion && "Conversão",
    r.reconciliation && "Reconciliação",
  ].filter(Boolean) as string[];
  if (!tags.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export function EvangelismClient({ eventId, initialRecords }: Props) {
  const [tab, setTab] = useState<"registered" | "unregistered">("registered");
  const [records, setRecords] = useState<EvangelismRecord[]>(initialRecords);
  const [isPending, startTransition] = useTransition();

  // Registered person flow
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; cpf: string }[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string } | null>(null);
  const [registeredChecks, setRegisteredChecks] = useState<Checks>(EMPTY_CHECKS);
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unregistered person flow
  const [unregName, setUnregName] = useState("");
  const [unregChecks, setUnregChecks] = useState<Checks>(EMPTY_CHECKS);
  const [unregError, setUnregError] = useState<string | null>(null);

  function handleQueryChange(val: string) {
    setQuery(val);
    setSelectedPerson(null);
    setRegisteredChecks(EMPTY_CHECKS);
    setExistingRecordId(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchEventPeople(eventId, val);
        setSearchResults(results);
      });
    }, 300);
  }

  async function handleSelectPerson(p: { id: string; name: string }) {
    setSelectedPerson(p);
    setSearchResults([]);
    setQuery(p.name);
    startTransition(async () => {
      const existing = await getPersonRecord(eventId, p.id);
      if (existing) {
        setRegisteredChecks({
          prayer: existing.prayer,
          conversion: existing.conversion,
          reconciliation: existing.reconciliation,
        });
        setExistingRecordId(existing.id);
      } else {
        setRegisteredChecks(EMPTY_CHECKS);
        setExistingRecordId(null);
      }
    });
  }

  function handleSaveRegistered() {
    if (!selectedPerson) return;
    setRegError(null);
    startTransition(async () => {
      const res = await saveRecord({
        eventId,
        personId: selectedPerson.id,
        personName: selectedPerson.name,
        ...registeredChecks,
      });
      if (res.error) { setRegError(res.error); return; }
      const updated: EvangelismRecord = {
        id: existingRecordId ?? crypto.randomUUID(),
        event_id: eventId,
        person_id: selectedPerson.id,
        person_name: selectedPerson.name,
        ...registeredChecks,
        recorded_by: null,
        created_at: new Date().toISOString(),
      };
      setRecords((prev) => {
        const filtered = prev.filter((r) => r.person_id !== selectedPerson.id);
        return [updated, ...filtered];
      });
      setQuery("");
      setSelectedPerson(null);
      setRegisteredChecks(EMPTY_CHECKS);
      setExistingRecordId(null);
    });
  }

  function handleSaveUnregistered() {
    if (!unregName.trim()) { setUnregError("Informe o nome da pessoa."); return; }
    setUnregError(null);
    startTransition(async () => {
      const res = await saveRecord({
        eventId,
        personName: unregName,
        ...unregChecks,
      });
      if (res.error) { setUnregError(res.error); return; }
      setRecords((prev) => [
        {
          id: crypto.randomUUID(),
          event_id: eventId,
          person_id: null,
          person_name: unregName.trim(),
          ...unregChecks,
          recorded_by: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setUnregName("");
      setUnregChecks(EMPTY_CHECKS);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteRecord(id);
      if (!res.error) setRecords((prev) => prev.filter((r) => r.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Evangelismo</h2>
        <p className="text-sm text-muted-foreground">
          Registre orações, conversões e reconciliações do evento.
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex rounded-lg border border-border overflow-hidden text-sm">
        <button
          onClick={() => setTab("registered")}
          className={`flex-1 py-2 transition-colors ${
            tab === "registered"
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:bg-muted/40"
          }`}
        >
          Pessoa cadastrada
        </button>
        <button
          onClick={() => setTab("unregistered")}
          className={`flex-1 py-2 transition-colors border-l border-border ${
            tab === "unregistered"
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:bg-muted/40"
          }`}
        >
          Não cadastrada
        </button>
      </div>

      {/* Registered person form */}
      {tab === "registered" && (
        <div className="rounded-xl border border-border bg-background p-4 space-y-4">
          <div className="space-y-1.5 relative">
            <Label htmlFor="ev-search">Buscar por nome</Label>
            <Input
              id="ev-search"
              placeholder="Digite o nome..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              autoComplete="off"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-background shadow-lg overflow-hidden">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPerson(p)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                  >
                    <span className="font-medium">{p.name}</span>
                    {p.cpf && (
                      <span className="ml-2 text-xs text-muted-foreground">{p.cpf}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPerson && (
            <>
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">{selectedPerson.name}</span>
                {existingRecordId && (
                  <span className="ml-2 text-xs text-muted-foreground">(registro existente)</span>
                )}
              </div>
              <CheckboxRow
                checks={registeredChecks}
                onChange={(k) => setRegisteredChecks((prev) => ({ ...prev, [k]: !prev[k] }))}
              />
              {regError && <p className="text-sm text-destructive">{regError}</p>}
              <Button onClick={handleSaveRegistered} disabled={isPending} size="sm">
                {isPending ? "Salvando…" : existingRecordId ? "Atualizar" : "Salvar"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Unregistered person form */}
      {tab === "unregistered" && (
        <div className="rounded-xl border border-border bg-background p-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-name">Nome da pessoa</Label>
            <Input
              id="ev-name"
              placeholder="Nome completo"
              value={unregName}
              onChange={(e) => setUnregName(e.target.value)}
            />
          </div>
          <CheckboxRow
            checks={unregChecks}
            onChange={(k) => setUnregChecks((prev) => ({ ...prev, [k]: !prev[k] }))}
          />
          {unregError && <p className="text-sm text-destructive">{unregError}</p>}
          <Button
            onClick={handleSaveUnregistered}
            disabled={isPending || !unregName.trim()}
            size="sm"
          >
            {isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      )}

      {/* Records list */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          {records.length} registro{records.length !== 1 ? "s" : ""} no evento
        </p>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum registro ainda.
          </p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {records.map((r, i) => (
              <div
                key={r.id}
                className={`flex items-start justify-between px-4 py-3 gap-3 ${
                  i < records.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{r.person_name}</p>
                    {!r.person_id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        não cadastrado
                      </span>
                    )}
                  </div>
                  <RecordBadges r={r} />
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={isPending}
                  className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
