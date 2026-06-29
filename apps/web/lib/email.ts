import { getSiteUrl } from "@/lib/site-url";

const RESEND_API = "https://api.resend.com/emails";

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Gigster <noreply@gigster.website>";
  if (!apiKey || !to) return false;

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  return res.ok;
}

export async function sendMembershipActivatedEmail(
  to: string,
  username: string,
): Promise<boolean> {
  const site = getSiteUrl();
  return sendEmail(
    to,
    "Your Gigster account is live",
    `<p>Hi @${username},</p>
     <p>Your membership payment was verified. You now have full access to Gigster.</p>
     <p><a href="${site}/desktop">Download the Desktop app</a> and link Telegram for message alerts.</p>
     <p>Dashboard: <a href="${site}/dashboard">${site}/dashboard</a></p>`,
  );
}

export async function sendMarketerApprovedEmail(
  to: string,
  username: string,
): Promise<boolean> {
  const site = getSiteUrl();
  return sendEmail(
    to,
    "Approved as Gigster marketer",
    `<p>Hi @${username},</p>
     <p>Your marketer application was approved. You now have unlimited invites and marketer stats.</p>
     <p><a href="${site}/marketer">Open marketer dashboard</a></p>`,
  );
}
