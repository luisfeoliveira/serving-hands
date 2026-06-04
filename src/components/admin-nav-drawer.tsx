"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutGrid, Users, BarChart2, Settings, ChevronRight, UsersRound, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const STATIONS = [
  { path: "/reception",         label: "Recepção" },
  { path: "/controller",        label: "Controlador" },
  { path: "/nursing",           label: "Enfermagem" },
  { path: "/doctor",            label: "Médico" },
  { path: "/dentistry",         label: "Odontologia" },
  { path: "/speech-therapy",    label: "Fonoaudiologia" },
  { path: "/psychology",        label: "Psicologia" },
  { path: "/social-work",       label: "Serviço Social" },
  { path: "/legal",             label: "Jurídico" },
  { path: "/finance",           label: "Financeiro" },
  { path: "/beauty",            label: "Beleza" },
  { path: "/bazaar/controller", label: "Bazar – Controlador" },
  { path: "/bazaar/cashier",    label: "Bazar – Caixa" },
  { path: "/evangelism",        label: "Evangelismo" },
] as const;

const ADMIN_LINKS = [
  { path: "/admin/estacoes",       label: "Estações",       Icon: LayoutGrid },
  { path: "/admin/usuarios",       label: "Usuários",       Icon: Users },
  { path: "/admin/collaborators",  label: "Facilitadores",  Icon: UsersRound },
  { path: "/admin/expenses",       label: "Gastos",         Icon: Receipt },
  { path: "/admin/relatorios",     label: "Relatórios",     Icon: BarChart2 },
  { path: "/admin/configuracoes",  label: "Configurações",  Icon: Settings },
] as const;

export function AdminNavDrawer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Wait for client mount before using createPortal
  useEffect(() => { setMounted(true); }, []);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const overlay = (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 bg-background border-r border-border shadow-xl",
          "flex flex-col",
          "transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Menu de navegação"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-sm font-semibold text-foreground">Navegação</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto py-3">
          {/* Admin section */}
          <div className="px-3 mb-1">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
            <nav className="space-y-0.5">
              {ADMIN_LINKS.map(({ path, label, Icon }) => (
                <Link
                  key={path}
                  href={path}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                    pathname.startsWith(path)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mx-3 my-3 border-t border-border/60" />

          {/* Stations section */}
          <div className="px-3">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Estações
            </p>
            <nav className="space-y-0.5">
              {STATIONS.map(({ path, label }) => (
                <Link
                  key={path}
                  href={path}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors",
                    pathname === path
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted/50"
                  )}
                >
                  {label}
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Trigger button — stays inside header */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menu de navegação"
        className="flex items-center justify-center h-8 w-8 rounded-md text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Portal: renders backdrop + panel directly on body, escaping header's backdrop-filter stacking context */}
      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
