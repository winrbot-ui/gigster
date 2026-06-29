import type { Metadata } from "next";
import Link from "next/link";
import { requireActive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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
import { DesktopCredentials } from "@/components/app/desktop-credentials";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Desktop app",
};

export default async function DesktopPage() {
  const user = await requireActive();
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? "";
  const refreshToken = session?.refresh_token ?? "";
  const apiUrl = process.env.GIGSTER_API_URL?.trim() ?? "";
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, platforms_allowed, expires_at, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: tg } = await supabase
    .from("telegram_links")
    .select("link_code, linked_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const platforms = sub?.platforms_allowed ?? 1;
  const downloadUrl = process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL?.trim() ?? "";
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "") ?? "";

  return (
    <>
      <PageHeader
        title="Desktop app"
        description="Monitors your freelance message tabs and sends Telegram alerts."
        action={<Badge tone="accent">{sub?.plan ?? "—"} plan</Badge>}
      />

      <div className="grid gap-6">
        <Card className="border-accent/30">
          <CardHeader>
            <CardTitle>Download (Windows)</CardTitle>
            <CardDescription>
              {downloadUrl
                ? "Install the Gigster Desktop app to monitor message tabs and receive Telegram alarms."
                : "Installer URL not configured yet — build locally or wait for the published release."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {downloadUrl ? (
              <>
                <a
                  href={downloadUrl}
                  className={buttonClasses("primary", "md")}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Gigster for Windows
                </a>
                <p className="text-muted">
                  After install, open the app and paste the connection values from below (API URL, tokens, Supabase).
                </p>
              </>
            ) : (
              <>
                <p className="text-muted">
                  Admin: set <code>NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL</code> on Vercel after uploading the
                  .exe (GitHub Release or Supabase Storage).
                </p>
                <code className="rounded bg-surface-2 px-3 py-2 text-xs">
                  npm install && npm run build --workspace @gigster/desktop
                </code>
                <p className="text-muted">
                  Output: <code>apps/desktop/src-tauri/target/release/bundle/nsis/</code>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connect the app</CardTitle>
            <CardDescription>
              Paste these into the desktop app to authenticate. Do not share your access token.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DesktopCredentials
              apiUrl={apiUrl}
              accessToken={accessToken}
              refreshToken={refreshToken}
              supabaseUrl={publicEnv.supabaseUrl}
              supabaseAnonKey={publicEnv.supabaseAnonKey}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Setup checklist</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted">
              <p>1. Complete <Link href="/agent-setup" className="text-accent-strong hover:underline">Agent setup</Link> (persona).</p>
              <p>2. Open Chrome — one profile per platform ({platforms} allowed on your plan).</p>
              <p>3. Keep the platform <strong className="text-foreground">Messages</strong> tab open.</p>
              <p>4. Install Desktop app → paste connection values from below (tokens refresh automatically).</p>
              <p>5. Link Telegram (code below) for message alarms.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Telegram link</CardTitle>
              <CardDescription>One central Gigster bot — send /start and your code.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {tg?.link_code ? (
                <>
                  <p className="font-mono text-lg text-accent-strong">{tg.link_code}</p>
                  <p className="text-sm text-muted">
                    {tg.linked_at
                      ? "Telegram linked."
                      : botUsername
                        ? (
                            <>
                              Open{" "}
                              <a
                                href={`https://t.me/${botUsername}`}
                                className="text-accent-strong hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                @{botUsername}
                              </a>
                              {" "}→ /start → paste this code.
                            </>
                          )
                        : "Open Telegram → Gigster bot → /start → paste this code."}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">Link code will appear after profile sync.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Manual vs Auto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="font-medium text-foreground">Manual (default)</p>
              <p className="text-muted">Telegram ping → you open thread → Generate → paste reply. Lower ban risk.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Auto (opt-in)</p>
              <p className="text-muted">App sends replies with human delay. Higher ban risk — disclaimer required.</p>
            </div>
          </CardContent>
        </Card>

        <Link href="/dashboard" className={buttonClasses("secondary", "sm")}>
          Back to dashboard
        </Link>
      </div>
    </>
  );
}
