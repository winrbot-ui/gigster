import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Gigster collects, uses, and protects your data across gigster.website and the Gigster Chrome extensions.",
};

const LAST_UPDATED = "July 14, 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      <div className="mt-2 flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <Container className="py-24">
      <article className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-sm text-muted">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-muted">
          <Section title="1. Who we are">
            <p>
              Gigster (&quot;we&quot;, &quot;us&quot;) operates{" "}
              <Link href="/" className="text-accent-strong hover:underline">
                gigster.website
              </Link>{" "}
              and the Gigster Chrome extensions for Fiverr and Freelancer
              (collectively, the &quot;Service&quot;). This Privacy Policy
              explains how we collect, use, store, and share information when you
              use our website, dashboard, and browser extensions.
            </p>
            <p>
              Gigster is an invite-only platform for freelancers. By using the
              Service, you agree to this Privacy Policy. Our{" "}
              <Link href="/tos" className="text-accent-strong hover:underline">
                Terms of Service
              </Link>{" "}
              also apply.
            </p>
          </Section>

          <Section title="2. Information we collect">
            <p>
              <span className="font-medium text-foreground">Account data.</span>{" "}
              When you sign up, we collect your email address, @nickname
              (username), password (stored securely via our authentication
              provider), invite/referral metadata, and account status (e.g. free,
              active member).
            </p>
            <p>
              <span className="font-medium text-foreground">
                Marketplace conversation data.
              </span>{" "}
              When you use a Gigster Chrome extension, the extension reads the
              visible text of client conversations in your open Fiverr or
              Freelancer inbox tab — only after you log in and press Start (or
              enable Auto mode). This text is sent to our servers to generate AI
              reply drafts, track negotiation progress, and produce client briefs
              when a deal is confirmed.
            </p>
            <p>
              <span className="font-medium text-foreground">
                AI persona and project data.
              </span>{" "}
              Your agent persona settings (name, tone, specialty, rules) and
              structured project records (requirements, budget, deadlines, brief
              scores) are stored in our database to power Agent 1 drafting and
              Agent 2 site builds.
            </p>
            <p>
              <span className="font-medium text-foreground">
                Extension settings (local).
              </span>{" "}
              The Chrome extension stores your login session tokens, manual/auto
              mode preference, and related settings locally in your browser using
              Chrome&apos;s storage API so you stay signed in between sessions.
            </p>
            <p>
              <span className="font-medium text-foreground">
                Payment and subscription data.
              </span>{" "}
              If you activate a paid membership, we record your chosen plan,
              USDT transaction hash (submitted by you), and subscription dates.
              We do not store cryptocurrency wallet private keys.
            </p>
            <p>
              <span className="font-medium text-foreground">
                Technical and security data.
              </span>{" "}
              We may collect IP addresses at signup and login for abuse prevention,
              and standard server logs (timestamps, request metadata) for
              security and reliability.
            </p>
            <p>
              <span className="font-medium text-foreground">
                Optional integrations.
              </span>{" "}
              If you connect Telegram, we store a link code and your Telegram chat
              ID to send you notifications (new clients, brief ready, site
              ready). Email delivery uses our transactional email provider.
            </p>
          </Section>

          <Section title="3. How we use your information">
            <ul className="list-disc space-y-2 pl-5">
              <li>Authenticate you on the website and in Chrome extensions.</li>
              <li>
                Generate AI reply drafts in your configured persona (Agent 1).
              </li>
              <li>
                Track client negotiations and produce brief documents and preview
                sites when you choose (paid features after membership activation).
              </li>
              <li>Operate subscriptions, payments verification, and support.</li>
              <li>Send optional Telegram and email notifications you enable.</li>
              <li>Prevent abuse, enforce invite rules, and maintain security.</li>
            </ul>
            <p>
              We do <span className="font-medium text-foreground">not</span> sell
              your personal data to third parties. We do not use your marketplace
              inbox content for advertising or unrelated profiling.
            </p>
          </Section>

          <Section title="4. Chrome extensions (Fiverr and Freelancer)">
            <p>
              The Gigster Chrome extensions are the primary way members use Agent
              1. Each extension is limited to one marketplace and requests only
              the permissions needed for its function:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-foreground">Storage</span> —
                session tokens and extension preferences, stored locally in your
                browser.
              </li>
              <li>
                <span className="font-medium text-foreground">Tabs</span> —
                detect when you have the correct marketplace inbox open.
              </li>
              <li>
                <span className="font-medium text-foreground">Scripting</span> —
                read visible inbox message text on pages you are already viewing.
              </li>
              <li>
                <span className="font-medium text-foreground">Alarms</span> —
                periodic checks only when Auto mode is enabled and the extension
                is running; no alarms when stopped.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Host permissions
                </span>{" "}
                — limited to the relevant marketplace domain (fiverr.com or
                freelancer.com), gigster.website, and our API at
                gigsterbackend-production.up.railway.app.
              </li>
            </ul>
            <p>
              <span className="font-medium text-foreground">No remote code.</span>{" "}
              The extensions do not download or execute external JavaScript or
              other executable code. They communicate with our API over HTTPS and
              receive draft text as JSON.
            </p>
            <p>
              <span className="font-medium text-foreground">Manual mode</span> is
              the default: you review each draft before sending.{" "}
              <span className="font-medium text-foreground">Auto mode</span> is
              optional and requires explicit opt-in plus acceptance of a ban-risk
              disclaimer.
            </p>
            <p>
              You control when the extension runs. Stop the extension at any time
              from the popup. Logging out removes the local session from your
              browser.
            </p>
          </Section>

          <Section title="5. Where data is processed and stored">
            <p>
              Data is stored in Supabase (PostgreSQL) and processed on our backend
              hosted on Railway. AI drafting uses server-side models (Anthropic
              Claude and OpenAI) — prompts and persona logic never run inside the
              extension or public website bundle.
            </p>
            <p>
              Agent 2 preview sites are deployed to *.gigsterr.online via Vercel.
              Those public sites contain only the client project content you
              approve for delivery, not your Gigster account credentials.
            </p>
          </Section>

          <Section title="6. Data retention">
            <p>
              We retain account and project data while your membership is active
              or while you use the free tier. Conversation messages and project
              records are kept to maintain thread continuity and negotiation
              history. You may request deletion of your account and associated
              data by contacting us (see Section 10).
            </p>
            <p>
              Extension-local data (tokens, settings) remains on your device until
              you uninstall the extension, clear browser data, or log out.
            </p>
          </Section>

          <Section title="7. Third-party services">
            <p>We use trusted providers to operate the Service:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Supabase — authentication and database</li>
              <li>Railway — API hosting</li>
              <li>Vercel — website and Agent 2 preview hosting</li>
              <li>Anthropic / OpenAI — AI drafting (server-side only)</li>
              <li>Resend — transactional email</li>
              <li>Telegram Bot API — optional notifications</li>
              <li>Cloudflare — DNS, security, and bot protection</li>
            </ul>
            <p>
              These providers process data only as needed to deliver the Service
              and are bound by their own privacy and security obligations.
            </p>
          </Section>

          <Section title="8. Security">
            <p>
              We use industry-standard measures including HTTPS encryption,
              row-level database access controls, server-only API keys, invite
              gates, rate limiting, and email verification. No system is perfectly
              secure; use a strong unique password and keep your extension login
              private.
            </p>
          </Section>

          <Section title="9. Your choices and rights">
            <p>You can:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Update your persona and password in the dashboard.</li>
              <li>Stop or uninstall the Chrome extension at any time.</li>
              <li>Decline Auto mode and use Manual mode only.</li>
              <li>Choose not to connect Telegram.</li>
              <li>
                Request access, correction, or deletion of your account data by
                emailing us.
              </li>
            </ul>
            <p>
              If you are in the European Economic Area or UK, you may have
              additional rights under applicable data protection law (access,
              rectification, erasure, restriction, portability, objection). Contact
              us to exercise these rights.
            </p>
          </Section>

          <Section title="10. Children">
            <p>
              Gigster is not intended for users under 18. We do not knowingly
              collect data from children.
            </p>
          </Section>

          <Section title="11. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. The &quot;Last
              updated&quot; date at the top will change when we do. Material
              changes may be communicated via the website or email.
            </p>
          </Section>

          <Section title="12. Contact us">
            <p>
              For privacy questions, data requests, or Chrome Web Store inquiries:
            </p>
            <p>
              Email:{" "}
              <a
                href="mailto:privacy@gigster.website"
                className="text-accent-strong hover:underline"
              >
                privacy@gigster.website
              </a>
            </p>
            <p>
              Website:{" "}
              <Link href="/" className="text-accent-strong hover:underline">
                https://www.gigster.website
              </Link>
            </p>
            <p>
              Setup help:{" "}
              <Link href="/guide" className="text-accent-strong hover:underline">
                gigster.website/guide
              </Link>
            </p>
          </Section>
        </div>
      </article>
    </Container>
  );
}
