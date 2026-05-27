import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { SetPasswordForm } from "./set-password-form";

// Guard: no valid session → back to login
export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4">
          <Logo variant="mark" />
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold text-foreground">Defina sua senha</h1>
            <p className="text-sm text-muted-foreground">
              Crie uma senha para acessar o sistema de voluntariado.
            </p>
          </div>
        </div>

        <div className="border border-border rounded-lg p-6 bg-card shadow-sm">
          <SetPasswordForm />
        </div>
      </div>
    </main>
  );
}
