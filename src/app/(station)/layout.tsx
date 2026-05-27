import { requireProfile } from "@/lib/auth";
import { getActiveEvent } from "@/lib/event";
import { roleLabel } from "@/lib/roles";
import { signOut } from "@/lib/auth";
import { EventGuard } from "@/components/event-guard";
import { Logo } from "@/components/logo";
import { Hashtag } from "@/components/hashtag";

export default async function StationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, event] = await Promise.all([requireProfile(), getActiveEvent()]);
  // Admin always passes through — they control the event
  const guardActive = profile.role === "admin" || !!event;

  return (
    <EventGuard initialActive={guardActive} eventId={event?.id}>
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-sm text-muted-foreground hidden sm:block">
            {roleLabel(profile.role)}
          </span>
        </div>

        <div className="flex items-center gap-3">
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
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-border/40 py-4 flex justify-center">
        <Hashtag />
      </footer>
    </div>
    </EventGuard>
  );
}
