# Tack — Pricing

> Pin it. Move it. Done. — and only pay when you want us to run it for you.

Tack is **MIT-licensed and free to self-host, forever, with unlimited seats**. Tack Cloud
is the same code, hosted by us — you pay for the convenience of not running infrastructure,
not for features. The pricing below reflects that: Cloud is gated on **scale and managed
services**, never on core board features.

---

## Tiers

| | **Free** | **Team** |
|---|---|---|
| **Price** | $0 | **$4 / user / mo** (billed annually) · $5 monthly |
| Boards | Up to 2 | Unlimited |
| Members | Up to 5 | Unlimited |
| Cards | Unlimited | Unlimited |
| Real-time, RLS, magic-link login | ✅ | ✅ |
| Calendar & table views | ✅ | ✅ |
| Intake forms, reminders, automations | — | ✅ |
| Managed AI (we hold the key — no setup) | — | ✅ |
| Backups & updates handled by us | ✅ | ✅ |
| Priority support | — | ✅ |

**Self-host** — everything in Team, $0, on your own Supabase + Cloudflare. Your data never
leaves your infrastructure. See [`README.md`](README.md#self-hosting).

---

## Why these numbers

- **Cost isn't the driver.** A single Supabase Pro project ($25/mo) plus Cloudflare Workers
  (pennies at team scale) serves many teams. Cloud margins are high; price is about value
  capture and positioning, not cost recovery.
- **$4–5/seat is the credible floor.** Below that, a B2B tool reads as a hobby project and
  trust drops — the opposite of Tack's craft positioning. It also undercuts Trello Standard
  (~$5–6) and Linear Basic ($8) while the polish justifies the gap.
- **The price-sensitive already have free self-host.** Cloud buyers pay to *not* run infra.
  Squeezing the per-seat number wins few of them and caps future pricing power.
- **Annual anchor, monthly escape hatch.** Lead with the annual number ($4); monthly ($5)
  exists for trials and the commitment-averse.

---

## Alternative: flat per-board

For agencies and teams with many light collaborators (where per-seat punishes exactly the
collaboration Tack wants — intake submitters, occasional ops folk), a flat option fits the
**"board = team"** model better:

- **$9 / board / mo, unlimited members.** A 6-person team pays ~$1.50/head; the headline
  number stays small without dropping to zero.

Launch per-seat (familiar, scales with value); add this if seat friction shows up with agencies.

---

## What we will *not* do

- **Paywall core board features.** The README promises feature parity with self-host. Cloud
  gates on *scale* (boards, seats) and *managed services* (AI key, backups, support) — never
  on core kanban. Breaking that undermines the open-source trust that is the distribution story.
- **Make AI the paywall.** AI is calm, opt-in, and bring-your-own-key (it costs us nothing).
  Managed AI on Cloud is a *convenience* — skip the key setup — not the reason to upgrade.
- **Build a pricing matrix pre-PMF.** Two tiers. Add complexity only when real usage demands it.
