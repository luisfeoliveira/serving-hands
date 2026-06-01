import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Handles two Supabase callback shapes:
 *
 *   1. PKCE OAuth / magic-link: ?code=...
 *      → exchangeCodeForSession
 *
 *   2. Email OTP (invite, recovery, email-change): ?token_hash=...&type=...
 *      → verifyOtp
 *      Supabase admin invite emails use this shape, NOT ?code=.
 *
 * Routing after success:
 *   invite | recovery  → /auth/set-password
 *   everything else    → /login
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code       = searchParams.get("code");
  const tokenHash  = searchParams.get("token_hash");
  const type       = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  // ── Shape 1: PKCE code ────────────────────────────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === "invite" || type === "recovery") {
        return NextResponse.redirect(`${origin}/auth/set-password`);
      }
      return NextResponse.redirect(`${origin}/login`);
    }
  }

  // ── Shape 2: token_hash (invite / recovery / email-change emails) ─────────
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      if (type === "invite" || type === "recovery") {
        return NextResponse.redirect(`${origin}/auth/set-password`);
      }
      return NextResponse.redirect(`${origin}/login`);
    }
  }

  // Expired / invalid / already used
  return NextResponse.redirect(`${origin}/login?error=link-expirado`);
}
