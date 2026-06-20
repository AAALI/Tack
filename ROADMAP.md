# Tack — Roadmap

A living plan for what to build, in what order, and what to deliberately leave out.
Pair this with `BRAND.md` (the look) and `BUILD.md` (the spec). When in doubt, simplicity wins.

> Rule: every item below has to survive the question *"does this make the simplest team
> board you can actually own better, or just bigger?"* If it makes it bigger, cut it.

---

## Who Tack is for (read this before adding anything)

**Tack is the board for the 80% of a company that isn't engineering.** Marketing, operations,
customer success, people/HR, finance, design, legal, founders, and agencies. These teams think in
**pipelines and stages** — campaigns, intake queues, hiring funnels, content calendars, close
processes, client work — not sprints, story points, or git branches.

- **One board = one team.** That constraint *is* the product. No `teams` table, no nested
  permission matrix. If you need a second team, make a second board.
- **The wedge:** Trello's simplicity + Linear's craft + Supabase ownership + a 2026 AI layer that
  does busywork — aimed at the people Linear and Jira ignore. Self-host free with unlimited seats,
  or Tack Cloud. *Your data, your board.*
- **Where engineering fits:** Linear/Jira/GitHub Projects own the eng sprint. We do **not** chase
  them. A small eng team — or eng-adjacent work like bug intake from support, incident triage, or a
  lightweight roadmap — can absolutely live on Tack. But we will never build velocity charts,
  burndown, story points, branch/PR integration, or sprint ceremonies. When an "eng feature"
  appears on this list, that's the signal to cut it.

Every prioritization call below flows from this. A feature that mainly helps a 50-engineer board
(e.g. heavy concurrent-drag performance) ranks *below* a feature that helps a 6-person marketing
team ship a launch (calendar view, intake forms, reminders).

---

## Operating doctrine (how we avoid becoming Monday.com)

The fastest way to kill Tack is to make it as overwhelming as the tools people are fleeing. Two
disciplines hold the line:

**1. Progressive disclosure.** Every surface has *one* primary action. Power lives behind a key,
a `✨`, or a menu — never on the default screen. A first-time marketer should see a board, three
columns, and a `+`. Nothing else until they reach for it.

**2. AI is a quiet assistant, not an autonomous agent.** The industry is racing toward "agentic"
systems that run your project for you. That is the opposite of a board you *own and understand*.
Tack's AI removes toil — writing the card, summarising the status, triaging the request — and then
gets out of the way. It is **opt-in, bring-your-own-key, and never writes without a confirm.** The
privacy story (your prompts, your key, optionally your self-hosted model) is a *feature* for the
exact buyer who chose to self-host. Calm AI is the differentiator; we let competitors drown in
agents.

---

## Shipped so far ✅

The product is launch-capable today. Already done:

- **Card identifiers** (`PREFIX-123`) with per-board numbering.
- **Command palette + global shortcuts** (`⌘K`, `C`, `/`, `?` cheatsheet).
- **Client-side filter bar** (assignee, label, priority, due, "mine"), URL-encoded and shareable.
- **Deep-linkable card modal** with a copy-link affordance.
- **`profiles_read` tightened to co-members only** (SECURITY DEFINER helper).
- **Activity log** — append-only `card_events`, trigger-written, live in the card modal.
- **Email-invite flow** — invite any email; consumed on first sign-in; owners can revoke.
- **WIP limits**, **board templates**, **JSON/CSV export**, **mobile board view**, **dark mode**.
- **App CI** (lint · typecheck · `next build` · OpenNext build) + a pgTAP RLS suite.

---

## M1 — Trust the multiplayer *(finish the foundations)*

Cheap, non-negotiable hygiene that protects everything already shipped. Do this first; it unblocks
confident iteration.

### 1.1 RLS tests in CI
- [ ] Commit `supabase/config.toml` (`supabase init`) and re-enable the `db` CI job
      (`supabase start && supabase test db`) — today the pgTAP suite only runs locally.
- [ ] PR template referencing `BUILD.md` §8 (RLS + migration + test conventions).
- **Acceptance:** a PR that weakens an RLS policy fails CI *before* a human reviews it.

### 1.2 Optimistic concurrency on card edits
- [ ] `updateCard` carries `updated_at` in its `WHERE`; a 0-row update means someone else won.
- [ ] On conflict, refetch and surface "this card changed — reload to edit" inline in the modal.
- **Acceptance:** two people editing the same card don't silently clobber each other. (Matters for
      *every* team the moment a board has two users.)

---

## M2 — The non-engineering core *(the wedge)*

The features that make Tack the obvious choice for a marketing, ops, CS, or HR team — the work
eng-first tools treat as an afterthought. This is where growth comes from.

### 2.1 Calendar view (by due date)
- [ ] A `Board / Calendar` view toggle; month grid placing cards on `due_date`, drag to reschedule.
- [ ] Honours the active filter set; cards keep their column colour.
- **Serves:** content calendars, campaign timelines, launch plans, anything deadline-driven.
- **Acceptance:** a content lead plans next month visually and drags a post to a new day.

### 2.2 Intake forms (request links)
- [ ] Per-board public form URL → creates a card in a chosen "intake" column (definer RPC, no blanket
      anon write). Owner picks which fields the form exposes (title, description, requester email).
- [ ] Rate-limited; no auth required to submit; submissions land as normal cards.
- **Serves:** creative/marketing requests, IT/ops tickets, HR queries, agency client intake. Also a
      **growth loop** — external submitters meet Tack and adopt it.
- **Acceptance:** a designer shares one link; requests stop living in their DMs and become cards.

### 2.3 Recurring cards
- [ ] A card can repeat (weekly/monthly/every-N-weeks); completing or archiving it spawns the next.
- [ ] Defined per card, visible as a small recurrence chip. No cron sprawl — generate on read/close.
- **Serves:** monthly close, weekly content, quarterly reviews, standing ops tasks.
- **Acceptance:** "Weekly newsletter" recreates itself every Monday without anyone remembering.

### 2.4 Due-date reminders & notifications
- [ ] Opt-in email (and optional Slack webhook) when a card you own is due/overdue, plus a daily
      "your day on this board" digest.
- [ ] Per-user, per-board preferences; off by default (doctrine #1).
- **Serves:** every deadline-driven team; the #1 reason non-eng work slips.
- **Acceptance:** a card never silently goes overdue for its owner.

### 2.5 Comments + @mentions
- [ ] One `card_comments` table, RLS by board membership; threaded under the card, beside Activity.
- [ ] `@member` mention notifies them (rides on 2.4's plumbing).
- **Serves:** handoffs and approvals — how non-eng teams actually collaborate. The Activity log is
      the system's voice; comments are the humans'.
- **Acceptance:** an approval conversation happens on the card, not in email.

---

## M3 — AI that does the busywork *(the 2026 layer)*

Opt-in, bring-your-own-key, confirm-before-write. Two or three features that delete the parts of
the job people hate — not an agent that takes the job over.

### 3.1 Natural-language card creation
- [ ] A `✨` in the composer / palette: *"Plan the Q3 webinar, due next Friday, assign Sara, high
      priority"* → a structured card (title, due date, assignee, priority, drafted description),
      shown for confirm/edit before save.
- **Why first:** highest leverage, lowest risk. Turns a sentence into structured work — gold for
      people who won't fill in six fields by hand.
- **Acceptance:** a non-technical user creates a complete, well-formed card by typing one line.

### 3.2 Status digest ("summarise for standup")
- [ ] Board or column → a clean, paste-ready update (what moved, what's blocked, what's overdue,
      what's next) for Slack/email/leadership.
- [ ] Generated on demand; optional weekly auto-digest (rides on 2.4).
- **Why:** non-eng managers report *upward* constantly; this is the report. A subtle "made with
      Tack" footer is a **distribution loop**.
- **Acceptance:** a team lead produces their weekly update in one click, edits a line, sends it.

### 3.3 Smart intake triage
- [ ] When a card arrives via an intake form (2.2), AI suggests column, priority, labels, and a
      likely owner from the content — applied only on confirm, or as a one-tap accept.
- **Why:** turns the ops toil of sorting a request queue into a glance.
- **Acceptance:** an ops lead clears a morning's intake in minutes, not by re-reading every request.

> **AI guardrails (apply to all of M3):** opt-in per user; key stored per user, never shared; no
> card is written or moved without an explicit confirm; prompt/board content leaves the project only
> with consent; self-hosters can point at their own model endpoint. No always-on agent, no AI
> sidebar (still a non-goal).

---

## M4 — Grow without bloat *(distribution + time-to-value)*

### 4.1 Public read-only board sharing
- [ ] `boards.public_slug`; anonymous read via a definer function (never a blanket anon policy).
- [ ] `/share/:slug` — no auth, no edit UI, no realtime. Owner toggles it; copy-link button.
- **Why:** a shared board is the top of the funnel — a stakeholder sees it and wants their own.
- **Acceptance:** an owner shares a roadmap with a client who reads it without an account.

### 4.2 Function-specific templates + landing pages
- [ ] Expand templates beyond the current four: marketing calendar, content pipeline, hiring funnel,
      CS onboarding, agency client board, weekly ops.
- [ ] Each backs a public template page (SEO: "Kanban template for marketing teams").
- **Why:** fast time-to-value *and* organic acquisition aimed squarely at non-eng searches.
- **Acceptance:** a new HR user is running a hiring pipeline within a minute of sign-up.

### 4.3 Table view + group-by-assignee
- [ ] A dense `Table` view (sortable columns) for ops/finance who think in rows.
- [ ] "Group by assignee" toggle — a lightweight read on who's carrying what (not a heavy workload
      dashboard — doctrine #1).
- **Acceptance:** an ops manager scans status as a spreadsheet and spots the overloaded teammate.

### 4.4 Light automations (preset rules only)
- [ ] A *small, fixed* set: "when moved to <Done> → set completed date / notify owner / archive after
      N days." Pick-from-a-list, **not** a Zapier-style builder.
- **Why:** "rules keep statuses current" is the #1 non-eng automation ask — but the builder is the
      bloat trap. Ship the 90% as presets and stop.
- **Acceptance:** an owner enables a rule from a dropdown; no logic-editor in sight.

---

## M5 — Durability at scale *(when real usage demands it)*

Promote these the moment boards get big and busy — not before.

### 5.1 Fractional index ordering
- [ ] `position numeric` (or LexoRank); a reorder writes one row, not an N-update cascade.
      `rpc('reorder_card', { id, before, after })`; drop the integer column once verified.
- **Acceptance:** concurrent drags on a busy board stop fighting; one UPDATE per drag.

### 5.2 Archive on Done
- [ ] `cards.archived_at` + `columns.is_done`; auto-archive after N days in a done column; a
      "Show archived" filter chip.
- **Acceptance:** a quarter-old board doesn't carry a 200-card Done column.

### 5.3 Performance pass
- [ ] Virtualise long columns; lazy-load archived cards; index audit on the hot read paths.
- **Acceptance:** a 1,000-card board scrolls and filters without jank.

---

## v2.0 — Only if users ask

Don't pre-build. Wait for repeat signal from real users.

- Multiple calendars / timeline (Gantt-lite) over `due_date` — only if calendar (2.1) demand proves it.
- Webhooks on card events (one Worker, fan out via Cloudflare Queues).
- Google OAuth (`/auth/callback` already supports it — just enable the provider).
- A self-hosted-model adapter for AI (beyond BYO-key) for the privacy-maximalist buyer.
- Semantic search across boards (embeddings) — only once a user has enough boards to get lost.

---

## Explicit non-goals (do not build)

The answer is no unless the rest of the roadmap is done first — and several are *never*.

- **A `teams` table or multi-board permission model.** Board = team. That is the product.
- **Anything from the engineering sprint world:** story points, velocity/burndown, sprints,
  git/PR integration, dependencies/Gantt critical-path. That's Linear's job.
- **A service-role key path in the app.** RLS is the security boundary, period (`BUILD.md` §2).
- **An autonomous AI agent / AI sidebar.** Calm, opt-in, confirm-before-write — or nothing.
- **A custom-field system.** Labels + links cover the 90%; arbitrary fields are the road to bloat.
  (Revisit *one* optional field per board only on overwhelming signal.)
- **A no-code automation builder.** Presets only (4.4). The builder is how simple tools die.
- **Sub-tasks / checklists.** Cards are atomic units of work.
- **File attachments / storage.** Use links. Quotas aren't this product.
- **Time tracking, real-time cursors/presence.** Looks busy, helps no one ship.
- **Jira/Trello import wizards.** Export from them, paste titles, move on.

---

## Engineering principles (carry forward from `BUILD.md`)

- **RLS is the security boundary.** If the app can't read something, fix the policy or the query,
  never the model.
- **One concern per component.** Don't add libraries the stack already covers.
- **Server Components fetch; Client Components hold state.** Mutations are Server Actions.
- **Optimistic UI + Realtime reconciliation.** Apply realtime payloads to state directly; refetch
  only on error or version mismatch.
- **Schema changes are migrations, with a matching pgTAP test in the same PR.**
- **Colour means something.** New UI states reuse the Pin set in `BRAND.md` §2 — no new hues.
- **AI is opt-in, keyed per user, and confirms before it writes.** (New, and load-bearing.)

---

## Testing checklist (keep current)

- [ ] pgTAP: per-table RLS (member read, non-member denied, owner-only writes) — running in CI.
- [ ] pgTAP: `create_board`, `add_board_member`, intake/recurring/comment RPCs enforce ownership.
- [ ] Playwright (or Vitest + RTL): magic-link redirect, board create, card CRUD, drag persist,
      filter URL round-trip, deep-link card open, calendar drag, intake-form submit.
- [ ] CI runs the lot on every PR and on `main`.

---

## Release checklist (per tag)

- [ ] `CHANGELOG.md` updated (keep-a-changelog).
- [ ] Migrations applied on a fresh Supabase project end-to-end (smoke).
- [ ] `npm run deploy` succeeds against a staging Worker.
- [ ] Screenshots in `screenshots/` refreshed if UI changed.
- [ ] README "Deploy to Cloudflare" still one-shot for a stranger.
