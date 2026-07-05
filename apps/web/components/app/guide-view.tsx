import { PageHeader } from "@/components/app/app-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const faqs = [
  {
    q: "Which platforms are supported?",
    a: "Fiverr and Freelancer are live. Upwork is coming soon — your Pro plan will include it at no extra cost when it ships.",
  },
  {
    q: "Manual vs Auto mode?",
    a: "Manual: Gigster drafts replies; you copy and send on the marketplace. Auto: the extension sends after a short delay. Auto requires accepting a ban-risk disclaimer and should be used carefully.",
  },
  {
    q: "How do I install the extension?",
    a: "Build with npm run build:extension:fiverr or build:extension:freelancer, then load the dist/ folder in Chrome → Extensions → Developer mode → Load unpacked.",
  },
  {
    q: "Why connect Telegram?",
    a: "Telegram alerts you for new clients, brief-ready moments, and when Agent 2 finishes a preview site. Link it from Dashboard → notifications.",
  },
  {
    q: "What happens when the brief is ready?",
    a: "The extension popup offers: build a preview site (Agent 2), download a client brief (PDF), or both. Agent 2 runs asynchronously — poll status in the popup or check Projects.",
  },
];

export function GuideView() {
  return (
    <>
      <PageHeader
        title="Setup guide"
        description="Install extensions, choose a mode, and connect Telegram."
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Install the Chrome extension</CardTitle>
            <CardDescription>One extension per marketplace.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted">
            <p>
              <strong className="text-foreground">Fiverr:</strong> run{" "}
              <code className="rounded bg-surface-2 px-1">npm run build:extension:fiverr</code>,
              load <code className="rounded bg-surface-2 px-1">apps/extension-fiverr/dist</code> in
              Chrome.
            </p>
            <p>
              <strong className="text-foreground">Freelancer:</strong> run{" "}
              <code className="rounded bg-surface-2 px-1">npm run build:extension:freelancer</code>,
              load <code className="rounded bg-surface-2 px-1">apps/extension-freelancer/dist</code>.
            </p>
            <p>Log in with the same @nickname or email as the web dashboard.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Manual vs Auto</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            <p className="mb-2">
              <strong className="text-foreground">Manual (recommended):</strong> open inbox,
              press Start — Gigster drafts each reply; you copy and send on the platform.
            </p>
            <p>
              <strong className="text-foreground">Auto:</strong> extension sends replies for you.
              Accept the disclaimer first. Long-term Auto use may risk marketplace bans.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Connect Telegram</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            From the dashboard, open Telegram linking and send the bot your link code. You&apos;ll
            get alerts for new clients, brief ready, and preview URLs.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {faqs.map((item) => (
              <div key={item.q}>
                <p className="text-sm font-medium">{item.q}</p>
                <p className="text-sm text-muted">{item.a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
