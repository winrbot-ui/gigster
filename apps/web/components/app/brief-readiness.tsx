"use client";

import {
  BRIEF_READINESS_MIN_SCORE,
  scoreBriefReadiness,
  type ProjectJson,
  type ProjectStatus,
} from "@gigster/shared-types";
import { Badge } from "@/components/ui/badge";

interface BriefReadinessProps {
  projectJson: ProjectJson | null;
  briefScore: number | null;
  status: ProjectStatus;
}

export function BriefReadiness({ projectJson, briefScore, status }: BriefReadinessProps) {
  const pj = projectJson ?? {
    client_name: null,
    platform: null,
    summary: null,
    requirements: [],
    open_questions: [],
    budget: null,
    deadline: null,
    status,
    client_confirmed: false,
    notes: null,
  };

  const computed = scoreBriefReadiness(pj);
  const score = briefScore ?? computed.score;
  const ready = computed.ready && score >= BRIEF_READINESS_MIN_SCORE;
  const pct = Math.min(score, 100);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Brief readiness</span>
        <Badge tone={ready ? "success" : score >= 60 ? "accent" : "neutral"}>
          {score}/100 {ready ? "· Ready" : `· need ${BRIEF_READINESS_MIN_SCORE}+`}
        </Badge>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full transition-all ${ready ? "bg-success" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {!ready && computed.missing.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Still needed:</span>
          <ul className="flex flex-wrap gap-1.5">
            {computed.missing.map((field) => (
              <li key={field}>
                <Badge tone="neutral" className="text-xs">
                  {field}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ready && (
        <p className="text-xs text-success">
          All gates passed — you can generate the brief and queue Agent 2.
        </p>
      )}
    </div>
  );
}

interface ProjectMemoryProps {
  projectJson: ProjectJson | null;
}

export function ProjectMemory({ projectJson }: ProjectMemoryProps) {
  if (!projectJson) {
    return (
      <p className="text-sm text-muted">
        No conversation memory yet. Use Generate to extract from messages.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      {projectJson.summary && (
        <div>
          <span className="text-muted">Summary · </span>
          {projectJson.summary}
        </div>
      )}
      {projectJson.requirements.length > 0 && (
        <div>
          <span className="text-muted">Requirements</span>
          <ul className="mt-1 list-inside list-disc text-foreground">
            {projectJson.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      {projectJson.open_questions.length > 0 && (
        <div>
          <span className="text-muted">Open questions</span>
          <ul className="mt-1 list-inside list-disc text-accent-strong">
            {projectJson.open_questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-muted">
        {projectJson.budget && <span>Budget: {projectJson.budget}</span>}
        {projectJson.deadline && <span>Deadline: {projectJson.deadline}</span>}
        <span>Status: {projectJson.status}</span>
        {projectJson.client_confirmed && (
          <Badge tone="success">Client confirmed</Badge>
        )}
      </div>
      {projectJson.notes && (
        <p className="text-muted italic">{projectJson.notes}</p>
      )}
    </div>
  );
}
