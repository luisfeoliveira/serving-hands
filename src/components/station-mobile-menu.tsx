"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { FinishDayButton } from "@/components/finish-day-button";

interface Props {
  name: string;
  roleName: string;
  showFinishDay: boolean;
  eventId: string;
  signOut: () => Promise<void> | Promise<never>;
}

export function StationMobileMenu({
  name,
  roleName,
  showFinishDay,
  eventId,
  signOut,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close on resize to desktop (avoids stale open state)
  useEffect(() => {
    function onResize() { if (window.innerWidth >= 640) setOpen(false); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const dropdown = open ? (
    <>
      {/* Transparent backdrop — tap outside to close */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      {/* Dropdown panel */}
      <div className="fixed top-[57px] right-4 z-50 w-52 rounded-xl border border-border bg-background shadow-xl overflow-hidden">
        {/* User info */}
        <div className="px-4 py-3 border-b border-border/50 space-y-0.5">
          <p className="text-sm font-medium text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{roleName}</p>
        </div>

        <div className="p-2 space-y-1">
          <form action={signOut}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center h-8 w-8 rounded-md text-primary-foreground hover:bg-primary-foreground/20 transition-colors sm:hidden"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Portal escapes header backdrop-filter stacking context */}
      {mounted && createPortal(dropdown, document.body)}
    </>
  );
}
