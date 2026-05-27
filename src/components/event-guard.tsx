"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/auth";
import { EndOfDayOverlay } from "@/components/end-of-day-overlay";

function BlockedScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-5 max-w-xs">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto text-2xl">
          🔒
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Ação Social IV
          </p>
          <h1 className="text-lg font-semibold">Evento não está ativo</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O sistema só está disponível durante o evento.
            Aguarde a abertura ou entre em contato com o administrador.
          </p>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}

export function EventGuard({
  initialActive,
  eventId,
  children,
}: {
  initialActive: boolean;
  eventId?: string;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(initialActive);
  // Track whether active was ever true so we can distinguish
  // "closed while volunteer was working" vs "already closed at load time"
  const wasActiveRef = useRef(initialActive);
  const [closedLive, setClosedLive] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("events:guard")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "events" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (typeof row.active === "boolean") {
            if (!row.active && wasActiveRef.current) {
              // Event just closed while user was active → show end-of-day experience
              setClosedLive(true);
            }
            wasActiveRef.current = row.active as boolean;
            setActive(row.active as boolean);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (closedLive && eventId) return <EndOfDayOverlay eventId={eventId} />;
  if (!active) return <BlockedScreen />;
  return <>{children}</>;
}
