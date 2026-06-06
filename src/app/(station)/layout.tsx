import { requireProfile } from "@/lib/auth";
import { getActiveEvent } from "@/lib/event";
import { roleLabel } from "@/lib/roles";
import { signOut } from "@/lib/auth";
import { EventGuard } from "@/components/event-guard";
import { Logo } from "@/components/logo";
import { Hashtag } from "@/components/hashtag";
import { FinishDayButton } from "@/components/finish-day-button";
import { DayFinishedScreen } from "@/components/day-finished-screen";
import { AdminNavDrawer } from "@/components/admin-nav-drawer";
import { StationMobileMenu } from "@/components/station-mobile-menu";

export default async function StationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, event] = await Promise.all([requireProfile(), getActiveEvent()]);

  // Admin always passes through — they control the event
  const guardActive = profile.role === "admin" || !!event;

  // Volunteer finished their own day — but ONLY show summary while event is
  // still active. If event is inactive, BlockedScreen wins over everything.
  if (guardActive && profile.role !== "admin" && profile.day_finished_at) {
    return <DayFinishedScreen eventId={profile.day_finished_event_id ?? ""} />;
  }

  return (
    <EventGuard initialActive={guardActive} eventId={event?.id}>
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-10 border-b border-primary/20 bg-primary px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile.role === "admin" && <AdminNavDrawer />}
            <Logo />
            <span className="text-sm text-primary-foreground/70 hidden sm:block">
              {roleLabel(profile.role)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {profile.role === "admin" ? (
              /* Admin: AdminNavDrawer handles navigation; just show Sair inline */
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                >
                  Sair
                </button>
              </form>
            ) : (
              <>
                {/* Volunteers mobile: hamburger with name + finish day + sair */}
                <StationMobileMenu
                  name={profile.name}
                  roleName={roleLabel(profile.role)}
                  showFinishDay={!!event}
                  eventId={event?.id ?? ""}
                  signOut={signOut}
                />
                {/* Volunteers desktop: inline controls */}
                {event && <FinishDayButton eventId={event.id} />}
                <span className="text-sm text-primary-foreground/70 hidden sm:block">
                  {profile.name}
                </span>
                <form action={signOut} className="hidden sm:block">
                  <button
                    type="submit"
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    Sair
                  </button>
                </form>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
          {children}
        </main>

        <footer className="border-t border-border/40 py-4 flex justify-center">
          <Hashtag />
        </footer>
      </div>
    </EventGuard>
  );
}
