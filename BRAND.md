# Tack — Brand & Design Language

> Pin it. Move it. Done. — an open-source, self-hosted Kanban for teams.

The name carries the product: a **tack** is the pin you press a card onto a board with; *to change
tack* is to shift direction, which is what a card does as it crosses your columns. Short, decisive,
ownable.

---

## 1. The idea behind the look

A board tool's real job is to lower the anxiety of "what's everyone doing and what's next." So Tack
should feel **calm and precise** — a quiet paper surface, real type, and color used only to mean
something. The world it borrows from is the physical pinboard: cards, paper, and a single red push
pin. We keep the metaphor honest but never skeuomorphic.

**The signature: the pin.** One shape — a small filled dot — does all the colored work in the
product. It's the priority marker, the label dot, the active-board indicator, and the logo. Color
is always meaning, never decoration. That single discipline is what makes Tack recognizable.

---

## 2. Color

Quiet ink-on-paper base, with a confident red pin as the one accent. This deliberately avoids the
generic "cream + terracotta + serif" and "black + neon-green" looks.

**Core**
| Token | Hex | Use |
|---|---|---|
| Ink | `#1B1B1F` | Text, wordmark, primary surfaces in dark UI |
| Paper | `#F6F5F2` | App background |
| Surface | `#FFFFFF` | Cards, panels, sidebar |
| Pin | `#E14B3B` | The accent. Primary buttons, logo dot, active states, high priority. Use sparingly. |
| Slate | `#6E6E78` | Secondary text, icons |
| Hairline | `#E6E5E1` | Borders, dividers |
| Wash | `#F1EFEA` | Label pill background, hover fills |

**Pin set** (labels, columns, priority — pick from these, don't invent new hues)
`#E14B3B` red · `#E0A33B` amber · `#3FA66A` green · `#3B73C4` blue · `#7A5BD0` violet · `#8A8A94` slate

**Dark theme** (ship it as a toggle)
| Token | Hex |
|---|---|
| Ink (bg) | `#1A1A1E` |
| Surface | `#242429` |
| Paper-dark | `#141417` |
| Text | `#ECEBE7` |
| Slate | `#9A9AA4` |
| Hairline | `#33333A` |
| Pin | `#F25C49` (nudged brighter for contrast) |

**Contrast rule:** body text is always Ink/Text, never Pin. Red is for fills, large type, dots,
and UI chrome — keep it off small paragraph text so you stay WCAG AA.

---

## 3. Typography

Avoid serif-as-hero and avoid defaulting to Inter everywhere. All three faces are open-source —
important for an OSS project.

- **Display / wordmark — Space Grotesk.** Slightly engineered, great numerals, distinctive without
  shouting. Headings, board names, the logo.
- **Interface / body — Inter.** The legibility workhorse for dense board UI. Buttons, labels, card
  text, modals.
- **Metadata / mono — Space Mono** (pairs with Space Grotesk). Dates, counts, IDs only — e.g.
  `DUE 27 JUN`, `4 cards`. The mono texture is a small, repeated signal of "precise tool."

Scale (UI): 12 / 13 / 14 body · 16 subhead · 20 board title · 30+ display. Tight tracking on
display (`-0.5` to `-1.5`), normal on body. Sentence case everywhere, including buttons.

---

## 4. Logo

- **App icon / favicon:** a white rounded-square *card* with a single red pin dot top-left and two
  faint grey lines (card text). Reads instantly as "a pinned card." Scales clean to 16px.
- **Wordmark:** `tack` in lowercase Space Grotesk, tight tracking, Ink. Optional red pin dot as a
  full stop after it. Never set the wordmark in red.
- **Clear space:** keep one dot-diameter of paper around the mark. Don't add gradients, shadows,
  or outlines.

---

## 5. Shape, space, motion

- **One shape language:** rounded-square cards (`radius 12`), pill labels, dot pins. Buttons share
  the card radius family (`8–10`).
- **Density:** comfortable, scannable for leadership, compact enough that ops can pack a column.
  Card padding `12`, column gap `16`, board padding `20`.
- **Motion is physical and minimal.** Grab lifts a card slightly (the "unpin"); drop settles it
  with a short press (the "tack in"). 120–180ms, ease-out. The pin dot does a tiny scale-in when a
  priority is set. Everything respects `prefers-reduced-motion` and turns off.
- **The one micro-interaction worth having:** the drop "settle." Don't add more.

---

## 6. Voice

Plain, calm, a little dry. No hype words ("revolutionize", "supercharge", "seamless"). Short
sentences. The product talks like a good colleague, not a brand.

- Tagline: **Pin it. Move it. Done.**
- Repo description: *Open-source, self-hosted Kanban. One board per team, magic-link login, your
  data in your own Supabase.*
- Empty board: *Nothing pinned yet. Add your first card.*
- Errors state the fix, never apologize: *That stage still has cards. Move or delete them first.*

---

## 7. Things the build doc doesn't cover (your launch checklist)

**Positioning — write this into the README hero.**
Tack sits in the gap between three things people already use and dislike: Trello (hosted, owns your
data), Jira (heavy and expensive for simple work), and Plane/Focalboard (powerful but a lot to run).
Tack's one promise: **the simplest team board you can actually own.** Free, self-hosted, your data
in your Supabase, per-team isolation enforced in the database, deploys to Cloudflare in minutes.

**Privacy stance — a real selling point for OSS.**
No analytics, no telemetry, no third-party calls beyond your own Supabase. Say it plainly in the
README. If you want usage stats, document self-hosted Plausible as opt-in.

**License.** MIT. Most permissive, best for adoption and forks. Add `LICENSE` at the root.

**Repo hygiene files to add:**
- `README.md` — hero (logo + tagline + one screenshot), 3-step quickstart, "Deploy to Cloudflare"
  section, the access-model note, privacy stance, license.
- `CONTRIBUTING.md` — how to run locally, branch/PR conventions, "keep it simple" philosophy.
- `CODE_OF_CONDUCT.md` — Contributor Covenant.
- `SECURITY.md` — RLS is the security boundary; how to report a vuln privately.
- `.github/` — issue templates (bug / feature), PR template, and a CI workflow that runs
  `install → lint → build` on PRs.
- `CHANGELOG.md` — keep-a-changelog format.
- `screenshots/` — light + dark board shots for the README and social.
- `supabase/seed.sql` — optional demo data: boards named generically (Engineering, Marketing, Ops)
  so a fresh clone has something to look at.

**One-click deploy.** Add a "Deploy to Cloudflare" button to the README pointing at the repo;
document the two Supabase env vars and the `auth/callback` redirect URLs. Pre-publish the schema as
a numbered migration in `supabase/migrations/` so a stranger can stand it up without copy-paste.

**Social / favicon.**
- Favicon: the card-with-red-pin icon (provide 16/32/180 + an SVG).
- OG image (1200×630): Paper background, the icon, `tack` wordmark, tagline `Pin it. Move it.
  Done.`, and one faint board screenshot bleeding off the right edge. Keep it ink + paper + one red
  dot.

**Accessibility (bake into P7).** WCAG AA contrast (Ink text, never red); visible focus rings in
Pin; full keyboard drag via dnd-kit's keyboard sensor; reduced-motion honored; hit targets ≥ 40px
on touch.

**Domain / handles to grab (check availability):** `tack.dev`, `usetack.com`, `tackboard.dev`,
`trytack.com`, GitHub repo `tack` (or org `tackboard` if taken), npm `tack-board`. Pick one and
make the README/OG match it.

**Roadmap seeds (label as `good first issue`).** Dark-mode toggle, Google OAuth, card comments,
CSV export, board templates. Keeping these *out* of v1 is the point — list them so contributors
know where to help.

---

## 8. Quick token reference (drop into `lib/theme.ts`)

```ts
export const tack = {
  ink: "#1B1B1F",
  paper: "#F6F5F2",
  surface: "#FFFFFF",
  pin: "#E14B3B",
  slate: "#6E6E78",
  hairline: "#E6E5E1",
  wash: "#F1EFEA",
  pins: ["#E14B3B", "#E0A33B", "#3FA66A", "#3B73C4", "#7A5BD0", "#8A8A94"],
  radius: { card: 12, control: 10 },
  motion: { fast: 120, base: 160 },
};
```
