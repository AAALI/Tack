<!--
Keep PRs small and one-concern. See BUILD.md §8 (Conventions) and the ROADMAP
operating doctrine before opening. Delete sections that don't apply.
-->

## What & why

<!-- One or two sentences. What does this change and what problem does it solve? -->

## Checklist (BUILD.md §8)

- [ ] **One concern.** This PR does one thing; no drive-by refactors bundled in.
- [ ] **RLS is the boundary.** No policy was weakened to make a feature work. If a read failed, I
      fixed the policy or the query — not the security model.
- [ ] **Mutations go through Server Actions** (no client-side writes with elevated keys).
- [ ] **Schema change?** Shipped as a numbered file in `supabase/migrations/`, mirrored into
      `supabase/schema.sql`, **with a matching pgTAP test** in `supabase/tests/database/`.
- [ ] **Colour means something.** Any new UI state reuses the Pin set in `BRAND.md` §2 — no new hues.
- [ ] **AI (if touched) is opt-in, keyed per user, and confirms before it writes.**
- [ ] `npm run lint` and `npm run build` pass locally.

## Schema / security notes

<!-- If this touches the DB: what tables/policies/triggers changed, and which pgTAP cases cover them?
     If not, write "no schema changes". -->

## How I verified

<!-- Build/lint output, the pgTAP run, manual steps, screenshots for UI. -->
