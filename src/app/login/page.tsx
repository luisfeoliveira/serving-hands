import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { LoginForm } from "./login-form";

// If already logged in, go straight to station
export default async function LoginPage() {
  const profile = await getProfile();
  if (profile?.active) redirect(roleToPath(profile.role));

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Branding */}
        <div className="text-center space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Congregação Betel
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Ação Social IV Edição
          </h1>
          <p className="text-sm text-muted-foreground">06 de Junho de 2026</p>
        </div>

        {/* Login card */}
        <div className="border border-border rounded-lg p-6 bg-card shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
