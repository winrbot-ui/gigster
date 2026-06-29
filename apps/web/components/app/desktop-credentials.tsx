"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DesktopCredentialsProps {
  apiUrl: string;
  accessToken: string;
  refreshToken: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function CopyRow({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  const display = value || "—";

  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-surface-2 px-3 py-2 text-xs">
          {secret && value ? "••••••••" + value.slice(-8) : display}
        </code>
        <Button type="button" size="sm" variant="secondary" onClick={copy} disabled={!value}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export function DesktopCredentials({
  apiUrl,
  accessToken,
  refreshToken,
  supabaseUrl,
  supabaseAnonKey,
}: DesktopCredentialsProps) {
  return (
    <div className="flex flex-col gap-3">
      <CopyRow label="API URL" value={apiUrl} />
      <CopyRow label="Access token (JWT)" value={accessToken} secret />
      <CopyRow label="Refresh token" value={refreshToken} secret />
      <CopyRow label="Supabase URL" value={supabaseUrl} />
      <CopyRow label="Supabase anon key" value={supabaseAnonKey} secret />
      <p className="text-xs text-muted">
        Paste all five into the desktop app once. The app refreshes your access token
        automatically — no need to recopy unless you log out of the website.
      </p>
    </div>
  );
}
