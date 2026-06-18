import { Resend } from "resend";

// Lazily instantiated so a missing key fails at send time with a clear
// message, not at module load (which would break the whole worker bundle).
let client: Resend | null = null;

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  client ??= new Resend(apiKey);
  return client;
}

// Verified sender. Override RESEND_FROM once your domain is verified at
// https://resend.com/domains — onboarding@resend.dev is test-only.
const DEFAULT_FROM = process.env.RESEND_FROM ?? "Tack <onboarding@resend.dev>";

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | string[];
  from?: string;
  // Pass a stable key (e.g. `welcome-user/<id>`) to make retries safe.
  idempotencyKey?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  from = DEFAULT_FROM,
  idempotencyKey,
}: SendEmailParams) {
  const { data, error } = await getResend().emails.send(
    { from, to, subject, html, text, replyTo },
    idempotencyKey ? { idempotencyKey } : undefined
  );

  if (error) {
    // The SDK returns errors in-band rather than throwing; surface to caller.
    console.error("Resend send failed:", error);
    return { data: null, error };
  }

  return { data, error: null };
}
