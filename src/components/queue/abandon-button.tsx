"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { abandonEntry } from "@/lib/queue";

interface AbandonButtonProps {
  entryId: string;
  onAbandoned?: () => void;
}

export function AbandonButton({ entryId, onAbandoned }: AbandonButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await abandonEntry(entryId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Entrada abandonada.");
        onAbandoned?.();
      }
      setConfirming(false);
    });
  }

  return (
    <div className="flex items-center gap-1">
      {confirming && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-muted-foreground h-8 px-2 text-xs"
        >
          Cancelar
        </Button>
      )}
      <Button
        variant={confirming ? "destructive" : "ghost"}
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className={
          confirming
            ? "h-8 px-3 text-xs"
            : "h-8 px-3 text-xs text-muted-foreground hover:text-destructive"
        }
      >
        {isPending ? "…" : confirming ? "Confirmar abandono" : "Abandonar"}
      </Button>
    </div>
  );
}
