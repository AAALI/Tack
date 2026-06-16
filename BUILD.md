# Boards — Build Guide for Claude Code

A simple, self-hostable Kanban for teams. Each **board is one team's space** (Engineering,
Marketing, Ops, Leadership — whatever). People sign in with a magic link and see only the boards
they belong to. Cards carry a description, links, labels, an assignee, a due date, and a priority.

This is meant to be open-sourced so any company can spin it up. Keep it generic. No company names,
no domain-specific language anywhere in the code or copy.

**Project name:** the package is `boards` and the display name is "Boards". Both are placeholders —
do a find/replace to rebrand if you fork it.

---

## 0. Instructions to the agent (read first)

- Build in the numbered phases below, in order. After each phase, stop and run its acceptance
  checks before moving on.
- **Simplicity is the product.** If a feature is not listed in the spec, do not add it. No teams
  table, no comments, no notifications, no attachments, no real-time cursors. Resist scope creep.
- Do not create files outside the file map without saying why.
- Pin the versions and follow the gotchas in section 2 exactly — they are the things that break.
- The database (section 3) is the security boundary, not the app. Get the RLS right.

---

## 1. Product spec

- **Auth:** Supabase magic link (email OTP). No passwords. Optional: Google OAuth via the same
  callback route.
- **Access model:** a board has members; a member is either `owner` or `member`. A person can only
  read/write a board they belong to. This is enforced in Postgres with row-level security, so a
  raw API call can't reach another team's board either.
- **Boards:** any signed-in user can create a board (they become its owner). Owners can rename and
  delete a board and add/remove members by email.
- **Columns (stages):** per board, ordered. Add, rename, delete. A new board seeds Backlog / To Do
  / In Progress / Done.
- **Cards:** title, description, links (`[{label, url}]`), labels (string array), assignee (a board
  member), due date, priority (`none|low|medium|high`). Drag between/within columns; reorder
  persists. Also ◀ ▶ buttons to move a card one column left/right (works on touch).
- **Live:** changes propagate to everyone on the board via Supabase Realtime.

**Non-goals (v1):** sub-tasks, checklists, comments, file uploads, activity log, search, filters,
swimlanes, due-date reminders, mobile app, SSO/SAML, billing.

---

## 2. Tech stack — pinned, with the gotchas

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | React 19. Server Components + Server Actions. |
| Auth + DB + Realtime | Supabase | One project covers all three. |
| Auth integration | `@supabase/ssr` | **Use this only.** |
| Drag & drop | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | |
| Icons | `lucide-react` | |
| Styling | Tailwind CSS v4 | `@import "tailwindcss";` + `@tailwindcss/postcss`. No config file needed. |
| Hosting | Cloudflare **Workers** via `@opennextjs/cloudflare` | **Not** Pages / `next-on-pages`. |

**Gotchas that will bite you if ignored:**

1. **Cloudflare:** `@cloudflare/next-on-pages` is deprecated. Use `@opennextjs/cloudflare` on
   Workers. The Worker needs the `nodejs_compat` compatibility flag and a `compatibility_date` of
   `2024-09-23` or later, or the app won't boot.
2. **Supabase SSR cookies:** in the cookie adapter use **only** `getAll` and `setAll`. Never use
   `get`/`set`/`remove`, and never import from `@supabase/auth-helpers-nextjs` (legacy/removed).
3. **Env vars are public.** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the
   anon/publishable key) are the only vars. Nothing secret runs server-side — **RLS is the
   security**. Do not add a service-role key to this app.
4. **RLS recursion:** membership checks must go through `SECURITY DEFINER` functions, or policies
   on `board_members` that reference `board_members` will recurse. See section 3.
5. **Tailwind v4 in artifacts/Workers:** custom hex colors go in inline `style` or CSS variables —
   don't rely on arbitrary-value classes unless the build pipeline supports them.

---

## 3. Database + security (Supabase) — most important section

Create `supabase/schema.sql` with exactly this, and run it once in the Supabase SQL editor. It is
the source of truth for the data model and all access control.

```sql
-- ---------- Tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.board_members (
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create table if not exists public.columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null default 'New stage',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  column_id uuid not null references public.columns (id) on delete cascade,
  title text not null,
  description text not null default '',
  assignee uuid references auth.users (id) on delete set null,
  due_date date,
  priority text not null default 'none' check (priority in ('none','low','medium','high')),
  labels text[] not null default '{}',
  links jsonb not null default '[]',         -- [{ "label": "...", "url": "..." }]
  position int not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_board_idx on public.cards (board_id);
create index if not exists cards_column_idx on public.cards (column_id);
create index if not exists columns_board_idx on public.columns (board_id);

-- ---------- New-user profile trigger ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Membership helpers (SECURITY DEFINER avoids RLS recursion) ----------
create or replace function public.is_board_member(b uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.board_members where board_id = b and user_id = auth.uid());
$$;

create or replace function public.is_board_owner(b uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.board_members
                 where board_id = b and user_id = auth.uid() and role = 'owner');
$$;

-- ---------- RPC: create a board with default stages ----------
create or replace function public.create_board(board_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into public.boards (name, created_by) values (board_name, auth.uid())
  returning id into new_id;
  insert into public.board_members (board_id, user_id, role) values (new_id, auth.uid(), 'owner');
  insert into public.columns (board_id, title, position) values
    (new_id,'Backlog',0),(new_id,'To Do',1),(new_id,'In Progress',2),(new_id,'Done',3);
  return new_id;
end; $$;

-- ---------- RPC: add a member by email (owner only) ----------
create or replace function public.add_board_member(board uuid, member_email text)
returns void language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if not public.is_board_owner(board) then raise exception 'Only an owner can add members'; end if;
  select id into target from public.profiles where lower(email) = lower(member_email);
  if target is null then raise exception 'No user with that email has signed in yet'; end if;
  insert into public.board_members (board_id, user_id, role) values (board, target, 'member')
  on conflict (board_id, user_id) do nothing;
end; $$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.columns enable row level security;
alter table public.cards enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy boards_read on public.boards for select to authenticated using (public.is_board_member(id));
create policy boards_insert on public.boards for insert to authenticated with check (created_by = auth.uid());
create policy boards_modify on public.boards for update to authenticated using (public.is_board_owner(id));
create policy boards_delete on public.boards for delete to authenticated using (public.is_board_owner(id));

create policy members_read on public.board_members for select to authenticated using (public.is_board_member(board_id));
create policy members_insert on public.board_members for insert to authenticated with check (public.is_board_owner(board_id));
create policy members_delete on public.board_members for delete to authenticated using (public.is_board_owner(board_id));

create policy columns_all on public.columns for all to authenticated
  using (public.is_board_member(board_id)) with check (public.is_board_member(board_id));
create policy cards_all on public.cards for all to authenticated
  using (public.is_board_member(board_id)) with check (public.is_board_member(board_id));

-- ---------- Realtime ----------
alter publication supabase_realtime add table public.cards;
alter publication supabase_realtime add table public.columns;
```

**Decisions baked in here, document them in the README:**
- Any signed-in user can read every profile's name/email (needed to render assignees). If a fork
  wants this tighter, narrow the `profiles_read` policy to co-members only (via a definer function).
- `card.links` is JSON on the row — no link table, no extra policy.
- To add a member, the invitee must have signed in once so a `profiles` row exists.

---

## 4. File map

```
boards/
  package.json
  next.config.ts            # calls initOpenNextCloudflareForDev()
  open-next.config.ts       # defineCloudflareConfig()
  wrangler.jsonc            # nodejs_compat, compatibility_date >= 2024-09-23, assets binding
  postcss.config.mjs        # @tailwindcss/postcss
  tsconfig.json             # paths: { "@/*": ["./src/*"] }
  .env.example
  README.md
  supabase/schema.sql
  src/
    middleware.ts                       # calls updateSession; matcher excludes static + /auth/callback
    app/
      globals.css                       # @import "tailwindcss"; + focus/reduced-motion
      layout.tsx
      page.tsx                          # redirect -> /boards
      login/page.tsx                    # renders <LoginForm/>
      auth/callback/route.ts            # exchangeCodeForSession -> redirect
      boards/
        layout.tsx                      # auth guard + load user's boards -> <Sidebar/>
        page.tsx                        # "pick a board" empty state
        [boardId]/page.tsx              # load board/columns/cards/members -> <Board/>
    components/
      LoginForm.tsx        Sidebar.tsx        Avatar.tsx
      Board.tsx            Column.tsx         Card.tsx
      CardModal.tsx        MembersDialog.tsx
    lib/
      types.ts                          # Card, Column, Member types + theme/helpers
      actions.ts                        # all server actions ("use server")
      supabase/
        client.ts                       # createBrowserClient
        server.ts                       # createServerClient + cookies getAll/setAll
        middleware.ts                   # updateSession()
```

---

## 5. Build phases

### P0 — Scaffold + deploy target
- Init Next 15 + TS + Tailwind v4. Add all deps from section 2.
- Write the config files. `wrangler.jsonc` must set `compatibility_flags: ["nodejs_compat"]` and a
  `compatibility_date` ≥ `2024-09-23`, point `main` at `.open-next/worker.js`, and bind `ASSETS`
  to `.open-next/assets`.
- Scripts: `dev`, `build`, `preview` (`opennextjs-cloudflare build && opennextjs-cloudflare preview`),
  `deploy` (`… build && … deploy`).
- **Accept:** `npm run dev` serves a placeholder; `npm run preview` runs it in the Workers runtime.

### P1 — Auth
- `lib/supabase/{client,server,middleware}.ts` per the skeletons in section 6.
- `LoginForm` calls `signInWithOtp({ email, options:{ emailRedirectTo: ${origin}/auth/callback }})`.
- `auth/callback/route.ts` calls `exchangeCodeForSession(code)` then redirects to `/boards`.
- `middleware.ts` refreshes the session and redirects unauthenticated users to `/login` (except
  `/login` and `/auth/*`), and authenticated users away from `/login`.
- **Accept:** magic link signs you in; protected routes bounce to `/login` when signed out.

### P2 — Boards list + create
- Run `schema.sql` in Supabase. Configure redirect URLs (section 7).
- `boards/layout.tsx` loads the user's memberships
  (`board_members` join `boards`) and renders `Sidebar`.
- `Sidebar` lists boards, has a "New board" inline form calling the `create_board` RPC via a server
  action, plus account + sign out.
- **Accept:** create a board, it appears in the sidebar with seeded columns; you're its owner.

### P3 — Board view (read + cards CRUD)
- `[boardId]/page.tsx` loads board, columns (by position), cards (by position), and members
  (fetch `board_members`, then `profiles` for those ids — there's no direct FK, so merge in code).
  Render `<Board/>`.
- `Board` holds `columns`/`cards` in state (seeded from props). `Column` renders cards and a card
  composer. `Card` shows title, labels, due date, link count, priority dot, assignee avatar.
- `CardModal` edits title, description, links (add/remove rows), labels, assignee (from members),
  due date, priority. Saves via the `updateCard` action; delete via `deleteCard`.
- **Accept:** add/edit/delete cards; all fields persist and survive reload.

### P4 — Drag & drop + ordering
- Wrap the board in `DndContext` (`closestCorners`, PointerSensor with `distance: 6`, KeyboardSensor).
- Each column is a `useDroppable` with id `col:<columnId>` and wraps its cards in a
  `SortableContext` (vertical). Each card is `useSortable` with id = card id.
- Implement the multi-container handlers in section 6. Persist new order with the `reorderCards`
  action (writes `column_id` + `position` for affected columns only).
- Add ◀ ▶ buttons on each card that move it one column over (touch fallback).
- **Accept:** drag within and across columns; order persists; arrows work on mobile.

### P5 — Realtime + optimistic reconciliation
- In `Board`, subscribe to `postgres_changes` on `cards` and `columns` filtered by `board_id`.
- On any event, debounce ~250ms then refetch columns+cards and replace state — **skip while a drag
  is in progress** (`activeId` set).
- Card/column creates use a temporary id optimistically, then the refetch reconciles real ids.
- **Accept:** two browsers on the same board see each other's changes within ~1s; no flor jank
  mid-drag.

### P6 — Members + board admin
- `MembersDialog`: list members with avatars/roles; owner can add by email (`add_board_member` RPC)
  and remove non-owner members. Surface RPC errors (e.g. "no user with that email yet").
- Owner can rename and delete the board.
- **Accept:** owner adds a teammate by email; teammate sees the board; non-members get nothing
  (verify RLS by hitting the board id directly while signed in as a non-member).

### P7 — Polish + docs
- Empty states ("pick a board", "no boards yet"), visible keyboard focus, `prefers-reduced-motion`,
  custom scrollbar. Responsive down to mobile.
- Write the README (setup, schema, deploy, the access-model decisions). MIT license.
- **Accept:** lint clean, builds for Workers, README lets a stranger deploy it.

---

## 6. Implementation notes & skeletons (the error-prone bits)

**Supabase server client** (`lib/supabase/server.ts`):
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* called from a Server Component; middleware refreshes the session */ }
        },
    }});
}
```
Browser client = `createBrowserClient(url, key)`. Middleware client uses the same `getAll`/`setAll`
shape but reads/writes `request.cookies` and the `NextResponse`; call `supabase.auth.getUser()` to
refresh, then redirect on missing user.

**dnd-kit multi-container** (in `Board`):
- `colOf(id)`: if id starts with `col:` return the suffix; else return the card's `column_id`.
- `onDragStart`: set `activeId`; stash the source column in a ref.
- `onDragOver`: if the card is over a *different* column, move it in state — remove it, find the
  insert index (the over-card's index, or end-of-column when over the `col:` droppable), splice in
  with the new `column_id`. This makes the card visually relocate mid-drag.
- `onDragEnd`: if over a sibling card, `arrayMove`. Then recompute `position` (= array index) for
  the cards in the source and target columns and persist just those via `reorderCards`. Clear
  `activeId`.
- Render a `DragOverlay` with a simple preview of the active card.

**Server actions** (`lib/actions.ts`, all `"use server"`): `createBoard` (RPC + redirect),
`renameBoard`, `deleteBoard`, `addMember` (RPC, returns `{error}`), `removeMember`, `addColumn`,
`renameColumn`, `deleteColumn`, `createCard`, `updateCard(patch)`, `deleteCard`,
`reorderCards(updates[])`, `signOut`. Each `revalidatePath` the board route.

**Magic link redirect:** `emailRedirectTo` must be on the Supabase **redirect allow-list** for both
localhost and the deployed domain, or the link 404s.

---

## 7. Deploy (put in README)

1. Supabase: run `schema.sql`; enable the Email provider; add `http://localhost:3000/auth/callback`
   and `https://<domain>/auth/callback` to **Auth → URL Configuration**.
2. Copy `NEXT_PUBLIC_SUPABASE_URL` and the anon/publishable key into `.env`.
3. `npm install && npm run dev` to develop.
4. `npx wrangler login && npm run deploy`. Ensure the two `NEXT_PUBLIC_*` vars are present at build
   time (they're inlined by `next build`). Point a custom domain at the Worker and add its
   `/auth/callback` to the allow-list.

---

## 8. Conventions (safe to lift into a CLAUDE.md)

- Server Components fetch; Client Components (`"use client"`) hold interactive state. Mutations go
  through Server Actions, never client-side writes with elevated keys.
- Never weaken RLS to make a feature work. If the app can't read something, fix the policy or the
  query, not the security model.
- Keep colors/spacing in one theme object; prefer inline `style` for custom hex over arbitrary
  Tailwind classes.
- One concern per component. Don't add libraries for problems the stack already solves.

## 9. Future (explicitly not now)

Comments, checklists, search/filter, card activity log, Google OAuth, board templates, CSV
import/export, fractional-index ordering for heavy concurrent reordering. Ship the core first.
