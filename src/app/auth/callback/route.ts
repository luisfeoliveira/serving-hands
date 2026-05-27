import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles Supabase PKCE callback for:
 *   - invite  → /auth/set-password
 *   - recovery (reset password) → /auth/set-password
 *   - email-change confirmation → /login
 *
 * Supabase appends ?code=... to whatever redirectTo was set.
 * We include ?type=invite or ?type=recovery in the redirectTo so we can
 * route appropriately here.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "invite" | "recovery" | null

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (type === "invite" || type === "recovery") {
        return NextResponse.redirect(`${origin}/auth/set-password`);
      }
      // email-change — session refreshed, just go to login
      return NextResponse.redirect(`${origin}/login`);
    }
  }

  // Expired / invalid link
  return NextResponse.redirect(`${origin}/login?error=link-expirado`);
}
