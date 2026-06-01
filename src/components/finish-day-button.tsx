"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { finishMyDay } from "@/lib/finish-day";
import { EndOfDayOverlay } from "@/components/end-of-day-overlay";

type Step = "idle" | "confirm" | "finishing" | "done";

export function FinishDayButton({ eventId }: { eventId: string }) {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setStep("finishing");
    try {
      const result = await finishMyDay(eventId);
      if (result.error) {
        setError(result.error);
        setStep("confirm");
      } else {
        setStep("done");
      }
    } catch {
      setError("Erro inesperado. Tente novamente.");
      setStep("confirm");
    }
  }

  return (
    <>
      {step === "idle" && (
        <button
          onClick={() => setStep("confirm")}
          className="text-xs text-muted-foreground/40 hover:text-destructive transition-colors"
        >
          Encerrar meu dia
        </button>
      )}

      {/* Portal to body — bypasses header backdrop-filter stacking context */}
      {step === "done" &&
        createPortal(<EndOfDayOverlay eventId={eventId} />, document.body)}

      {(step === "confirm" || step === "finishing") &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-2xl shadow-lg p-6 space-y-4 max-w-sm w-full">
              <div className="space-y-1">
                <h2 className="font-semibold">Deseja encerrar seu dia?</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Atenção! Ao realizar esta ação, você não poderá mais realizar atendimentos.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={step === "finishing"}
                  onClick={() => {
                    setStep("idle");
                    setError(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={step === "finishing"}
                  onClick={handleConfirm}
                >
                  {step === "finishing" ? "Encerrando…" : "Sim, encerrar"}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
