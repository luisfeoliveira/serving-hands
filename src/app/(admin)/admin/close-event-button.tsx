"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { closeEvent } from "./event-actions";
import { AdminEndOfDayOverlay } from "@/components/end-of-day-overlay";

type Step = "idle" | "confirm" | "closing" | "done";

export function CloseEventButton({ eventId }: { eventId: string }) {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setStep("closing");
    const result = await closeEvent(eventId);
    if (result.error) {
      setError(result.error);
      setStep("confirm");
    } else {
      setStep("done");
    }
  }

  return (
    <>
      {step === "idle" && (
        <button
          onClick={() => setStep("confirm")}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Encerrar evento
        </button>
      )}

      {/* Portal to body — bypasses header backdrop-filter stacking context */}
      {step === "done" &&
        createPortal(<AdminEndOfDayOverlay />, document.body)}

      {(step === "confirm" || step === "closing") &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-2xl shadow-lg p-6 space-y-4 max-w-sm w-full">
              <div className="space-y-1">
                <h2 className="font-semibold">Encerrar o evento?</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Todas as estações serão bloqueadas imediatamente para todos
                  os voluntários. Esta ação não pode ser desfeita.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={step === "closing"}
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
                  disabled={step === "closing"}
                  onClick={handleConfirm}
                >
                  {step === "closing" ? "Encerrando…" : "Sim, encerrar"}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
