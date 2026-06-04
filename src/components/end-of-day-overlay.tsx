"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import type { RecapData } from "@/app/api/recap/route";

// ─── Confetti ─────────────────────────────────────────────────────────────────

const COLORS = [
  "#ff595e", "#ffca3a", "#6a4c93", "#1982c4", "#8ac926",
  "#ff924c", "#c77dff", "#4cc9f0", "#f72585", "#4361ee",
];

export function Confetti() {
  useEffect(() => {
    // Centre burst
    confetti({
      particleCount: 140,
      spread: 100,
      startVelocity: 55,
      origin: { x: 0.5, y: 0.55 },
      colors: COLORS,
      zIndex: 9999,
    });

    // Side cannons slightly after
    const t1 = setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 65,
        startVelocity: 60,
        origin: { x: 0, y: 0.65 },
        colors: COLORS,
        zIndex: 9999,
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 65,
        startVelocity: 60,
        origin: { x: 1, y: 0.65 },
        colors: COLORS,
        zIndex: 9999,
      });
    }, 250);

    // Second wave from centre — slower, different shapes
    const t2 = setTimeout(() => {
      confetti({
        particleCount: 90,
        spread: 130,
        startVelocity: 30,
        origin: { x: 0.5, y: 0.5 },
        colors: COLORS,
        shapes: ["circle"],
        scalar: 0.85,
        zIndex: 9999,
      });
    }, 550);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      confetti.reset();
    };
  }, []);

  return null; // canvas-confetti manages its own canvas
}

// ─── Recap card ───────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function RecapStats({ data }: { data: RecapData }) {
  // Pick the best numbers to show depending on the worker's role
  const hasProfessionalStats = data.completedCount > 0;
  const hasNursingStats = !hasProfessionalStats && (data.nursingCount ?? 0) > 0;
  const hasRegistrationStats =
    !hasProfessionalStats && !hasNursingStats && (data.registeredCount ?? 0) > 0;

  if (hasProfessionalStats) {
    // Count shown in header — only show service breakdown + time here
    return (
      <div className="space-y-3">
        {data.services.length > 0 && (
          <div className="space-y-1.5">
            {data.services.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{s.label}</span>
                <span className="font-medium tabular-nums">{s.count}</span>
              </div>
            ))}
          </div>
        )}
        {(data.startedAt || data.endedAt) && (
          <p className="text-xs text-muted-foreground text-center">
            {formatTime(data.startedAt)} — {formatTime(data.endedAt)}
          </p>
        )}
      </div>
    );
  }

  // Nursing and reception: count shown in header — nothing extra to show
  if (hasNursingStats || hasRegistrationStats) {
    return null;
  }

  // No data at all — coordinator / support role
  return (
    <p className="text-sm text-muted-foreground text-center py-1">
      Seu papel foi fundamental para o evento acontecer.
    </p>
  );
}

function RecapCard({ data }: { data: RecapData }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const count =
    data.completedCount > 0
      ? data.peopleSeen
      : (data.nursingCount ?? 0) > 0
        ? data.nursingCount
        : (data.registeredCount ?? 0) > 0
          ? data.registeredCount
          : null;

  async function handleShare() {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        name: data.volunteerName,
        specialty: data.volunteerSpecialty ?? "",
        isProfessional: String(data.volunteerIsProfessional),
      });
      const res = await fetch(`/api/share-card?${params}`);
      const blob = await res.blob();
      const file = new File([blob], "voluntario-acao-social.png", { type: "image/png" });

      let shared = false;
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          shared = true;
        } catch {
          // user cancelled or share failed — fall through to download
        }
      }

      if (!shared) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "voluntario-acao-social.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      // user cancelled — silent
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="relative z-10 bg-background rounded-2xl border border-border shadow-lg p-6 space-y-5 max-w-sm w-full mx-4">
      <div className="text-center space-y-2">
        <p className="text-3xl">🎉</p>
        <h1 className="text-xl font-bold">Que dia incrível!</h1>
        {count != null ? (
          <>
            <p className="text-sm text-muted-foreground">
              O seu atendimento levou esperança para
            </p>
            <p className="text-5xl font-bold tabular-nums">{count}</p>
            <p className="text-sm text-muted-foreground">
              {count === 1 ? "pessoa" : "pessoas"} hoje.
            </p>
            <p className="text-sm text-muted-foreground">Você foi essencial!</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Você foi essencial!</p>
        )}
      </div>

      <RecapStats data={data} />

      <Button onClick={handleShare} disabled={isGenerating} className="w-full" size="sm">
        {isGenerating ? "Preparando…" : "Celebre seu dia"}
      </Button>
    </div>
  );
}

// ─── Volunteer overlay (confetti + recap) ─────────────────────────────────────

export function EndOfDayOverlay({ eventId }: { eventId: string }) {
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/recap?eventId=${eventId}`)
      .then((r) => r.json())
      .then((data) => { setRecap(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [eventId]);

  return (
    <>
      {/* Backdrop — behind confetti canvas (z-9999) */}
      <div className="fixed inset-0 z-50 bg-background/90" />
      <Confetti />
      {/* Content — above confetti canvas */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto">
          {loading ? (
            <div className="text-center space-y-3">
              <p className="text-3xl animate-bounce">🎉</p>
              <p className="text-sm text-muted-foreground">Carregando resumo…</p>
            </div>
          ) : recap ? (
            <RecapCard data={recap} />
          ) : (
            <div className="text-center space-y-3 px-4">
              <p className="text-3xl">🎉</p>
              <h1 className="text-xl font-bold">Obrigado pelo seu dia!</h1>
              <p className="text-sm text-muted-foreground">
                Que Deus abençoe cada vida tocada hoje!
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Admin overlay (confetti only, no recap) ─────────────────────────────────

export function AdminEndOfDayOverlay() {
  return (
    <>
      {/* Backdrop — behind confetti canvas (z-9999) */}
      <div className="fixed inset-0 z-50 bg-background/90" />
      <Confetti />
      {/* Content — above confetti canvas */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto text-center space-y-3 px-4 max-w-xs">
          <p className="text-4xl">🎉</p>
          <h1 className="text-2xl font-bold">Evento encerrado!</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Que Deus abençoe cada vida tocada hoje. Missão cumprida!
          </p>
        </div>
      </div>
    </>
  );
}
