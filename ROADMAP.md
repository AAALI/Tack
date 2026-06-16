# Tack — Roadmap

A living plan for what to build, in what order, and what to deliberately leave out.
Pair this with `BRAND.md` (the look) and `BUILD.md` (the spec). When in doubt, simplicity wins.

> Rule: every item below has to survive the question *"does this make the simplest team
> board you can actually own better, or just bigger?"* If it makes it bigger, cut it.

---

## How to use this file

- Work top-to-bottom within a milestone. Don't jump milestones.
- Each task has an **Acceptance** line — that's the definition of done.
- Tick the box when shipped. Move slipped items into the next milestone; don't let them rot.
- Schema changes ship as numbered files under `supabase/migrations/` once that folder exists
  (today the source of truth is `supabase/schema.sql`). One migration per task at most.
- Every schema change needs a matching RLS test (see *Testing*).

---

## v1.0 — Ship-blockers before public launch

The product as-is is good. These are the gaps that, left in, will make the first wave of
external users bounce.

### 1. Card identifiers (`BOARD-123`)
- [ ] Add `boards.prefix text` (3–6 chars, derived from board name on create, editable by owner).
- [ ] Add `cards.number int not null` with a per-board sequence via trigger
      (`max(number)+1 where board_id = new.board_id`).
- [ ] Backfill existing cards in a migration.
- [ ] Render `PREFIX-NUMBER` on the card, in the modal title bar, and in the URL.
- **Acceptance:** every card has a stable human ID; copying it pastes `ENG-42` style text.

### 2. Command palette + global shortcuts
- [ ] `Cmd/Ctrl+K` opens a palette over the board: jump to board, jump to card by ID/title,
      create card, create board, toggle theme, sign out.
- [ ] `C` — new card in the focused column (or first column).
- [ ] `/` — focus the filter bar (see next item).
- [ ] `Esc` — close modal/palette; never navigates away.
- [ ] All shortcuts visible in a `?` cheatsheet modal.
- **Acceptance:** a power user can create, find, and open a card without touching the mouse.

### 3. Client-side filter bar
- [ ] Filters: assignee, label, priority, due (overdue / this week / no date), "mine".
- [ ] Filters encoded in the URL query string so they're shareable and survive reload.
- [ ] Clear-all chip; visible count of hidden cards per column.
- **Acceptance:** filter to "mine + high priority" → share URL → teammate sees same view.

### 4. Deep-linkable card modal
- [ ] `/boards/:boardId?card=:cardId` opens the modal on load.
- [ ] Closing the modal removes the param (no scroll jump, no full reload).
- [ ] 404 on the card id → toast, strip the param, keep the board.
- **Acceptance:** pasting a card URL in Slack opens the right card for any board member.

### 5. Tighten `profiles_read` to co-members only
- [ ] Replace the open `profiles_read` policy with a `SECURITY DEFINER` helper:
      "user X and the viewer share at least one board."
- [ ] Update `MembersDialog` / assignee picker to use the same helper (they already do via RLS).
- **Acceptance:** signed-in user A cannot select user B's profile row when they share no board.
      Existing UI keeps working for legitimate co-members.

### 6. RLS test suite + CI
- [ ] `supabase/tests/` with pgTAP coverage for every table:
      member can read; non-member cannot; owner-only writes are owner-only.
- [ ] GitHub Actions: `install → lint → typecheck → next build → opennextjs-cloudflare build → pgTAP`.
- [ ] PR template referencing `BUILD.md` section 8 conventions.
- **Acceptance:** CI is green on `main`; a PR that weakens RLS fails before review.

---

## v1.1 — Make a team stay

The features that turn a clean demo into a tool people open every morning.

### 7. Activity log
- [ ] `card_events (id, card_id, board_id, actor uuid, kind text, payload jsonb, created_at)`.
- [ ] Insert via DB triggers on `cards` (create/update/delete/move) — never from the app.
- [ ] "Activity" tab in `CardModal`, newest first, with relative timestamps.
- [ ] RLS: read = board member. Append-only (no update/delete policy).
- **Acceptance:** moving a card writes "Sam moved this to Done, 2m ago" visible to all members.

### 8. Email-invite flow (fixes the chicken-and-egg)
- [ ] `board_invites (board_id, email citext, invited_by, created_at, primary key (board_id, email))`.
- [ ] `add_board_member` falls back to inserting an invite when the email has no profile yet.
- [ ] On `auth.users` insert, after `handle_new_user`, consume any invites matching the email
      and insert `board_members` rows.
- [ ] Owner sees pending invites in `MembersDialog` and can revoke.
- **Acceptance:** owner invites a stranger by email → stranger clicks magic link → lands on the
      board with no extra step.

### 9. Archive on Done
- [ ] `cards.archived_at timestamptz` (null = active).
- [ ] Auto-set when a card has been in a column flagged `is_done` for > 14 days
      (configurable per board), via a daily cron or a row-level check on read.
- [ ] `columns.is_done boolean` so owners can mark the done column.
- [ ] Filter chip "Show archived" in the filter bar.
- **Acceptance:** a quarter-old board doesn't have a 200-card Done column by default.

### 10. WIP limits per column
- [ ] `columns.wip_limit int null`.
- [ ] When count > limit, the column header shows a red pin dot and a count like `8 / 5`.
- [ ] Soft only — no write blocking. WIP is a signal, not a gate.
- **Acceptance:** owner sets a limit; the column visibly warns when over.

### 11. Fractional index ordering
- [ ] Add `position numeric` (or `text` for LexoRank) alongside the integer column; backfill.
- [ ] Reorder writes a single new position between neighbours — no N-update cascade.
- [ ] Replace `reorderCards` with `rpc('reorder_card', { id, before, after })`.
- [ ] Drop the integer column once verified.
- **Acceptance:** two users dragging the same column concurrently no longer fight; the
      Network tab shows one UPDATE per drag, not N.

### 12. Optimistic concurrency on card edits
- [ ] `updateCard` includes `updated_at` in the WHERE clause.
- [ ] On 0-row update, refetch and surface "this card changed — reload to edit" inline in the modal.
- **Acceptance:** two browsers editing the same field don't silently overwrite each other.

---

## v1.2 — Differentiators

The "your data, your board" pitch needs proof points.

### 13. Public read-only board sharing
- [ ] `boards.public_slug text unique null`.
- [ ] Anonymous `select` policy on `boards`/`columns`/`cards` when accessed by slug
      (via a definer function — never a blanket anon policy).
- [ ] `/share/:slug` route, no auth, no editing UI, no realtime needed.
- [ ] Owner toggles in board settings; copy-link button.
- **Acceptance:** owner shares a link with a stakeholder who isn't a member; stakeholder reads
      without signing in; cannot write.

### 14. Board templates
- [ ] `supabase/seed.sql` defines 3 templates: Engineering sprint, Marketing pipeline, Personal.
- [ ] `create_board_from_template(name text, template text)` RPC seeds columns + sample cards.
- [ ] Template picker in the "New board" form (default = Backlog/To Do/In Progress/Done).
- **Acceptance:** a brand-new user has a populated board within 10 seconds of sign-in.

### 15. Export (JSON + CSV)
- [ ] Board admin: "Download as JSON" → full board snapshot.
- [ ] Board admin: "Cards as CSV" → flat sheet.
- [ ] Server action streams; no extra storage.
- **Acceptance:** the README "your data, your Supabase" claim is backed by a one-click export.

### 16. Mobile board view
- [ ] Breakpoint: < 768px renders one column at a time with a swipe carousel and a column picker.
- [ ] Tap card → modal full-screen. Long-press → move-to-column sheet.
- [ ] Drag is *not* the primary interaction on mobile; the move sheet is.
- **Acceptance:** the board is usable one-handed on a phone for triage.

### 17. Dark mode
- [ ] CSS variables driven by `data-theme` on `<html>`; tokens already in `BRAND.md` §2.
- [ ] Toggle in `UserMenu`, persisted in `localStorage`, honours `prefers-color-scheme` first load.
- [ ] Audit every hex literal in components — move to CSS vars in `globals.css`.
- **Acceptance:** the whole app passes WCAG AA in both themes; no flash on load.

---

## v2.0 — Only if users ask

Don't pre-build any of these. Wait for repeat signal from real users.

- Comments on cards (one table, RLS by board membership, no `@mentions` v1).
- Multiple views over the same data: table view, calendar by `due_date`.
- Webhooks on card events (one Worker, fan out via Cloudflare Queues).
- Google OAuth (`/auth/callback` already supports it — just enable the provider docs).
- One quiet AI feature (opt-in, user-supplied key): "summarise this column for standup."

---

## Explicit non-goals (do not build)

These come up a lot. The answer is no for v1/v2 unless the rest of the roadmap is done first.

- A `teams` table or multi-board permissions model. Board = team. That is the product.
- A service-role key path in the app. RLS is the security boundary, period (`BUILD.md` §2).
- Sub-tasks / checklists. Cards are atomic units of work.
- File attachments. Use links. Storage and quotas are not what this product is for.
- Real-time cursors / presence. Looks cool, costs a lot, helps no one ship.
- An AI sidebar. The market is flooded; brand discipline matters more.
- Notifications/email digests in v1 — bolt-on with webhooks later if asked.
- Jira/Trello import wizards. Export from them, paste titles, move on.

---

## Engineering principles (carry forward from `BUILD.md`)

- **RLS is the security boundary.** If the app can't read something, fix the policy or the
  query, never the model.
- **One concern per component.** Don't add libraries the stack already covers.
- **Server Components fetch; Client Components hold state.** Mutations are Server Actions.
- **Optimistic UI + Realtime reconciliation.** Apply realtime payloads to state directly;
  refetch only on error or version mismatch.
- **Schema changes are migrations, not edits to `schema.sql`.** Start `supabase/migrations/`
  on the first v1.0 task that touches the DB.
- **Every schema change ships with a pgTAP test in the same PR.**
- **Colour means something.** New UI states reuse the Pin set in `BRAND.md` §2 — no new hues.

---

## Testing checklist (keep current)

- [ ] pgTAP: per-table RLS (member read, non-member denied, owner-only writes).
- [ ] pgTAP: `create_board`, `add_board_member`, future RPCs all enforce ownership.
- [ ] Playwright (or Vitest + RTL): magic-link redirect, board create, card CRUD, drag persist,
      filter URL round-trip, deep-link card open.
- [ ] CI runs the lot on every PR and on `main`.

---

## Release checklist (per tag)

- [ ] `CHANGELOG.md` updated (keep-a-changelog).
- [ ] Migrations applied on a fresh Supabase project end-to-end (smoke).
- [ ] `npm run deploy` succeeds against a staging Worker.
- [ ] Screenshots in `screenshots/` refreshed if UI changed.
- [ ] README "Deploy to Cloudflare" still one-shot for a stranger.
