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
  wip_limit?: number | null;
};

export type Member = {
  user_id: string;
  role: "owner" | "member";
  full_name: string | null;
  email: string | null;
};

export type BoardSummary = { id: string; name: string; role: string };

export type CardEventKind = "created" | "moved" | "updated";

export type CardEvent = {
  id: string;
  card_id: string;
  board_id: string;
  actor: string | null;
  kind: CardEventKind;
  payload: { from?: string; to?: string; fields?: string[] };
  created_at: string;
};

// Compact relative time for activity/metadata. "just now", "4m", "3h", "2d",
// then falls back to a short date.
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

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
