// Typed senders: combine an email template with the Resend transport, and
// resolve absolute URLs. These are best-effort — a failed email must never
// break the action that triggered it, so callers can safely ignore the result.

import { sendEmail } from "./resend";
import { welcomeEmail, boardInviteEmail } from "@/emails";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tack.app").replace(/\/$/, "");
}

// Email is optional in Tack. With no RESEND_API_KEY set, every notification is a
// quiet no-op — self-hosters who don't want email get no errors, no setup.
function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendWelcome(to: string, name?: string | null) {
  if (!emailEnabled()) return;
  const { subject, html, text } = welcomeEmail({ name, boardsUrl: `${siteUrl()}/boards` });
  return sendEmail({ to, subject, html, text, idempotencyKey: `welcome/${to}` });
}

export async function sendBoardInvite({
  to,
  boardId,
  boardName,
  inviterName,
}: {
  to: string;
  boardId: string;
  boardName: string;
  inviterName?: string | null;
}) {
  if (!emailEnabled()) return;
  const { subject, html, text } = boardInviteEmail({
    boardName,
    inviterName,
    boardUrl: `${siteUrl()}/boards/${boardId}`,
  });
  // Dedupe re-invites within Resend's 24h idempotency window.
  return sendEmail({ to, subject, html, text, idempotencyKey: `board-invite/${boardId}/${to}` });
}
