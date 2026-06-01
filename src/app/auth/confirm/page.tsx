"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles Supabase implicit-flow auth redirects.
 *
 * Supabase sends tokens in the URL hash (implicit flow):
 *   http://localhost:3000/auth/confirm#access_token=...&refresh_token=...&type=invite
 *
 * Server-side code never sees the hash — this client page reads it,
 * calls setSession, then routes to the right place.
 */
export default function ConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.substring(1); // strip leading #
    const params = new URLSearchParams(hash);

    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type         = params.get("type"); // "invite" | "recovery" | "signup" | …

    if (!accessToken || !refreshToken) {
      router.replace("/login?error=link-expirado");
      return;
    }

    const supabase = createClient();

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          router.replace("/login?error=link-expirado");
          return;
        }

        if (type === "invite" || type === "recovery") {
          router.replace("/auth/set-password");
        } else {
          router.replace("/login");
        }
      });
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground animate-pulse">Autenticando…</p>
    </main>
  );
}
