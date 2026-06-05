"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ToothSurface, SurfaceState, ToothCondition, ToothData, OdontogramData } from "@/lib/types";

// ─── Visual config ────────────────────────────────────────────────────────────

const CONDITION_CONFIG: Record<ToothCondition, { label: string; fill: string; symbol: string; textFill: string }> = {
  extracao: { label: "Extração indicada", fill: "#fecaca", symbol: "X", textFill: "#dc2626" },
};

const SURFACE_CONFIG: Record<SurfaceState, { label: string; color: string; hover: string; dot: string }> = {
  carie:                    { label: "Cárie",                    dot: "bg-red-600",  color: "#dc2626", hover: "#fee2e2" },
  restauracao:              { label: "Restauração",              dot: "bg-red-400",  color: "#f87171", hover: "#fee2e2" },
  restauracao_satisfatoria: { label: "Rest. satisfatória",       dot: "bg-blue-400", color: "#60a5fa", hover: "#dbeafe" },
};

const SURFACE_ABBR: Record<ToothSurface, string> = {
  V: "V", L: "L", M: "M", D: "D", O: "O",
};

const IDLE_FILL = "#f9fafb"; // gray-50

// ─── SVG geometry ─────────────────────────────────────────────────────────────
// ViewBox 0 0 30 30, center (15,15), outer r=13
// V (top wedge), M (left), D (right), L (bottom), O (center circle)
const WEDGE_PATHS: Record<Exclude<ToothSurface, "O">, string> = {
  V: "M 15,15 L 5.8,5.8   A 13,13 0 0,1 24.2,5.8  Z",
  M: "M 15,15 L 5.8,24.2  A 13,13 0 0,1 5.8,5.8   Z",
  D: "M 15,15 L 24.2,5.8  A 13,13 0 0,1 24.2,24.2 Z",
  L: "M 15,15 L 24.2,24.2 A 13,13 0 0,1 5.8,24.2  Z",
};

// ─── Tooth arrays (FDI, patient-facing display) ───────────────────────────────

const UPPER_ADULT   = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ADULT   = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const UPPER_PRIMARY = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const LOWER_PRIMARY = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const ADULT_MIDLINE_BEFORE   = 8;
const PRIMARY_MIDLINE_BEFORE = 5;
// 3 adult slots (48px SVG + 2px gap = 50px/slot × 3) − trailing gap = 148px
const PRIMARY_INSET = 148;

// ─── Summary list ─────────────────────────────────────────────────────────────

function MarkedTeethSummary({ value }: { value: OdontogramData }) {
  const entries = (Object.entries(value) as [string, ToothData | undefined][])
    .filter((entry): entry is [string, ToothData] => {
      const d = entry[1];
      return !!d && (!!d.condition || (!!d.surfaces && Object.keys(d.surfaces).length > 0));
    })
    .sort(([a], [b]) => Number(a) - Number(b));

  if (entries.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-muted/20 p-2.5 space-y-1.5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Registro</p>
      <ul className="space-y-1">
        {entries.map(([tooth, data]) => {
          const parts: string[] = [];

          if (data.condition) {
            parts.push(CONDITION_CONFIG[data.condition].label);
          }

          // Group surfaces by state
          const bySurface: Partial<Record<SurfaceState, ToothSurface[]>> = {};
          for (const [surf, state] of Object.entries(data.surfaces ?? {})) {
            if (!bySurface[state as SurfaceState]) bySurface[state as SurfaceState] = [];
            bySurface[state as SurfaceState]!.push(surf as ToothSurface);
          }
          for (const [state, surfs] of Object.entries(bySurface) as [SurfaceState, ToothSurface[]][]) {
            parts.push(`${SURFACE_CONFIG[state].label}: ${surfs.map(s => SURFACE_ABBR[s]).join(", ")}`);
          }

          return (
            <li key={tooth} className="text-xs flex gap-2">
              <span className="font-semibold tabular-nums text-foreground shrink-0 w-8">D.{tooth}</span>
              <span className="text-muted-foreground">{parts.join(" · ")}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── SVG tooth ────────────────────────────────────────────────────────────────

function ToothSVG({
  data,
  activeTool,
  selected,
  readOnly,
  onSurface,
}: {
  data: ToothData | undefined;
  activeTool: SurfaceState;
  selected: boolean;
  readOnly: boolean;
  onSurface: (s: ToothSurface) => void;
}) {
  const [hovered, setHovered] = useState<ToothSurface | null>(null);
  const condition = data?.condition;
  const surfaces = data?.surfaces ?? {};
  const condCfg = condition ? CONDITION_CONFIG[condition] : null;
  const outerStroke = selected ? "#6366f1" : "#9ca3af";
  const outerWidth  = selected ? "2" : "1.5";

  function fill(surface: ToothSurface): string {
    const state = surfaces[surface];
    if (state) return SURFACE_CONFIG[state].color;
    if (!readOnly && hovered === surface) return SURFACE_CONFIG[activeTool].hover;
    return IDLE_FILL;
  }

  // Whole-tooth condition: filled circle with symbol
  if (condCfg) {
    return (
      <svg width="48" height="48" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="13" fill={condCfg.fill} />
        <text x="15" y="19.5" textAnchor="middle" fontSize="11" fontWeight="bold" fill={condCfg.textFill}>
          {condCfg.symbol}
        </text>
        <circle cx="15" cy="15" r="13" fill="none" stroke={outerStroke} strokeWidth={outerWidth} />
      </svg>
    );
  }

  return (
    <svg width="48" height="48" viewBox="0 0 30 30">
      {/* Base fill */}
      <circle cx="15" cy="15" r="13" fill={IDLE_FILL} />

      {/* 4 peripheral wedges */}
      {(["V", "M", "D", "L"] as const).map((s) => (
        <path
          key={s}
          d={WEDGE_PATHS[s]}
          fill={fill(s)}
          stroke="white"
          strokeWidth="0.75"
          style={{ cursor: readOnly ? "default" : "pointer" }}
          onMouseEnter={() => !readOnly && setHovered(s)}
          onMouseLeave={() => setHovered(null)}
          onClick={(e) => { e.stopPropagation(); !readOnly && onSurface(s); }}
        />
      ))}

      {/* O – center circle */}
      <circle
        cx="15" cy="15" r="5"
        fill={fill("O")}
        stroke="white"
        strokeWidth="0.75"
        style={{ cursor: readOnly ? "default" : "pointer" }}
        onMouseEnter={() => !readOnly && setHovered("O")}
        onMouseLeave={() => setHovered(null)}
        onClick={(e) => { e.stopPropagation(); !readOnly && onSurface("O"); }}
      />

      {/* Outer border */}
      <circle cx="15" cy="15" r="13" fill="none" stroke={outerStroke} strokeWidth={outerWidth} />
    </svg>
  );
}

// ─── Tooth cell (SVG + number label) ─────────────────────────────────────────

function ToothCell({
  tooth, data, arch, activeTool, selectedTooth, readOnly, onSurface, onToothClick,
}: {
  tooth: number; data: ToothData | undefined; arch: "upper" | "lower";
  activeTool: SurfaceState; selectedTooth: number | null; readOnly: boolean;
  onSurface: (t: number, s: ToothSurface) => void; onToothClick: (t: number) => void;
}) {
  const selected = selectedTooth === tooth;
  const numBtn = (
    <button
      type="button"
      onClick={() => onToothClick(tooth)}
      className={cn(
        "text-[10px] tabular-nums leading-none transition-colors px-px",
        selected ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {tooth}
    </button>
  );

  return (
    <div className={cn("flex flex-col items-center gap-px", arch === "lower" && "flex-col-reverse")}>
      {numBtn}
      <ToothSVG
        data={data}
        activeTool={activeTool}
        selected={selected}
        readOnly={readOnly}
        onSurface={(s) => onSurface(tooth, s)}
      />
    </div>
  );
}

// ─── Arch row ─────────────────────────────────────────────────────────────────

function ArchRow({
  teeth, arch, midlineBefore, value, activeTool, selectedTooth, readOnly, onSurface, onToothClick, inset = 0,
}: {
  teeth: number[]; arch: "upper" | "lower"; midlineBefore: number;
  value: OdontogramData; activeTool: SurfaceState; selectedTooth: number | null;
  readOnly: boolean; onSurface: (t: number, s: ToothSurface) => void;
  onToothClick: (t: number) => void; inset?: number;
}) {
  const nodes: React.ReactNode[] = [];

  if (inset > 0) nodes.push(<div key="il" style={{ width: inset }} className="shrink-0" />);

  teeth.forEach((tooth, idx) => {
    if (idx === midlineBefore) {
      nodes.push(<div key="gap" className="w-px bg-border/60 mx-[3px] self-stretch" />);
    }
    nodes.push(
      <ToothCell
        key={tooth} tooth={tooth} data={value[String(tooth)]} arch={arch}
        activeTool={activeTool} selectedTooth={selectedTooth} readOnly={readOnly}
        onSurface={onSurface} onToothClick={onToothClick}
      />
    );
  });

  if (inset > 0) nodes.push(<div key="ir" style={{ width: inset }} className="shrink-0" />);

  return (
    <div className={cn("flex gap-[2px]", arch === "upper" ? "items-end" : "items-start")}>
      {nodes}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface OdontogramProps {
  value: OdontogramData;
  onChange?: (data: OdontogramData) => void;
  readOnly?: boolean;
}

export function Odontogram({ value, onChange, readOnly = false }: OdontogramProps) {
  const [activeTool, setActiveTool] = useState<SurfaceState>("carie");
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  function handleSurface(tooth: number, surface: ToothSurface) {
    if (readOnly || !onChange) return;
    const cur = value[String(tooth)] ?? {};
    const surfs = { ...(cur.surfaces ?? {}) };
    if (surfs[surface] === activeTool) {
      delete surfs[surface];
    } else {
      surfs[surface] = activeTool;
    }
    onChange({ ...value, [String(tooth)]: { ...cur, surfaces: surfs } });
  }

  function handleToothClick(tooth: number) {
    if (readOnly) return;
    setSelectedTooth((prev) => (prev === tooth ? null : tooth));
  }

  function handleConditionSet(condition: ToothCondition | null) {
    if (!selectedTooth || !onChange) return;
    const cur = value[String(selectedTooth)] ?? {};
    if (condition === null) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { condition: _removed, ...rest } = cur;
      onChange({ ...value, [String(selectedTooth)]: rest });
    } else {
      onChange({ ...value, [String(selectedTooth)]: { ...cur, condition } });
    }
    setSelectedTooth(null);
  }

  const archProps = { value, activeTool, selectedTooth, readOnly, onSurface: handleSurface, onToothClick: handleToothClick };

  return (
    <div className="space-y-3">
      {/* Tool selector */}
      {!readOnly && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(SURFACE_CONFIG) as [SurfaceState, (typeof SURFACE_CONFIG)[SurfaceState]][]).map(([tool, cfg]) => (
              <button
                key={tool}
                type="button"
                onClick={() => setActiveTool(tool)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                  activeTool === tool
                    ? "bg-muted border-foreground/30 text-foreground shadow-sm"
                    : "bg-white border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", cfg.dot)} />
                {cfg.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Clique na face do dente para marcar · Clique no número para extração
          </p>
        </div>
      )}

      {/* Tooth grid */}
      <div className="overflow-x-auto">
        <div className="min-w-max space-y-0.5 py-1 px-0.5">
          <ArchRow teeth={UPPER_ADULT}   arch="upper" midlineBefore={ADULT_MIDLINE_BEFORE}   {...archProps} />
          <ArchRow teeth={UPPER_PRIMARY} arch="upper" midlineBefore={PRIMARY_MIDLINE_BEFORE} inset={PRIMARY_INSET} {...archProps} />
          <div className="h-px bg-border mx-1 my-0.5" />
          <ArchRow teeth={LOWER_PRIMARY} arch="lower" midlineBefore={PRIMARY_MIDLINE_BEFORE} inset={PRIMARY_INSET} {...archProps} />
          <ArchRow teeth={LOWER_ADULT}   arch="lower" midlineBefore={ADULT_MIDLINE_BEFORE}   {...archProps} />
        </div>
      </div>

      {/* Condition picker */}
      {!readOnly && selectedTooth && (
        <div className="rounded-md border border-border bg-muted/20 p-2.5 space-y-2">
          <p className="text-[11px] text-muted-foreground font-medium">
            Dente {selectedTooth} — condição geral:
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleConditionSet(null)}
              className="px-2 py-1 rounded border border-border bg-white text-xs font-medium hover:bg-muted/50 transition-colors"
            >
              Limpar
            </button>
            {(Object.entries(CONDITION_CONFIG) as [ToothCondition, (typeof CONDITION_CONFIG)[ToothCondition]][]).map(
              ([cond, cfg]) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => handleConditionSet(cond)}
                  style={{ backgroundColor: cfg.fill, color: cfg.textFill, borderColor: cfg.textFill + "80" }}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium transition-all hover:opacity-80",
                    value[String(selectedTooth)]?.condition === cond && "ring-2 ring-primary ring-offset-1"
                  )}
                >
                  <span className="font-bold">{cfg.symbol}</span>
                  {cfg.label}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Marked teeth summary */}
      <MarkedTeethSummary value={value} />

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground">
        {(Object.entries(SURFACE_CONFIG) as [SurfaceState, (typeof SURFACE_CONFIG)[SurfaceState]][]).map(([, cfg]) => (
          <span key={cfg.label} className="flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
            {cfg.label}
          </span>
        ))}
        {(Object.entries(CONDITION_CONFIG) as [ToothCondition, (typeof CONDITION_CONFIG)[ToothCondition]][]).map(([, cfg]) => (
          <span key={cfg.label} className="flex items-center gap-1">
            <span style={{ backgroundColor: cfg.fill }} className="w-2 h-2 rounded-full border border-gray-300 shrink-0" />
            {cfg.label}
          </span>
        ))}
      </div>
    </div>
  );
}
