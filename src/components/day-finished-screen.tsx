"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Hashtag } from "@/components/hashtag";
import { RecapStats } from "@/components/end-of-day-overlay";
import type { RecapData } from "@/app/api/recap/route";

export function DayFinishedScreen({ eventId }: { eventId: string }) {
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(!!eventId);

  useEffect(() => {
    if (!eventId) { setLoading(false); return; }
    fetch(`/api/recap?eventId=${eventId}`)
      .then((r) => r.json())
      .then((data) => { setRecap(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [eventId]);

  async function handleShare() {
    const text =
      `Hoje fui voluntário na Ação Social Mãos que Servem da Congregação Betel ` +
      `e ajudei a comunidade com muito amor! 🙏 #IGREJAUNIDA #MISSÃOCUMPRIDA`;
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch { /* fallthrough */ }
    }
    await navigator.clipboard.writeText(text);
    alert("Texto copiado para a área de transferência!");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border px-4 py-3 flex justify-center">
        <Logo variant="mark" className="[&_svg]:h-8" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {loading ? (
          <div className="text-center space-y-3">
            <p className="text-3xl animate-pulse">✨</p>
            <p className="text-sm text-muted-foreground">Carregando resumo…</p>
          </div>
        ) : (
          <div className="max-w-sm w-full space-y-6">
            <div className="text-center space-y-2">
              <p className="text-4xl">🙏</p>
              <h1 className="text-xl font-bold">Seu dia foi incrível!</h1>
              <p className="text-sm text-muted-foreground">
                Obrigado por fazer parte desta missão.
              </p>
            </div>

            {recap && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <RecapStats data={recap} />
              </div>
            )}

            <Button onClick={handleShare} className="w-full" variant="outline">
              Compartilhar
            </Button>
          </div>
        )}
      </main>

      <footer className="border-t border-border/40 py-4 flex justify-center">
        <Hashtag />
      </footer>
    </div>
  );
}
