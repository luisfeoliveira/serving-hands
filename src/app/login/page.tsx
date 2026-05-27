import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/logo";

// If already logged in, go straight to station
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getProfile();
  if (profile?.active) redirect(roleToPath(profile.role));

  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Branding */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-center space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Congregação Betel
            </p>
            <Logo variant="mark" className="[&_svg]:h-14" />
            <p className="text-sm text-muted-foreground">06 de Junho de 2026</p>
          </div>
        </div>

        {error === "link-expirado" && (
          <p className="text-sm text-destructive text-center">
            Este link expirou ou já foi utilizado. Solicite um novo.
          </p>
        )}

        {/* Login card */}
        <div className="border border-border rounded-lg p-6 bg-card shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
