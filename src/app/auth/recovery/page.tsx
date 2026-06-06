"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Client-side handler for PKCE recovery codes.
// The browser client stores the code_verifier in localStorage; only the browser
// can complete the exchange — a server Route Handler can't access localStorage.
export default function RecoveryPage() {
  const router = useRouter();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");

    if (!code) {
      router.replace("/login?error=link-expirado");
      return;
    }

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) router.replace("/login?error=link-expirado");
      else router.replace("/auth/set-password");
    });
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground animate-pulse">Verificando…</p>
    </main>
  );
}
