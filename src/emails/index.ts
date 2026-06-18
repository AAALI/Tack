// Tack email content. Each builder returns a ready-to-send { subject, html, text }.
// Voice: plain, calm, a little dry — see BRAND.md §6. No hype words.

import { shell, textBody } from "./shell";

export type RenderedEmail = { subject: string; html: string; text: string };

function p(text: string): string {
  return `<p style="margin:0 0 14px;">${text}</p>`;
}

// ---------- Welcome (first sign-in) ----------

export function welcomeEmail({
  name,
  boardsUrl,
}: {
  name?: string | null;
  boardsUrl: string;
}): RenderedEmail {
  const greeting = name ? `Welcome, ${name}.` : "Welcome to Tack.";
  return {
    subject: "Welcome to Tack",
    html: shell({
      preview: "Your account is ready. Create your first board.",
      heading: greeting,
      bodyHtml:
        p("Your account is ready. Tack is a single board per team — pin a card, move it across your columns, done.") +
        p("There's no setup to get through. Make a board and add your first card."),
      button: { label: "Open Tack", url: boardsUrl },
    }),
    text: textBody([
      greeting,
      "",
      "Your account is ready. Tack is a single board per team — pin a card, move it across your columns, done.",
      "",
      "Make a board and add your first card:",
      boardsUrl,
    ]),
  };
}

// ---------- Board invitation (added to a board) ----------

export function boardInviteEmail({
  boardName,
  inviterName,
  boardUrl,
}: {
  boardName: string;
  inviterName?: string | null;
  boardUrl: string;
}): RenderedEmail {
  const who = inviterName ? `${inviterName} added you` : "You've been added";
  return {
    subject: `You're on "${boardName}"`,
    html: shell({
      preview: `${who} to the board "${boardName}" on Tack.`,
      heading: `You're on "${boardName}".`,
      bodyHtml:
        p(`${who} to this board on Tack. You can see every card and move things across the columns.`) +
        p("Open it whenever you're ready."),
      button: { label: "Open board", url: boardUrl },
    }),
    text: textBody([
      `You're on "${boardName}".`,
      "",
      `${who} to this board on Tack. You can see every card and move things across the columns.`,
      "",
      "Open the board:",
      boardUrl,
    ]),
  };
}
