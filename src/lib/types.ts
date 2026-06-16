export type Priority = "none" | "low" | "medium" | "high";

export type CardLink = { label: string; url: string };

export type Card = {
  id: string;
  board_id: string;
  column_id: string;
  // Per-board monotonic identifier, rendered as `${board.prefix}-${number}`.
  // Null only for optimistic temp cards before the server trigger has assigned one.
  number: number | null;
  title: string;
  description: string;
  assignee: string | null;
  due_date: string | null;
  priority: Priority;
  labels: string[];
  links: CardLink[];
  position: number;
  created_at: string;
  updated_at: string;
};

export type Column = {
  id: string;
  board_id: string;
  title: string;
  position: number;
};

export type Member = {
  user_id: string;
  role: "owner" | "member";
  full_name: string | null;
  email: string | null;
};

export type BoardSummary = { id: string; name: string; role: string };

// Re-export brand tokens so existing call-sites keep working.
import { THEME, tack } from "./theme";
export { THEME, tack };

// Priority → Pin set. High is the red Pin (the one true accent).
// `none` is slate so an empty dot reads as "no signal", not "low".
export const PRIORITY_COLOR: Record<Priority, string> = {
  none: tack.pins[5], // slate
  low: tack.pins[3],  // blue
  medium: tack.pins[1], // amber
  high: tack.pins[0], // red Pin
};

// Labels reuse the Pin set verbatim — colour is meaning, never decoration.
export const LABEL_PALETTE = [...tack.pins];

export function avatarColor(seed: string | null | undefined): string {
  if (!seed) return THEME.muted;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return LABEL_PALETTE[h % LABEL_PALETTE.length];
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return (p[0][0] + (p[1] ? p[1][0] : "")).toUpperCase();
}
