import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcome } from "@/lib/email/notifications";

// Accounts created within this window of the sign-in are treated as brand new,
// so we send the one-time welcome. The idempotency key guards against repeats.
const NEW_ACCOUNT_WINDOW_MS = 2 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/boards";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data.user;
      const createdAt = user?.created_at ? new Date(user.created_at).getTime() : 0;
      const isNew = createdAt > 0 && Date.now() - createdAt < NEW_ACCOUNT_WINDOW_MS;
      if (isNew && user?.email) {
        // Best-effort — a mail failure must not block sign-in.
        try {
          await sendWelcome(
            user.email,
            (user.user_metadata?.full_name as string | undefined) ?? null
          );
        } catch (e) {
          console.error("Welcome email failed:", e);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
