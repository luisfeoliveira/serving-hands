import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getActiveEvent } from "@/lib/event";
import { roleLabel } from "@/lib/roles";
import { signOut } from "@/lib/auth";
import { CloseEventButton } from "./admin/close-event-button";
import { Hashtag } from "@/components/hashtag";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, event] = await Promise.all([requireProfile(), getActiveEvent()]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        {/* Top bar: title + user controls */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Ação Social IV
            </p>
            <h1 className="text-sm font-semibold text-foreground">
              {roleLabel(profile.role)}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {event && <CloseEventButton eventId={event.id} />}
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile.name}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sair
              </button>
            </form>
          </div>
        </div>

        {/* Nav row: scrollable on mobile */}
        <div className="overflow-x-auto border-t border-border/40">
          <nav className="flex items-center gap-1 px-3 py-1.5 min-w-max">
            <Link
              href="/admin/relatorios"
              className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors whitespace-nowrap"
            >
              Relatórios
            </Link>
            <Link
              href="/admin/usuarios"
              className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors whitespace-nowrap"
            >
              Voluntários
            </Link>
            <Link
              href="/admin/collaborators"
              className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors whitespace-nowrap"
            >
              Facilitadores
            </Link>
            <Link
              href="/admin/expenses"
              className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors whitespace-nowrap"
            >
              Gastos
            </Link>
            <Link
              href="/admin/estacoes"
              className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors whitespace-nowrap"
            >
              Estações
            </Link>
            <Link
              href="/admin/configuracoes"
              className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors whitespace-nowrap"
            >
              Configurações
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-6">
        {children}
      </main>

      <footer className="border-t border-border/40 py-4 flex justify-center">
        <Hashtag />
      </footer>
    </div>
  );
}
