"use client";

import { useActionState } from "react";
import type { BriefDecisionAction, ProjectRow } from "@gigster/shared-types";
import {
  canUsePlatform,
  isBriefReady,
  isPlatformAvailable,
  PLATFORM_CATALOG,
} from "@gigster/shared-types";
import {
  briefDecisionFormAction,
  createProject,
  retryAgent2Action,
  updatePreviewSlugAction,
  type ProjectActionState,
} from "@/app/actions/projects";
import { BriefReadiness, ProjectMemory } from "@/components/app/brief-readiness";
import { PageHeader } from "@/components/app/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ProjectsViewProps {
  projects: ProjectRow[];
  platformsAllowed: number;
  usedPlatforms: import("@gigster/shared-types").ProjectPlatform[];
  limitMessage: string;
}

const ALL_PLATFORMS = PLATFORM_CATALOG.map((p) => ({
  value: p.id,
  label: p.label,
  comingSoon: p.availability === "coming_soon",
}));

const BRIEF_ACTIONS: { action: BriefDecisionAction; label: string; variant: "primary" | "secondary" }[] = [
  { action: "build", label: "Build site (Agent 2)", variant: "primary" },
  { action: "document", label: "Download client brief", variant: "secondary" },
  { action: "both", label: "Both", variant: "secondary" },
];

function BriefDecisionButton({
  projectId,
  action,
  label,
  variant,
}: {
  projectId: string;
  action: BriefDecisionAction;
  label: string;
  variant: "primary" | "secondary";
}) {
  const bound = briefDecisionFormAction.bind(null, projectId, action);
  const [state, formAction, pending] = useActionState<ProjectActionState, FormData>(bound, {});

  return (
    <div className="flex flex-col gap-1">
      <form action={formAction}>
        <Button type="submit" size="sm" variant={variant} disabled={pending}>
          {pending ? "Processing…" : label}
        </Button>
      </form>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
    </div>
  );
}

function BriefDecisionButtons({ projectId, ready }: { projectId: string; ready: boolean }) {
  if (!ready) {
    return (
      <p className="text-xs text-muted">
        Requires score ≥85, status deal, and client confirmed.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Brief ready — choose next step</p>
      <div className="flex flex-wrap gap-2">
        {BRIEF_ACTIONS.map(({ action, label, variant }) => (
          <BriefDecisionButton
            key={action}
            projectId={projectId}
            action={action}
            label={label}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project: p }: { project: ProjectRow }) {
  const pj = p.project_json;
  const ready = pj
    ? isBriefReady({
        brief_score: p.brief_score ?? 0,
        status: pj.status ?? p.status,
        client_confirmed: pj.client_confirmed ?? false,
      })
    : false;
  const awaitingDecision = ready && !pj?.brief_decision;

  const [slugState, slugAction, slugPending] = useActionState<ProjectActionState, FormData>(
    updatePreviewSlugAction.bind(null, p.id),
    {},
  );

  const [retryState, retryAction, retryPending] = useActionState<ProjectActionState, FormData>(
    async () => retryAgent2Action(p.id),
    {},
  );

  const briefDocUrl = `/api/brief-document/${p.id}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{p.client_name ?? "Unnamed client"}</CardTitle>
          <div className="flex gap-2">
            <Badge tone="accent">{p.platform}</Badge>
            <Badge tone="neutral">{p.agent2_status}</Badge>
            {pj?.brief_decision && (
              <Badge tone="neutral">Brief: {pj.brief_decision}</Badge>
            )}
          </div>
        </div>
        <CardDescription>
          DB status: {p.status} · Brief score: {p.brief_score ?? 0}/100
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <BriefReadiness
          projectJson={pj}
          briefScore={p.brief_score}
          status={pj?.status ?? p.status}
        />

        <div>
          <h3 className="mb-2 text-sm font-medium">Conversation memory</h3>
          <ProjectMemory projectJson={pj} />
        </div>

        {p.preview_url && (
          <a
            href={p.preview_url}
            className="text-sm text-accent-strong hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {p.preview_url}
          </a>
        )}

        {p.agent2_status === "building" && (
          <p className="text-sm text-muted">Agent 2 is building — refresh to check status.</p>
        )}

        {(pj?.brief_decision === "document" || pj?.brief_decision === "both") && (
          <a
            href={briefDocUrl}
            className="text-sm text-accent-strong hover:underline"
            download
          >
            Download client brief (PDF)
          </a>
        )}

        {p.build_spec && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted hover:text-foreground">
              View build_spec JSON
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded bg-surface-2 p-3 text-xs">
              {JSON.stringify(p.build_spec, null, 2)}
            </pre>
          </details>
        )}

        <form action={slugAction}>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`slug-${p.id}`}>Preview slug</Label>
              <Input
                id={`slug-${p.id}`}
                name="slug"
                defaultValue={p.preview_slug ?? ""}
                placeholder="acme-consulting"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" disabled={slugPending}>
              {slugPending ? "Saving…" : "Save slug"}
            </Button>
          </div>
          {slugState.error && <p className="mt-1 text-sm text-danger">{slugState.error}</p>}
          {slugState.success && <p className="mt-1 text-sm text-success">{slugState.success}</p>}
        </form>

        {awaitingDecision ? (
          <BriefDecisionButtons projectId={p.id} ready={ready} />
        ) : (
          ready &&
          !p.build_spec &&
          pj?.brief_decision !== "document" && (
            <p className="text-xs text-muted">Brief decision recorded.</p>
          )
        )}

        {(p.agent2_status === "failed" && p.build_spec) && (
          <form action={retryAction}>
            <Button type="submit" size="sm" variant="secondary" disabled={retryPending}>
              {retryPending ? "Retrying…" : "Retry Agent 2 build"}
            </Button>
            {retryState.error && <p className="mt-1 text-sm text-danger">{retryState.error}</p>}
            {retryState.success && <p className="mt-1 text-sm text-success">{retryState.success}</p>}
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectsView({
  projects,
  platformsAllowed,
  usedPlatforms,
  limitMessage,
}: ProjectsViewProps) {
  const [state, formAction, pending] = useActionState<ProjectActionState, FormData>(
    createProject,
    {},
  );

  return (
    <>
      <PageHeader
        title="Clients"
        description="Every client your AI tracks — and the preview sites it builds when a deal is ready."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add a client</CardTitle>
          <CardDescription>
            Usually the Chrome extension adds clients automatically from your inbox.
            You can also add one manually here. Plan limit: {platformsAllowed} platform
            {platformsAllowed === 1 ? "" : "s"} · Used:{" "}
            {usedPlatforms.length ? usedPlatforms.join(", ") : "none"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="platform">Platform</Label>
              <select
                id="platform"
                name="platform"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                defaultValue={
                  ALL_PLATFORMS.find(
                    (p) =>
                      isPlatformAvailable(p.value) &&
                      canUsePlatform(platformsAllowed, usedPlatforms, p.value),
                  )?.value ?? "fiverr"
                }
              >
                {ALL_PLATFORMS.map((p) => {
                  const available = isPlatformAvailable(p.value);
                  const selectable =
                    available &&
                    canUsePlatform(platformsAllowed, usedPlatforms, p.value);
                  return (
                    <option key={p.value} value={p.value} disabled={!selectable}>
                      {p.label}
                      {p.comingSoon ? " — Updating, coming soon" : ""}
                      {!p.comingSoon && !selectable ? " (plan limit)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="client_name">Client name</Label>
              <Input id="client_name" name="client_name" placeholder="Sarah Miller" required />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
          {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
          {state.success && <p className="mt-2 text-sm text-success">{state.success}</p>}
          {!state.error && usedPlatforms.length >= platformsAllowed && (
            <p className="mt-2 text-xs text-muted">{limitMessage}</p>
          )}
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm font-medium">No clients yet</p>
            <p className="max-w-md text-sm text-muted">
              This is where your clients appear. Install the Gigster Chrome extension,
              open your Fiverr or Freelancer inbox, and press Start — each conversation
              shows up here with its brief readiness and, once a deal is ready, the
              preview site your AI builds.
            </p>
            <p className="max-w-md text-xs text-muted">
              Or add a client manually using the form above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </>
  );
}
