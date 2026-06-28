"use client";

import { useActionState } from "react";
import type { ProjectRow } from "@gigster/shared-types";
import { isBriefReady } from "@gigster/shared-types";
import {
  createProject,
  generateBriefAction,
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

  const [slugState, slugAction, slugPending] = useActionState<ProjectActionState, FormData>(
    updatePreviewSlugAction.bind(null, p.id),
    {},
  );

  const [briefState, briefAction, briefPending] = useActionState<ProjectActionState, FormData>(
    async () => generateBriefAction(p.id),
    {},
  );

  const [retryState, retryAction, retryPending] = useActionState<ProjectActionState, FormData>(
    async () => retryAgent2Action(p.id),
    {},
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{p.client_name ?? "Unnamed client"}</CardTitle>
          <div className="flex gap-2">
            <Badge tone="accent">{p.platform}</Badge>
            <Badge tone="neutral">{p.agent2_status}</Badge>
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
                placeholder="john-smith-consulting"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" disabled={slugPending}>
              {slugPending ? "Saving…" : "Save slug"}
            </Button>
          </div>
          {slugState.error && <p className="mt-1 text-sm text-danger">{slugState.error}</p>}
          {slugState.success && <p className="mt-1 text-sm text-success">{slugState.success}</p>}
        </form>

        <form action={briefAction}>
          <Button type="submit" size="sm" disabled={!ready || briefPending}>
            {briefPending ? "Generating…" : "Generate Brief → Agent 2"}
          </Button>
          {!ready && (
            <p className="mt-1 text-xs text-muted">
              Requires score ≥85, status deal, and client confirmed.
            </p>
          )}
          {briefState.error && <p className="mt-1 text-sm text-danger">{briefState.error}</p>}
          {briefState.success && <p className="mt-1 text-sm text-success">{briefState.success}</p>}
        </form>

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

export function ProjectsView({ projects }: ProjectsViewProps) {
  const [state, formAction, pending] = useActionState<ProjectActionState, FormData>(
    createProject,
    {},
  );

  return (
    <>
      <PageHeader
        title="Projects"
        description="Client conversations and the sites your AI builds from them."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>New project</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="platform">Platform</Label>
              <select
                id="platform"
                name="platform"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="upwork">Upwork</option>
                <option value="fiverr">Fiverr</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="client_name">Client name</Label>
              <Input id="client_name" name="client_name" placeholder="John Smith" required />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
          {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
          {state.success && <p className="mt-2 text-sm text-success">{state.success}</p>}
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm font-medium">No projects yet</p>
            <p className="max-w-sm text-sm text-muted">
              Create a project manually or wait for the desktop app to detect new messages.
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
