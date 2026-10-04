import "server-only";

// Transactional email through Resend's HTTP API (the same Resend account Supabase
// uses as SMTP for auth emails). Env: RESEND_API_KEY. Without it the channel is off:
// nothing throws, so an email problem never breaks the job that sent it.

const FROM = "Kami <noreply@heykami.co.il>";

export type Email = { to: string; subject: string; html: string; text: string };

export function emailEnabled() {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(mail: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
    });
    if (!res.ok) console.error("email failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("email failed", e);
    return false;
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// The look of supabase/templates/*.html: logo, white card, one gradient button.
export function emailLayout({
  siteUrl,
  title,
  lines,
  button,
  footer,
}: {
  siteUrl: string;
  title: string;
  lines: string[];
  button: { label: string; url: string };
  footer: string;
}) {
  return `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#eef2f4;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#0b1215;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f4;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
<tr><td align="center" style="padding-bottom:20px;"><img src="${siteUrl}/icons/icon-192.png" width="64" height="64" alt="Kami" style="display:block;border:0;border-radius:32px;"></td></tr>
<tr><td dir="rtl" style="background:#ffffff;border-radius:24px;padding:36px 32px;text-align:right;box-shadow:0 8px 32px rgba(15,23,42,0.08);">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;font-weight:800;color:#0b1215;">${esc(title)}</h1>
${lines.map((l) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">${esc(l)}</p>`).join("\n")}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-top:12px;"><tr>
<td align="center" style="border-radius:999px;background:#2563eb;background-image:linear-gradient(135deg,#0891b2,#2563eb);">
<a href="${button.url}" style="display:inline-block;padding:14px 36px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(button.label)}</a>
</td></tr></table>
</td></tr>
<tr><td align="center" dir="rtl" style="padding:20px 8px 0;font-size:12px;line-height:1.6;color:#94a3b8;">${esc(footer)}</td></tr>
</table></td></tr></table>
</body></html>`;
}
