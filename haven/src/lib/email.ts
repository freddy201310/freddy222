import "server-only";

// Email through Resend's HTTP API (https://resend.com). Without RESEND_API_KEY, emails are
// printed to the server log instead, which is enough for local development.

export type Email = { to: string; subject: string; text: string; html?: string };

// APP_URL wins; on Render the service's own address is used until you connect a domain.
export const appUrl = () => (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000").replace(/\/$/, "");

export async function sendEmail(email: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email] to=${email.to} subject=${JSON.stringify(email.subject)}\n${email.text}`);
    return process.env.NODE_ENV !== "production";
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Haven <alerts@havenparents.com>",
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html ?? textToHtml(email.text),
    }),
  });
  if (!res.ok) console.error(`[email] Resend error ${res.status}: ${await res.text()}`);
  return res.ok;
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function textToHtml(text: string) {
  const body = escape(text)
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>')
    .replace(/\n/g, "<br>");
  return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#151d31">${body}</div>`;
}
