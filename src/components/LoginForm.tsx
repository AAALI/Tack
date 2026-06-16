"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { THEME, tack } from "@/lib/types";
import TackMark from "./TackMark";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const send = async () => {
    if (!email.trim()) return;
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: THEME.paper, color: THEME.ink }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: THEME.surface, border: `1px solid ${THEME.hair}` }}
      >
        <div className="mb-5">
          <TackMark size={36} withWordmark />
        </div>
        <h1 className="text-2xl font-display" style={{ color: tack.ink, fontWeight: 600 }}>
          Pin it. Move it. Done.
        </h1>
        <p className="text-sm mt-2 mb-6" style={{ color: THEME.muted }}>
          Enter your email and we&apos;ll send a one-time sign-in link. No password to remember.
        </p>

        {status === "sent" ? (
          <div
            className="rounded-lg p-4 text-sm"
            style={{ background: tack.wash, color: tack.ink, border: `1px solid ${tack.hairline}` }}
          >
            Check {email}. Open the link on this device to sign in.
          </div>
        ) : (
          <>
            <label className="block text-xs font-meta uppercase tracking-[0.08em] mb-1.5" style={{ color: THEME.muted }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="you@company.com"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
              style={{ borderColor: THEME.hair }}
            />
            <button
              onClick={send}
              disabled={status === "sending"}
              className="w-full mt-4 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: tack.pin }}
            >
              {status === "sending" ? "Sending…" : "Send sign-in link"}
            </button>
            {status === "error" && (
              <p className="text-xs mt-3" style={{ color: tack.pin }}>
                {message}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
