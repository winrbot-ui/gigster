/**
 * Canonical public site URL for invite links, auth redirects, and emails.
 * Prefer NEXT_PUBLIC_SITE_URL on Vercel; never use VERCEL_URL for user-facing links.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return "https://www.gigster.website";
}
