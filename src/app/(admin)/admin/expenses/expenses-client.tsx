"use client";

import { useState, useTransition } from "react";
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
import { addExpense, deleteExpense } from "./actions";
import type { Expense } from "./actions";
import { EXPENSE_CATEGORIES } from "./categories";
import type { ExpenseCategory } from "./categories";

interface Props {
  eventId: string;
  initialExpenses: Expense[];
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ExpensesClient({ eventId, initialExpenses }: Props) {
  const [list, setList] = useState<Expense[]>(initialExpenses);
  const [category, setCategory] = useState<ExpenseCategory>(EXPENSE_CATEGORIES[0]);
  const [item, setItem] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalExpenses = list.reduce(
    (sum, e) => sum + e.unit_value * e.quantity,
    0
  );

  // Group by category for display
  const grouped: Record<string, Expense[]> = {};
  for (const e of list) {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category].push(e);
  }

  function handleAdd() {
    setError(null);
    const uv = parseFloat(unitValue.replace(",", "."));
    const qty = parseInt(quantity, 10);
    if (!item.trim() || isNaN(uv) || uv <= 0 || isNaN(qty) || qty < 1) {
      setError("Preencha todos os campos corretamente.");
      return;
    }
    startTransition(async () => {
      const res = await addExpense({
        eventId,
        category,
        item,
        unitValue: uv,
        quantity: qty,
      });
      if (res.error) { setError(res.error); return; }
      setList((prev) =>
        [...prev, {
          id: crypto.randomUUID(),
          event_id: eventId,
          category,
          item: item.trim(),
          unit_value: uv,
          quantity: qty,
          created_at: new Date().toISOString(),
        }]
          .sort((a, b) => a.category.localeCompare(b.category, "pt-BR") || a.created_at.localeCompare(b.created_at))
      );
      setItem("");
      setUnitValue("");
      setQuantity("1");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteExpense(id);
      if (!res.error) setList((prev) => prev.filter((e) => e.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Gastos do evento</h2>
        <p className="text-sm text-muted-foreground">
          Registre cada item com valor unitário e quantidade.
        </p>
      </div>

      {/* Add form */}
      <div className="rounded-xl border border-border bg-background p-4 space-y-4">
        <p className="text-sm font-medium">Adicionar item</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ExpenseCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-item">Descrição</Label>
            <Input
              id="g-item"
              placeholder="Ex: Resma de papel A4"
              value={item}
              onChange={(e) => setItem(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-uv">Valor unitário (R$)</Label>
            <Input
              id="g-uv"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={unitValue}
              onChange={(e) => setUnitValue(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-qty">Quantidade</Label>
            <Input
              id="g-qty"
              type="number"
              min="1"
              step="1"
              placeholder="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={handleAdd}
          disabled={isPending || !item.trim() || !unitValue}
          size="sm"
        >
          {isPending ? "Salvando…" : "Adicionar"}
        </Button>
      </div>

      {/* Total */}
      {list.length > 0 && (
        <div className="rounded-xl border border-border bg-background px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">Total geral</span>
          <span className="text-lg font-bold tabular-nums">{fmtBRL(totalExpenses)}</span>
        </div>
      )}

      {/* Grouped list */}
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum gasto registrado ainda.
        </p>
      ) : (
        <div className="space-y-4">
          {EXPENSE_CATEGORIES.filter((c) => grouped[c]?.length).map((cat) => {
            const items = grouped[cat];
            const catTotal = items.reduce(
              (sum, e) => sum + e.unit_value * e.quantity,
              0
            );
            return (
              <div key={cat} className="rounded-xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {cat}
                  </span>
                  <span className="text-xs font-semibold tabular-nums">
                    {fmtBRL(catTotal)}
                  </span>
                </div>
                {items.map((e, i) => (
                  <div
                    key={e.id}
                    className={`flex items-center justify-between px-4 py-3 gap-3 ${
                      i < items.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{e.item}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.quantity}× {fmtBRL(e.unit_value)} ={" "}
                        <span className="font-medium">{fmtBRL(e.unit_value * e.quantity)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={isPending}
                      className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
