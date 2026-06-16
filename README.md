# Tack

> Pin it. Move it. Done.

Open-source, self-hosted Kanban. One board per team, magic-link login, your data in your own
Supabase. Cards carry a description, links, labels, an assignee, a due date, and a priority.

**Stack:** Next.js 15 (App Router) · Supabase (Auth + Postgres + Realtime + RLS) · Cloudflare
Workers via OpenNext · dnd-kit. No paid tier needed at small-team scale.

---

## 1. Supabase

1. Create a project at supabase.com.
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, run it. This creates the
   tables, the new-user profile trigger, the membership functions, the row-level security
   policies, and the `create_board` / `add_board_member` RPCs, and turns on Realtime.
   *Upgrading an existing install?* Run each file in `supabase/migrations/` in numeric order
   instead — `schema.sql` is kept in sync with them for fresh installs.
3. **Authentication → Providers → Email**: keep **Email** on. For a magic-link-only flow you can
   turn the password requirement off. (Google OAuth also works — add it as a provider and the
   existing `/auth/callback` route handles it.)
4. **Authentication → URL Configuration**: add your site URL and
   `https://YOUR-DOMAIN/auth/callback` to the redirect allow-list. For local dev add
   `http://localhost:3000/auth/callback`.
5. **Project Settings → API**: copy the **Project URL** and the **publishable** (or legacy `anon`)
   key.

## 2. Local dev

```bash
cp .env.example .env
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev          # http://localhost:3000
```

Sign in, and your first board: click **New board** in the sidebar. It seeds Backlog / To Do /
In Progress / Done and makes you the owner.

## 3. Deploy to Cloudflare

`next-on-pages` is deprecated; this uses the OpenNext adapter on **Workers** (the current
Cloudflare recommendation), which needs the `nodejs_compat` flag — already set in
`wrangler.jsonc`.

```bash
npx wrangler login
npm run deploy       # opennextjs-cloudflare build && deploy
```

Set the two public env vars so `next build` inlines them — either in `.env` in CI, or:

```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
```

After deploy, point a custom domain at the Worker and add `https://that-domain/auth/callback` to
the Supabase redirect allow-list.

---

## How access works

- A person only ever sees boards they're a member of — enforced in Postgres by RLS keyed on the
  `board_members` table, not in the app. Even a direct API call can't read another team's board.
- The board owner adds teammates by email under the **members** button. The teammate must sign in
  once first so their account exists.
- All signed-in users can read each other's display names (needed to render assignees). If you
  want that locked down further, tighten the `profiles_read` policy in `schema.sql`.

## Notes / where to take it next

- New cards and column changes apply optimistically and reconcile via a short refetch; other
  teammates get the change over Supabase Realtime within ~250ms.
- Card links are stored as JSON on the card (`[{label, url}]`) — no extra table, no extra policy.
- If you outgrow integer `position` ordering under heavy concurrent reordering, switch to a
  fractional index. Not needed at team scale.
