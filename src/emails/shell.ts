// Shared HTML shell for every Tack email.
//
// Plain inline-styled HTML on purpose — these emails render inside a Cloudflare
// Worker and ship as part of a self-hosted OSS app, so we keep zero rendering
// dependencies (no react-dom/server) and zero third-party calls (no remote
// fonts/images). Brand tokens come from one place: src/lib/theme.ts. See BRAND.md.

import { tack } from "@/lib/theme";

// Email clients are unreliable with custom fonts, so we lead with the brand
// face and fall back cleanly. Space Grotesk for display, Inter for body,
// Space Mono for the metadata footer — matching the app.
const DISPLAY = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif";
const BODY =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'Space Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const REPO_URL = "https://github.com/AAALI/tack";

export type EmailButton = { label: string; url: string };

type ShellParams = {
  /** Hidden preheader — the grey preview line clients show next to the subject. */
  preview: string;
  /** Big Space Grotesk line at the top of the card. */
  heading: string;
  /** Body HTML (paragraphs already wrapped in <p>). */
  bodyHtml: string;
  /** Optional primary call-to-action button (the one red Pin moment). */
  button?: EmailButton;
};

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** The pinned-card lockup: a red Pin dot + the lowercase `tack.` wordmark. */
function logoLockup(): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding-right:8px;vertical-align:middle;">
        <div style="width:12px;height:12px;border-radius:50%;background:${tack.pin};line-height:12px;font-size:0;">&nbsp;</div>
      </td>
      <td style="vertical-align:middle;font-family:${DISPLAY};font-size:20px;font-weight:600;letter-spacing:-0.5px;color:${tack.ink};line-height:1;">
        tack<span style="color:${tack.pin};">.</span>
      </td>
    </tr>
  </table>`;
}

function buttonHtml(button: EmailButton): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;">
    <tr>
      <td style="border-radius:10px;background:${tack.pin};">
        <a href="${escapeAttr(button.url)}"
           style="display:inline-block;padding:12px 22px;font-family:${BODY};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
          ${button.label}
        </a>
      </td>
    </tr>
  </table>`;
}

export function shell({ preview, heading, bodyHtml, button }: ShellParams): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeAttr(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:${tack.paper};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeAttr(preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${tack.paper};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px;max-width:100%;">
            <tr>
              <td style="padding:0 4px 20px;">${logoLockup()}</td>
            </tr>
            <tr>
              <td style="background:${tack.surface};border:1px solid ${tack.hairline};border-radius:12px;padding:32px;">
                <h1 style="margin:0 0 16px;font-family:${DISPLAY};font-size:22px;font-weight:600;letter-spacing:-0.5px;line-height:1.25;color:${tack.ink};">
                  ${heading}
                </h1>
                <div style="font-family:${BODY};font-size:15px;line-height:1.6;color:${tack.ink};">
                  ${bodyHtml}
                </div>
                ${button ? buttonHtml(button) : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 4px 0;">
                <p style="margin:0;font-family:${MONO};font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${tack.slate};">
                  Pin it. Move it. Done.
                </p>
                <p style="margin:8px 0 0;font-family:${BODY};font-size:12px;line-height:1.5;color:${tack.slate};">
                  Tack is open-source, self-hosted Kanban.
                  <a href="${REPO_URL}" style="color:${tack.slate};text-decoration:underline;">View the source</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Build a plain-text version from lines — good deliverability hygiene. */
export function textBody(lines: string[]): string {
  return [...lines, "", "—", "Tack · Pin it. Move it. Done.", REPO_URL].join("\n");
}

export { DISPLAY, BODY, MONO, REPO_URL };
