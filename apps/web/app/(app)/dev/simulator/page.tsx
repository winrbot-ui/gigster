import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { PageHeader } from "@/components/app/app-shell";
import { SimulatorView } from "@/components/app/simulator-view";

export const metadata: Metadata = {
  title: "Agent Simulator (dev)",
};

export default async function SimulatorPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  await requireMember();

  const apiUrl = process.env.GIGSTER_API_URL ?? "(not set)";

  return (
    <div className="-mx-6 w-[calc(100%+3rem)] max-w-none sm:-mx-10 sm:w-[calc(100%+5rem)]">
      <PageHeader
        title="Agent 1 / 2 simulator"
        description="Play the client on Fiverr or Freelancer. Agent 1 drafts replies through the same /ext/thread pipeline as the Chrome extension."
      />
      {apiUrl.includes("localhost") ? (
        <p className="mb-4 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted">
          API: <span className="font-mono text-foreground">{apiUrl}</span> — local backend must be running (
          <span className="font-mono">npm run dev:api</span>).
        </p>
      ) : (
        <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          API points to <span className="font-mono">{apiUrl}</span>, not localhost. For local dev set{" "}
          <span className="font-mono">GIGSTER_API_URL=http://localhost:8000</span> in{" "}
          <span className="font-mono">apps/web/.env.local</span> and restart Next.js.
        </p>
      )}
      <SimulatorView />
    </div>
  );
}
