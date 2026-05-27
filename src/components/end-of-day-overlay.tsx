"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { RecapData } from "@/app/api/recap/route";

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "#ff595e", "#ffca3a", "#6a4c93", "#1982c4", "#8ac926", "#ff924c",
  "#c77dff", "#4cc9f0", "#f72585", "#4361ee",
];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        left: `${(i * 1.12) % 100}%`,
        delay: `${(i * 0.04) % 3}s`,
        duration: `${3.5 + (i * 0.06) % 2}s`,
        shape: i % 3, // 0=circle, 1=rect, 2=rect-tall
        size: 7 + (i % 5),
      })),
    []
  );

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg);    opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
        {pieces.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: p.left,
              top: "-12px",
              width: p.shape === 2 ? `${p.size / 2}px` : `${p.size}px`,
              height: p.shape === 2 ? `${p.size * 1.8}px` : `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: p.shape === 0 ? "50%" : "2px",
              animation: `confetti-fall ${p.duration} ${p.delay} ease-in both`,
            }}
          />
        ))}
      </div>
    </>
  );
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

function RecapCard({ data }: { data: RecapData }) {
  const shareText =
    `Hoje fui voluntário na ${data.eventName} da Congregação Betel ` +
    `e ajudei a comunidade com muito amor! 🙏 #AçãoSocial #CongregaçãoBetel`;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // fallthrough to clipboard
      }
    }
    await navigator.clipboard.writeText(shareText);
    alert("Texto copiado para a área de transferência!");
  }

  return (
    <div className="bg-background rounded-2xl border border-border shadow-lg p-6 space-y-5 max-w-sm w-full mx-4">
      <div className="text-center space-y-1">
        <p className="text-3xl">🎉</p>
        <h1 className="text-xl font-bold">Que dia incrível!</h1>
        <p className="text-sm text-muted-foreground">
          Obrigado pelo seu voluntariado, {data.eventName}.
        </p>
      </div>

      {data.completedCount > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/40 px-4 py-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{data.peopleSeen}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.peopleSeen === 1 ? "pessoa atendida" : "pessoas atendidas"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 px-4 py-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{data.completedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.completedCount === 1 ? "atendimento" : "atendimentos"}
              </p>
            </div>
          </div>

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
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          Seu trabalho foi essencial para o evento acontecer. Obrigado!
        </p>
      )}

      <Button onClick={handleShare} className="w-full" size="sm">
        Compartilhar
      </Button>
    </div>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

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
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center">
      <Confetti />
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
          <h1 className="text-xl font-bold">Evento encerrado!</h1>
          <p className="text-sm text-muted-foreground">
            Obrigado por fazer parte deste dia especial. Que Deus abençoe cada vida tocada hoje!
          </p>
        </div>
      )}
    </div>
  );
}
