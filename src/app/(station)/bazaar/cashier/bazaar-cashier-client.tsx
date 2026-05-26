"use client";

import { useEffect, useState, useCallback, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { getBazaarBrowsingEntries } from "@/lib/queue";
import { PriorityBadge } from "@/components/queue/priority-badge";
import { completeBazaarSale } from "./actions";
import { BAZAAR_PRICE_PER_ITEM, BAZAAR_MAX_ITEMS } from "../constants";
import { cn } from "@/lib/utils";
import type { QueueEntry } from "@/lib/types";

type PaymentMethod = "dinheiro" | "pix";

// ─── Checkout panel ───────────────────────────────────────────────────────────

function CheckoutPanel({
  entry,
  onSuccess,
  onCancel,
}: {
  entry: QueueEntry;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<PaymentMethod>("dinheiro");
  const [received, setReceived] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = qty * BAZAAR_PRICE_PER_ITEM;
  const receivedNum = parseFloat(received) || 0;
  const change = receivedNum - total;
  const canSubmit =
    qty >= 1 &&
    qty <= BAZAAR_MAX_ITEMS &&
    (method === "pix" || receivedNum >= total);

  function submit() {
    if (!canSubmit) return;
    startTransition(async () => {
      const r = await completeBazaarSale({
        entryId: entry.id,
        qty,
        method,
        received: method === "dinheiro" ? receivedNum : undefined,
      });
      if (r.error) {
        toast.error(r.error);
      } else {
        const changeMsg =
          method === "dinheiro" && change > 0
            ? ` · Troco R$${change.toFixed(2)}`
            : "";
        toast.success(
          `Venda concluída — ${qty} ${qty === 1 ? "peça" : "peças"}, R$${total.toFixed(2)}${changeMsg}`
        );
        onSuccess();
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      {/* Person strip */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-emerald-700 tabular-nums">{entry.position}</span>
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{entry.person.name}</span>
          <span className="text-xs text-muted-foreground">{entry.person.age} anos</span>
          {entry.priority && <PriorityBadge />}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground shrink-0"
        >
          Cancelar
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Qty picker */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Quantidade de peças
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-lg font-medium hover:bg-muted/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={BAZAAR_MAX_ITEMS}
              value={qty}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v)) setQty(Math.min(BAZAAR_MAX_ITEMS, Math.max(1, v)));
              }}
              className="w-14 text-center text-2xl font-bold tabular-nums border border-border rounded-lg h-10 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(BAZAAR_MAX_ITEMS, q + 1))}
              disabled={qty >= BAZAAR_MAX_ITEMS}
              className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-lg font-medium hover:bg-muted/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
            <span className="text-xs text-muted-foreground">máx. {BAZAAR_MAX_ITEMS}</span>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-baseline justify-between rounded-lg bg-muted/50 px-4 py-3">
          <span className="text-sm text-muted-foreground">{qty} × R${BAZAAR_PRICE_PER_ITEM.toFixed(2)}</span>
          <span className="text-3xl font-bold tabular-nums">R${total.toFixed(2)}</span>
        </div>

        {/* Payment method */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pagamento
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["dinheiro", "pix"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={cn(
                  "py-2.5 rounded-lg border text-sm font-medium transition-colors",
                  method === m
                    ? "bg-foreground text-background border-foreground"
                    : "border-border hover:bg-muted/40 text-foreground"
                )}
              >
                {m === "dinheiro" ? "Dinheiro" : "PIX"}
              </button>
            ))}
          </div>
        </div>

        {/* Cash calculator */}
        {method === "dinheiro" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Valor recebido
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">R$</span>
              <Input
                type="number"
                min={total}
                step="0.50"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                placeholder={total.toFixed(2)}
                className="h-10 text-base max-w-[140px]"
              />
            </div>
            {receivedNum > 0 && (
              <div
                className={cn(
                  "flex items-center justify-between rounded-lg px-4 py-3 mt-1",
                  change >= 0
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-red-50 border border-red-200"
                )}
              >
                <span className={cn("text-sm font-medium", change >= 0 ? "text-emerald-700" : "text-red-600")}>
                  Troco
                </span>
                <span className={cn("text-2xl font-bold tabular-nums", change >= 0 ? "text-emerald-700" : "text-red-600")}>
                  {change < 0 ? "−" : ""}R${Math.abs(change).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Confirm */}
        <Button
          onClick={submit}
          disabled={isPending || !canSubmit}
          className="w-full h-11 text-sm font-semibold"
        >
          {isPending ? "…" : "Concluir venda"}
        </Button>
      </div>
    </div>
  );
}

// ─── Person list row ──────────────────────────────────────────────────────────

function BrowsingRow({
  entry,
  onSelect,
}: {
  entry: QueueEntry;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors text-left"
    >
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
        <span className="text-xs font-bold tabular-nums">{entry.position}</span>
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="font-medium text-sm">{entry.person.name}</span>
        <span className="text-xs text-muted-foreground">{entry.person.age} anos</span>
        {entry.priority && <PriorityBadge />}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">Cobrar →</span>
    </button>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  initialEntries: QueueEntry[];
}

export function BazaarCashierClient({ eventId, initialEntries }: Props) {
  const [entries, setEntries] = useState<QueueEntry[]>(initialEntries);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const fresh = await getBazaarBrowsingEntries(eventId);
      setEntries(fresh);
      setSelectedId((prev) => (fresh.some((e) => e.id === prev) ? prev : null));
    });
  }, [eventId]);

  useEffect(() => {
    refresh();

    const supabase = createClient();
    const channel = supabase
      .channel(`bazaar-cashier:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_registrations" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
          if (row?.event_id && row.event_id !== eventId) return;
          if (row?.service_type !== "bazar") return;

          if (debounceTimer.current) clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(() => refresh(), 200);
        }
      )
      .subscribe();

    const interval = setInterval(refresh, 10_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [eventId, refresh]);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Sem compras pendentes</p>
        <p className="text-sm text-muted-foreground">Aguardando pessoas no bazar.</p>
      </div>
    );
  }

  const selected = entries.find((e) => e.id === selectedId) ?? null;
  const others = entries.filter((e) => e.id !== selectedId);

  return (
    <div className="space-y-4">
      {selected ? (
        <CheckoutPanel
          entry={selected}
          onSuccess={() => { setSelectedId(null); refresh(); }}
          onCancel={() => setSelectedId(null)}
        />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          Selecione quem vai pagar
        </p>
      )}

      {others.length > 0 && (
        <div className="space-y-1.5">
          {selected && (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Outros no bazar ({others.length})
            </p>
          )}
          {others.map((e) => (
            <BrowsingRow key={e.id} entry={e} onSelect={() => setSelectedId(e.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
