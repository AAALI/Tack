// Tack brand tokens. Keep all colour decisions here — see BRAND.md.

export const tack = {
  ink: "#1B1B1F",
  paper: "#F6F5F2",
  surface: "#FFFFFF",
  pin: "#E14B3B",
  slate: "#6E6E78",
  hairline: "#E6E5E1",
  wash: "#F1EFEA",
  // The pin set: labels, priority, column markers — pick from these, never invent.
  pins: ["#E14B3B", "#E0A33B", "#3FA66A", "#3B73C4", "#7A5BD0", "#8A8A94"],
  radius: { card: 12, control: 10 },
  motion: { fast: 120, base: 160 },
} as const;

// Back-compat alias for the legacy `THEME` import shape used across the app.
// `accent` is the Pin; `danger` stays red (same Pin) — error states use text colour, not new hues.
export const THEME = {
  paper: tack.paper,
  surface: tack.surface,
  ink: tack.ink,
  muted: tack.slate,
  hair: tack.hairline,
  wash: tack.wash,
  accent: tack.pin,
  danger: tack.pin,
} as const;
