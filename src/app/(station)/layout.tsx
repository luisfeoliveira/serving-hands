import { requireProfile } from "@/lib/auth";
import { roleLabel } from "@/lib/roles";
import { signOut } from "@/lib/auth";

export default async function StationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Ação Social IV
          </p>
          <h1 className="text-sm font-semibold text-foreground">
            {roleLabel(profile.role)}
          </h1>
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
    </div>
  );
}
