"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getReportsData } from "@/lib/reports";
import type { ReportsData, ServiceStat, HourStat, AgeStat } from "@/lib/reports";

// ─── Section registry ─────────────────────────────────────────────────────────

const REPORT_SECTIONS = [
  { id: "kpis",        label: "KPIs principais" },
  { id: "bazar",       label: "Bazar" },
  { id: "evangelismo", label: "Evangelismo" },
  { id: "gastos",      label: "Gastos" },
  { id: "servicos",    label: "Atendimentos por serviço" },
  { id: "pico",        label: "Pico de atendimento" },
  { id: "espera",      label: "Tempo médio de espera" },
  { id: "evasao",      label: "Taxa de evasão" },
  { id: "faixa",       label: "Faixa etária" },
] as const;

type SectionId = (typeof REPORT_SECTIONS)[number]["id"];

// ─── Card shell ───────────────────────────────────────────────────────────────

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-background p-5 flex flex-col gap-3 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── Bar list ─────────────────────────────────────────────────────────────────

function BarList({ items, unit = "" }: { items: ServiceStat[]; unit?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2.5 flex-1">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground truncate pr-2">{item.label}</span>
            <span className="tabular-nums font-semibold text-foreground shrink-0">
              {item.value}{unit}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Peak chart ───────────────────────────────────────────────────────────────

function PeakChart({ data }: { data: HourStat[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-1 flex-1 min-w-0" style={{ minHeight: "80px", minWidth: `${data.length * 24}px` }}>
        {data.map((d) => (
          <div key={d.hour} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full flex items-end" style={{ height: "64px" }}>
              <div
                className="w-full rounded-t bg-primary/75 transition-all"
                style={{ height: `${Math.max((d.count / max) * 64, 3)}px` }}
                title={`${d.count} atendimentos`}
              />
            </div>
            <span className="text-[9px] text-muted-foreground tabular-nums leading-none">
              {d.hour}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Age bars ─────────────────────────────────────────────────────────────────

function AgeChart({ data, total }: { data: AgeStat[]; total: number }) {
  if (!total) return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  return (
    <div className="space-y-2.5 flex-1">
      {data.map((d) => {
        const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
        return (
          <div key={d.group} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">{d.group} anos</span>
              <span className="tabular-nums font-semibold text-foreground">
                {d.count}{" "}
                <span className="text-xs font-normal text-muted-foreground">({pct}%)</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ id, children }: { id: SectionId; children: React.ReactNode }) {
  return <div data-rs={id}>{children}</div>;
}

// ─── Main client ──────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  eventName: string;
  initialData: ReportsData;
}

export function ReportsClient({ eventId, eventName, initialData }: Props) {
  const [data, setData] = useState<ReportsData>(initialData);
  const [isPending, startTransition] = useTransition();
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showExport, setShowExport] = useState(false);
  const [selected, setSelected] = useState<Set<SectionId>>(
    new Set(REPORT_SECTIONS.map((s) => s.id))
  );

  function toggleSection(id: SectionId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(REPORT_SECTIONS.map((s) => s.id)));
  }

  function printReport() {
    const hiddenSelectors = REPORT_SECTIONS.filter((s) => !selected.has(s.id))
      .map((s) => `[data-rs="${s.id}"]`)
      .join(", ");

    const style = document.createElement("style");
    style.id = "__report_print";
    style.textContent = `@media print {
      .no-print { display: none !important; }
      ${hiddenSelectors ? `${hiddenSelectors} { display: none !important; }` : ""}
      [data-print-header] { display: block !important; margin-bottom: 24px; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }`;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  }

  function refresh() {
    startTransition(async () => {
      const fresh = await getReportsData(eventId);
      setData(fresh);
      setLastRefreshed(new Date());
    });
  }

  const fmtR = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-5">
      {/* Print-only header (hidden in screen) */}
      <div data-print-header style={{ display: "none" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>{eventName}</h1>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
          Relatório gerado em{" "}
          {new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Header row */}
      <div className="no-print flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold truncate">{eventName}</h2>
          <p className="text-xs text-muted-foreground">
            Atualizado às{" "}
            {lastRefreshed.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isPending}
            className="h-8 px-3 text-xs"
          >
            {isPending ? "…" : "Atualizar"}
          </Button>
          <Button
            variant={showExport ? "default" : "outline"}
            size="sm"
            onClick={() => setShowExport((v) => !v)}
            className="h-8 px-3 text-xs"
          >
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Export panel */}
      {showExport && (
        <div className="no-print rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Seções a incluir
            </p>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-primary hover:underline"
            >
              Selecionar tudo
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
            {REPORT_SECTIONS.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 text-sm cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggleSection(s.id)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                {s.label}
              </label>
            ))}
          </div>
          <div className="pt-1">
            <Button
              size="sm"
              onClick={printReport}
              disabled={selected.size === 0}
              className="h-8 px-4 text-xs"
            >
              Imprimir / Salvar PDF
            </Button>
            {selected.size === 0 && (
              <p className="mt-1.5 text-xs text-destructive">
                Selecione ao menos uma seção.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <Section id="kpis">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card title="Pessoas registradas">
            <p className="text-4xl font-bold tabular-nums">{data.totalPeople}</p>
          </Card>

          <Card title="Facilitadores">
            <p className="text-4xl font-bold tabular-nums">{data.facilitadoresCount}</p>
          </Card>

          <Card title="Total de atendimentos">
            <p className="text-4xl font-bold tabular-nums">{data.totalAttendances}</p>
          </Card>

          <Card title="Cestas básicas distribuídas">
            <p className="text-4xl font-bold tabular-nums">{data.cestaBasicaCount}</p>
          </Card>
        </div>
      </Section>

      {/* ── Bazar ── */}
      <Section id="bazar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card title="Total arrecadado (bazar)">
            <p className="text-3xl font-bold tabular-nums break-all">
              {fmtR(data.bazaarRevenue.total)}
            </p>
            {data.bazaarRevenue.total > 0 && (
              <p className="text-xs text-muted-foreground break-words">
                Dinheiro {fmtR(data.bazaarRevenue.cash)} · PIX {fmtR(data.bazaarRevenue.pix)}
              </p>
            )}
          </Card>

          <Card title="Média de peças / sacola (bazar)">
            <p className="text-4xl font-bold tabular-nums break-all">
              {data.bazaarAvgItems != null ? data.bazaarAvgItems.toFixed(1) : "—"}
            </p>
          </Card>
        </div>
      </Section>

      {/* ── Evangelismo ── */}
      {data.evangelismo.total > 0 && (
        <Section id="evangelismo">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card title="Abordagens">
              <p className="text-4xl font-bold tabular-nums">{data.evangelismo.total}</p>
            </Card>
            <Card title="Orações">
              <p className="text-4xl font-bold tabular-nums">{data.evangelismo.prayer}</p>
            </Card>
            <Card title="Conversões">
              <p className="text-4xl font-bold tabular-nums">{data.evangelismo.conversion}</p>
            </Card>
            <Card title="Reconciliações">
              <p className="text-4xl font-bold tabular-nums">{data.evangelismo.reconciliation}</p>
            </Card>
          </div>
        </Section>
      )}

      {/* ── Gastos ── */}
      {data.totalExpenses > 0 && (
        <Section id="gastos">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Total de gastos">
              <p className="text-3xl font-bold tabular-nums break-all">
                {fmtR(data.totalExpenses)}
              </p>
            </Card>
            <Card title="Gastos por categoria">
              <div className="space-y-2.5 flex-1">
                {data.expenses.map((e) => (
                  <div key={e.category} className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate pr-2">{e.category}</span>
                    <span className="tabular-nums font-semibold text-foreground shrink-0">
                      {fmtR(e.total)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Section>
      )}

      {/* ── Atendimentos por serviço ── */}
      <Section id="servicos">
        <Card title="Atendimentos por serviço">
          {data.peoplePerService.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem atendimentos concluídos.</p>
          ) : (
            <BarList items={data.peoplePerService} />
          )}
        </Card>
      </Section>

      {/* ── Pico por hora ── */}
      <Section id="pico">
        <Card title="Pico de atendimento por hora">
          <PeakChart data={data.peakByHour} />
        </Card>
      </Section>

      {/* ── Tempo médio de espera ── */}
      <Section id="espera">
        <Card title="Tempo médio de espera">
          {data.avgWaitMinutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <BarList items={data.avgWaitMinutes} unit=" min" />
          )}
        </Card>
      </Section>

      {/* ── Taxa de evasão ── */}
      <Section id="evasao">
        <Card title="Taxa de evasão">
          {data.dropoutRate.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <BarList items={data.dropoutRate} unit="%" />
          )}
        </Card>
      </Section>

      {/* ── Faixa etária ── */}
      <Section id="faixa">
        <Card title="Faixa etária">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tabular-nums">
              {data.avgAge != null ? data.avgAge.toFixed(1) : "—"}
            </p>
            <p className="text-sm text-muted-foreground">anos (média)</p>
          </div>
          <AgeChart data={data.ageDistribution} total={data.totalPeople} />
        </Card>
      </Section>
    </div>
  );
}
