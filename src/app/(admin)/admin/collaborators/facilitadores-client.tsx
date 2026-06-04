"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addFacilitador, deleteFacilitador } from "./actions";
import type { Facilitador } from "./actions";

interface Props {
  eventId: string;
  initialFacilitadores: Facilitador[];
}

export function FacilitadoresClient({ eventId, initialFacilitadores }: Props) {
  const [list, setList] = useState<Facilitador[]>(initialFacilitadores);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const res = await addFacilitador({ eventId, name, role });
      if (res.error) { setError(res.error); return; }
      // Refresh list optimistically: append with temp id
      setList((prev) => [
        ...prev,
        { id: crypto.randomUUID(), event_id: eventId, name: name.trim(), role: role.trim(), created_at: new Date().toISOString() },
      ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setName("");
      setRole("");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteFacilitador(id);
      if (!res.error) setList((prev) => prev.filter((f) => f.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Facilitadores</h2>
        <p className="text-sm text-muted-foreground">
          Colaboradores presentes no evento sem acesso ao sistema.
        </p>
      </div>

      {/* Add form */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-4">
        <p className="text-sm font-medium">Adicionar facilitador</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="f-name">Nome</Label>
            <Input
              id="f-name"
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-role">Função</Label>
            <Input
              id="f-role"
              placeholder="Ex: Segurança, Cozinha, Transporte…"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={handleAdd}
          disabled={isPending || !name.trim() || !role.trim()}
          size="sm"
        >
          {isPending ? "Salvando…" : "Adicionar"}
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          {list.length} facilitador{list.length !== 1 ? "es" : ""} registrado{list.length !== 1 ? "s" : ""}
        </p>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum facilitador registrado ainda.
          </p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {list.map((f, i) => (
              <div
                key={f.id}
                className={`flex items-center justify-between px-4 py-3 gap-3 ${
                  i < list.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{f.role}</p>
                </div>
                <button
                  onClick={() => handleDelete(f.id)}
                  disabled={isPending}
                  className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
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
