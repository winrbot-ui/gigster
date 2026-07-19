import { PageHeader } from "@/components/app/app-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EXTENSION_STORE } from "@/lib/extension-store";

const faqs = [
  {
    q: "Is Gigster free?",
    a: "Yes. Reply drafting is free — sign in, install the extension, and let it write your client replies at no cost. You only pay after you close your first deal: a membership ($200 Basic / $300 Pro, 30 days) unlocks the client brief document and the project website we build for that deal.",
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
    a: "Telegram pings you when a new client writes, when a deal is ready to close, and when the project website for a deal is finished. Link it from the dashboard notifications.",
  },
  {
    q: "What happens when a client is ready to close?",
    a: "Once scope, budget, and deadline are agreed, Gigster turns the whole conversation into a project brief. From the extension popup you then pick what to deliver: the project website, the brief as a PDF, or both. The build runs in the background — watch progress in the popup or on the Clients page.",
  },
  {
    q: "Who actually builds the project website?",
    a: "Gigster does — from the deal itself. Everything you and the client agreed on in the chat (pages, features, budget, deadline) becomes the spec, and Gigster builds and deploys the site from that spec. It's not a mockup or a screenshot; it's a working site you send to the client.",
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

function ExtensionInstallCard({
  name,
  storeUrl,
}: {
  name: string;
  storeUrl: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{name}</p>
        <Badge tone="success">Live</Badge>
      </div>
      <p className="text-sm text-muted">
        Install from the Chrome Web Store, then log in with the same account as this dashboard.
      </p>
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClasses("primary", "sm")}
      >
        Add to Chrome
      </a>
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
              replies cost nothing. You only activate a paid plan after you close
              your first deal — that unlocks the client brief and the project
              website Gigster builds for it.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>1. Install the Chrome extension</CardTitle>
              <Badge tone="success">Chrome Web Store</Badge>
            </div>
            <CardDescription>
              One extension per marketplace — install the one you sell on. Free, no card.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Both extensions are published on the Chrome Web Store. Click{" "}
              <span className="text-foreground">Add to Chrome</span> below. On Pro
              you can run both at once.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ExtensionInstallCard
                name={EXTENSION_STORE.fiverr.name}
                storeUrl={EXTENSION_STORE.fiverr.url}
              />
              <ExtensionInstallCard
                name={EXTENSION_STORE.freelancer.name}
                storeUrl={EXTENSION_STORE.freelancer.url}
              />
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
            <CardTitle>3. From conversation to delivered project</CardTitle>
            <CardDescription>What happens after the drafting.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Step n={1} title="Gigster negotiates with you">
              Every draft keeps the deal moving — scope, budget, deadline. You stay
              in control: read, edit, send.
            </Step>
            <Step n={2} title="The deal becomes a brief">
              When the client confirms, the whole thread is distilled into one
              project brief: what you sold, for how much, by when.
            </Step>
            <Step n={3} title="Gigster builds the project from that brief">
              Pick website, brief PDF, or both. The site is built from what was
              agreed in the chat and deployed at your own link — ready to send to
              the client as the deliverable.
            </Step>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Manual vs Auto</CardTitle>
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
            <CardTitle>5. Connect Telegram (optional)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            Link Telegram to get pinged for new clients, deals ready to close, and
            finished project sites — so you never miss a hot lead.
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
