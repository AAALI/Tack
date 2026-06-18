# Tack

> Pin it. Move it. Done.

Open-source, self-hostable Kanban for teams. One board per team, magic-link login, real-time, and
your data in **your own** Supabase. Cards carry a human ID (`BRD-12`), a description, links, labels,
an assignee, a due date, and a priority.

**Stack:** Next.js 15 (App Router, React 19) · Supabase (Auth + Postgres + Realtime + RLS) ·
Cloudflare Workers via OpenNext · dnd-kit · Tailwind v4. No paid tier needed at small-team scale.

---

## Two ways to run it

**☁️ Use the hosted version — [tack.ali-ali.workers.dev](https://tack.ali-ali.workers.dev)**
Sign in with a magic link and start moving cards in seconds. We run the infrastructure, updates,
and backups. Free to start. This is the fastest path if you don't want to host anything.

**🛠 Self-host it — free, forever, MIT-licensed**
Run the exact same code on your own Supabase + Cloudflare. Your data never leaves your
infrastructure. The whole setup takes about five minutes — follow the [self-hosting](#self-hosting)
guide below.

Same code, same features either way. Start on the cloud and move to self-hosted later — your data
exports cleanly.

---

## What's in it

- **One board per team** — a board *is* a team's space. No nested projects, no permission matrices.
- **Cards** with title, description, links (`[{label, url}]`), labels, assignee, due date, and
  priority. Drag between/within columns, or use the ◀ ▶ buttons (touch-friendly).
- **Human card IDs** — every card gets a stable `PREFIX-NUMBER` ID (e.g. `BRD-12`), shown on the
  card, in the modal, and in the URL. Copy it into Slack and it pastes as text.
- **Real-time** — changes propagate to everyone on the board via Supabase Realtime, within ~1s.
- **Row-level security** — every query goes through Postgres RLS keyed on `board_members`. A
  non-member literally can't read another team's board, even via a raw API call.
- **Magic-link login** — email OTP, no passwords. Google OAuth also works via the same callback.
- **Branded email** — sign-in, welcome, and board-invite emails matched to the brand. App
  notifications are optional (Resend) and a no-op until you add a key. See [`docs/EMAIL.md`](docs/EMAIL.md).
- **Keyboard-first** — `⌘/Ctrl+K` command palette (jump to board/card, create, toggle theme),
  `C` to create a card, `/` to filter, `?` for the shortcut cheatsheet.
- **Shareable filters** — filter by assignee, label, priority, or due date; the filter lives in the
  URL, so the view is shareable and survives reload.
- **Deep-linkable cards** — `/boards/:id?card=:cardId` opens straight to a card.
- **Board templates** — seed a new board as Engineering, Marketing, or Personal (or the default
  Backlog / To Do / In Progress / Done).
- **Soft WIP limits** — set a per-column limit; exceeding it shows a warning, never blocks writes.
- **Data export** — export a board's data from the board menu.
- **Light & dark themes** — follows the system preference, toggleable.

---

## Self-hosting

You need a [Supabase](https://supabase.com) project (free tier is fine) and a
[Cloudflare](https://cloudflare.com) account.

### 1. Supabase

1. Create a project at supabase.com.
2. Open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and
   run it. This creates the tables, the new-user profile trigger, the membership helper functions,
   the row-level-security policies, the per-board card-number trigger, and the `create_board` /
   `add_board_member` RPCs, and turns on Realtime.
   *Upgrading an existing install instead of a fresh one?* Run each file in
   [`supabase/migrations/`](supabase/migrations) in filename order — `schema.sql` is kept in sync
   with them for fresh installs.
3. **Authentication → Providers → Email**: keep **Email** on. For a magic-link-only flow you can
   turn the password requirement off. (To add Google, enable it as a provider — the existing
   `/auth/callback` route handles it.)
4. **Authentication → URL Configuration**: add your site URL and `https://YOUR-DOMAIN/auth/callback`
   to the redirect allow-list. For local dev also add `http://localhost:3000/auth/callback`.
5. **Project Settings → API**: copy the **Project URL** and the **publishable** (or legacy `anon`)
   key.

### 2. Local development

```bash
cp .env.example .env
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev          # http://localhost:3000
```

Sign in, then create your first board: click **New board** in the sidebar. It seeds the default
columns and makes you the owner.

See [`.env.example`](.env.example) for all variables. The three you need are public — the two
Supabase values plus `NEXT_PUBLIC_SITE_URL` (used for SEO canonical tags, the sitemap, and
link-preview images). **RLS is the security boundary: do not add a Supabase service-role key to this
app.** The only optional server-side secret is `RESEND_API_KEY`, used purely to send notification
email (see [Email](#4-email-optional)); leave it unset and email is disabled.

### 3. Deploy to Cloudflare

This uses the [OpenNext](https://opennext.js.org/cloudflare) adapter on Cloudflare **Workers** (the
current Cloudflare recommendation — `next-on-pages` is deprecated). It needs the `nodejs_compat`
flag, already set in [`wrangler.jsonc`](wrangler.jsonc).

```bash
npx wrangler login
npm run deploy       # opennextjs-cloudflare build && deploy
```

> ⚠️ **The env vars must exist at _build_ time, not as runtime secrets.**
> `NEXT_PUBLIC_*` values are **inlined into the bundle by `next build`** — they are *not* read at
> runtime. `wrangler secret put` does **nothing** for them, and a deploy with them missing builds
> fine but throws a 500 on every request (the Supabase client gets `undefined`).
>
> Set them so they're present when `next build` runs:
> - **CI / Cloudflare dashboard build** → add `NEXT_PUBLIC_SUPABASE_URL`,
>   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` under **Workers & Pages → your
>   project → Settings → Build → Variables and secrets**, then trigger a rebuild.
> - **Deploying from your machine** → having them in `.env` is enough; `next build` picks them up.

After the first deploy, point a custom domain at the Worker and add `https://that-domain/auth/callback`
to the Supabase redirect allow-list.

### 4. Email (optional)

Tack sends two kinds of email, and you can set up either independently:

- **Sign-in links** are sent by **Supabase** over its own SMTP. Configure SMTP and paste the branded
  template from [`supabase/templates/magic_link.html`](supabase/templates/magic_link.html) under
  **Authentication → Emails**.
- **Welcome and board-invite** emails are sent by the app through [Resend](https://resend.com). Set
  `RESEND_API_KEY` (a runtime secret: `npx wrangler secret put RESEND_API_KEY`) and `RESEND_FROM`.

Leave `RESEND_API_KEY` unset and those app notifications are a quiet no-op — no errors, no setup.
Full walkthrough in [`docs/EMAIL.md`](docs/EMAIL.md).

---

## How access works

- A person only ever sees boards they're a member of — enforced in Postgres by RLS keyed on the
  `board_members` table, not in the app. Even a direct API call can't read another team's board.
- The board owner adds teammates by email under the **members** button. The teammate must sign in
  once first so their account (`profiles` row) exists.
- Profiles are readable only by yourself and people you **share a board with** (enforced by a
  `SECURITY DEFINER` helper), so the user directory isn't exposed to everyone who signs up.

---

## Project layout

```
src/
  middleware.ts                 # session refresh + auth redirects (matcher excludes static + /auth/callback)
  app/
    page.tsx                    # marketing landing page (redirects signed-in users to /boards)
    login/, auth/callback/      # magic-link sign-in + OAuth/OTP exchange
    boards/                     # board list, [boardId] board view
    sitemap.ts, robots.ts, manifest.ts, opengraph-image.png …   # SEO / link previews
  components/                   # Board, Column, Card, CardModal, Sidebar, CommandPalette, etc.
  emails/                       # branded email content (shell + welcome/invite builders)
  lib/
    actions.ts                  # all server actions ("use server")
    email/{resend,notifications}.ts   # Resend transport + typed senders
    types.ts, theme.ts
    supabase/{client,server,middleware}.ts
supabase/
  schema.sql                    # source of truth for fresh installs
  migrations/                   # numbered, run in order to upgrade an existing install
  templates/magic_link.html     # branded sign-in email for Supabase Auth
  tests/database/rls.test.sql   # RLS regression tests
```

`BUILD.md` is the original build spec, and `ROADMAP.md` tracks what's shipped and what's
deliberately left out — both are useful background if you're extending Tack.

---

## Contributing

Contributions are welcome — this is meant to be spun up and forked.

1. Fork and clone, then follow [Local development](#2-local-development) to get running against your
   own Supabase project.
2. Branch off `main`. Keep changes focused; Tack's whole pitch is that it's small, so a feature
   needs to earn its place (see the non-goals in `ROADMAP.md` before adding tables, libraries, or
   surface area).
3. **Never weaken RLS to make a feature work.** The database is the security boundary. Any schema
   change ships as a new numbered file in `supabase/migrations/`, with `schema.sql` kept in sync,
   and a matching case in `supabase/tests/database/rls.test.sql`.
4. Run `npm run lint` and confirm `npm run build` is clean before opening a PR.

Issues and PRs: [github.com/AAALI/Tack](https://github.com/AAALI/Tack).

---

## Notes / where to take it next

- New cards and column changes apply optimistically and reconcile via a short refetch; the refetch
  is skipped mid-drag so reordering never janks.
- Card links are stored as JSON on the card (`[{label, url}]`) — no extra table, no extra policy.
- Card ordering uses an integer `position`. If you outgrow that under heavy concurrent reordering,
  switch to a fractional index. Not needed at team scale.

## License

MIT.
