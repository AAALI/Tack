# Email

Tack sends two kinds of email. They take two different paths on purpose.

| Email | When | Sent by | Configured in |
|---|---|---|---|
| **Magic-link sign-in** | Someone requests a sign-in link | **Supabase Auth** (its own SMTP) | Supabase dashboard |
| **Welcome** | A brand-new account's first sign-in | **Tack → Resend** | `RESEND_API_KEY` |
| **Board invitation** | An owner adds a teammate to a board | **Tack → Resend** | `RESEND_API_KEY` |

**Email is optional.** With no `RESEND_API_KEY` set, the welcome and invite emails
become quiet no-ops — no setup, no error logs. Sign-in still works, because that
email is sent by Supabase, not Tack. Wire up Resend only if you want the app
notifications.

Everything is brand-matched to [`BRAND.md`](../BRAND.md): Paper background, the
pinned-card wordmark, the single red Pin button, the mono footer.

---

## 1. Sign-in email (Supabase)

This is the magic link from the login screen. Supabase renders and sends it over
the SMTP you configure — Tack never touches it.

1. **Authentication → Emails → SMTP Settings**: enable custom SMTP and point it at
   your provider (Resend works well here too — use its SMTP credentials).
2. **Authentication → Emails → Templates → "Magic Link"**: paste the contents of
   [`supabase/templates/magic_link.html`](../supabase/templates/magic_link.html).
   Keep the `{{ .ConfirmationURL }}` token intact — Supabase fills it in.

> Without custom SMTP, Supabase uses its low-volume built-in mailer, which is
> rate-limited and only for early testing. Set up SMTP before real use.

---

## 2. App emails (Resend)

Welcome and board-invite emails are sent by Tack through the
[Resend](https://resend.com) API — a plain HTTPS call, which is why it works on
Cloudflare Workers where raw SMTP sockets don't.

### Setup

1. Create an API key at [resend.com/api-keys](https://resend.com/api-keys).
2. Verify your sending domain at [resend.com/domains](https://resend.com/domains).
3. Provide two variables:
   - `RESEND_API_KEY` — the key (a **server-side secret**).
   - `RESEND_FROM` — e.g. `Tack <hello@your-domain.com>`. Defaults to the
     `onboarding@resend.dev` test sender if unset, which is fine for trying it
     out but not for production.

**Local dev** — put them in `.dev.vars` (gitignored):

```
RESEND_API_KEY=re_your_key
RESEND_FROM=Tack <hello@your-domain.com>
```

**Production (Cloudflare)** — set the key as a runtime secret, and `RESEND_FROM`
as a plain var:

```bash
npx wrangler secret put RESEND_API_KEY
# RESEND_FROM can go in wrangler.jsonc "vars" or the dashboard
```

---

## How it's wired

```
src/
  emails/
    shell.ts            # shared HTML shell — brand layout, logo, footer
    index.ts            # welcomeEmail() / boardInviteEmail() → { subject, html, text }
  lib/email/
    resend.ts           # transport: the Resend client + sendEmail()
    notifications.ts    # sendWelcome() / sendBoardInvite() — template + transport + URLs
supabase/templates/
    magic_link.html     # the Supabase-sent sign-in email
```

- `src/app/auth/callback/route.ts` calls `sendWelcome()` for new accounts.
- `addMember()` in `src/lib/actions.ts` calls `sendBoardInvite()`.

Both call sites are **best-effort**: a mail failure is caught and logged, never
breaking sign-in or the add. Sends carry an idempotency key, so a retry within
24h won't duplicate.

### Why plain HTML, not React Email

The emails are inline-styled HTML strings, not React Email components. On
Cloudflare Workers that avoids pulling `react-dom/server` into the bundle, keeps
the dependency footprint small for self-hosters, and makes rendering bulletproof.
The tradeoff is hand-written HTML instead of JSX — worth it for three short
templates. Colors come from `src/lib/theme.ts`, so the brand stays in one place.

### Adding a new email

1. Add a builder to `src/emails/index.ts` returning `{ subject, html, text }`,
   wrapping content with `shell()`.
2. Add a typed sender to `src/lib/email/notifications.ts` (guarded by
   `emailEnabled()`).
3. Call it from the relevant server action / route, wrapped in try/catch.

### Testing without sending real mail

Resend provides safe test recipients that simulate events without touching your
domain reputation: `delivered@resend.dev`, `bounced@resend.dev`,
`complained@resend.dev`, `suppressed@resend.dev`.
