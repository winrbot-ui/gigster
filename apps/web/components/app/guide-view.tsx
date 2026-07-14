import { PageHeader } from "@/components/app/app-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const faqs = [
  {
    q: "Is Gigster free?",
    a: "Yes — drafting client replies in your persona (Agent 1) is free. Sign in, install the extension, and draft replies at no cost. Once you close your first deal, activate a membership ($200 Basic / $300 Pro, 30 days) to unlock the client brief document and the Agent 2 preview site.",
  },
  {
    q: "Which platforms are supported?",
    a: "Fiverr and Freelancer are live. Upwork is coming soon — your Pro plan will include it at no extra cost when it ships.",
  },
  {
    q: "Manual vs Auto mode?",
    a: "Manual (recommended): Gigster drafts each reply; you review, copy, and send it yourself on the marketplace. Auto: the extension sends the reply for you after a short delay. Auto requires accepting a ban-risk disclaimer and should be used carefully.",
  },
  {
    q: "Do I need a separate account for the extension?",
    a: "No. Use the same @nickname or email and password as this dashboard to log in inside the extension popup.",
  },
  {
    q: "Why connect Telegram?",
    a: "Telegram alerts you for new clients, brief-ready moments, and when Agent 2 finishes a preview site. Link it from the dashboard notifications.",
  },
  {
    q: "What happens when a client is ready to close?",
    a: "When the brief is ready, the extension popup offers: build a preview site (Agent 2), download a client brief (PDF), or both. Agent 2 runs in the background — track status in the popup or on the Clients page.",
  },
];

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent-strong">
        {n}
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-foreground">{title}</p>
        <div className="text-sm text-muted">{children}</div>
      </div>
    </div>
  );
}

export function GuideView() {
  return (
    <>
      <PageHeader
        title="Setup guide"
        description="Install free and start drafting in a few minutes — no card required."
      />

      <div className="flex flex-col gap-6">
        <Card className="border-accent/25 bg-accent/5">
          <CardContent className="flex flex-col gap-1 py-5">
            <p className="text-sm font-medium text-foreground">
              Everything here is free to set up.
            </p>
            <p className="text-sm text-muted">
              Installing the extension, setting your persona, and drafting client
              replies with Agent 1 cost nothing. You only activate a paid plan after
              you close your first deal — to unlock the client brief and preview site.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>1. Install the Chrome extension</CardTitle>
              <Badge tone="accent">Coming to Chrome Web Store</Badge>
            </div>
            <CardDescription>One extension per marketplace — install the one you sell on. Free, no card.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Our Fiverr and Freelancer extensions are in Chrome Web Store review.
              As soon as they are approved, a one-click{" "}
              <span className="text-foreground">Add to Chrome</span> button appears
              here — no technical setup. On Pro you can run both at once.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface-2/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Gigster for Fiverr</p>
                  <Badge tone="accent">In review</Badge>
                </div>
                <p className="text-sm text-muted">Add to Chrome link — available after approval.</p>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface-2/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Gigster for Freelancer</p>
                  <Badge tone="accent">In review</Badge>
                </div>
                <p className="text-sm text-muted">Add to Chrome link — available after approval.</p>
              </div>
            </div>
            <p className="text-sm text-muted">
              Tip: after installing, click the puzzle icon in Chrome&apos;s toolbar
              and pin Gigster so the popup is always one click away.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Start drafting</CardTitle>
            <CardDescription>Same login as this dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Step n={1} title="Log in inside the extension">
              Open the Gigster popup and sign in with the same{" "}
              <span className="text-foreground">@nickname or email</span> and password
              you use here.
            </Step>
            <Step n={2} title="Open your marketplace inbox">
              Go to your Fiverr or Freelancer inbox in the same browser.
            </Step>
            <Step n={3} title="Press Start">
              In the popup, choose a mode and press{" "}
              <span className="text-foreground">Start</span>. Gigster reads the open
              conversation and drafts a reply in your persona.
            </Step>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Manual vs Auto</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            <p className="mb-2">
              <strong className="text-foreground">Manual (recommended):</strong> Gigster
              drafts each reply; you review, copy, and send it yourself on the platform.
            </p>
            <p>
              <strong className="text-foreground">Auto:</strong> the extension sends
              replies for you. Accept the disclaimer first — long-term Auto use may risk
              marketplace bans.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Connect Telegram (optional)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            Link Telegram to get alerts for new clients, brief-ready moments, and
            preview site URLs — so you never miss a hot lead.
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
