"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getReportsData } from "@/lib/reports";
import type { ReportsData, ServiceStat, HourStat, AgeStat } from "@/lib/reports";

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
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
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
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isPending}
          className="h-8 px-3 text-xs"
        >
          {isPending ? "…" : "Atualizar"}
        </Button>
      </div>

      {/* Top KPI row — 4 big numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Pessoas registradas">
          <p className="text-4xl font-bold tabular-nums">{data.totalPeople}</p>
        </Card>

        <Card title="Média de serviços / pessoa">
          <p className="text-4xl font-bold tabular-nums">
            {data.avgServicesPerPerson.toFixed(1)}
          </p>
        </Card>

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

      {/* Middle row — services + peak chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Atendimentos por serviço">
          {data.peoplePerService.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem atendimentos concluídos.</p>
          ) : (
            <BarList items={data.peoplePerService} />
          )}
        </Card>

        <Card title="Pico de atendimento por hora">
          <PeakChart data={data.peakByHour} />
        </Card>
      </div>

      {/* Bottom row — wait time + dropout + age */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Tempo médio de espera">
          {data.avgWaitMinutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <BarList items={data.avgWaitMinutes} unit=" min" />
          )}
        </Card>

        <Card title="Taxa de evasão">
          {data.dropoutRate.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <BarList items={data.dropoutRate} unit="%" />
          )}
        </Card>

        <Card title="Faixa etária">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tabular-nums">
              {data.avgAge != null ? data.avgAge.toFixed(1) : "—"}
            </p>
            <p className="text-sm text-muted-foreground">anos (média)</p>
          </div>
          <AgeChart data={data.ageDistribution} total={data.totalPeople} />
        </Card>
      </div>
    </div>
  );
}
