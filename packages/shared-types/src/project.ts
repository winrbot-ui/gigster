import type { BriefDecisionAction } from "./brief-decision";
import type { ProjectPlatform, ProjectStatus } from "./enums";

/**
 * project_json — the evolving structured understanding of a single client
 * conversation. Updated by Agent 1 CALL 1 (Extract) on each new inbox batch.
 */
export interface ProjectJson {
  client_name: string | null;
  /** Marketplace handle, e.g. FLGrace on Freelancer or inbox username on Fiverr. */
  client_username?: string | null;
  platform: ProjectPlatform | null;
  /** Short summary of what the client wants. */
  summary: string | null;
  /** Concrete requirements extracted from the conversation. */
  requirements: string[];
  /** Open questions Agent 1 still needs answered before a brief is possible. */
  open_questions: string[];
  budget: string | null;
  deadline: string | null;
  /** Detected negotiation stage. */
  status: ProjectStatus;
  /** Whether the client explicitly confirmed they want to proceed. */
  client_confirmed: boolean;
  /** Free-form notes that do not fit elsewhere. */
  notes: string | null;
  /** Requests the client made that are outside Agent 2 capabilities. */
  out_of_scope_requests?: string[];
  /** Member choice after brief readiness (extension popup or dashboard). */
  brief_decision?: BriefDecisionAction | null;
  /** Internal: marketplace thread id when DB column is unavailable. */
  _thread_id?: string | null;
}

export function emptyProjectJson(): ProjectJson {
  return {
    client_name: null,
    client_username: null,
    platform: null,
    summary: null,
    requirements: [],
    open_questions: [],
    budget: null,
    deadline: null,
    status: "new",
    client_confirmed: false,
    notes: null,
    out_of_scope_requests: [],
  };
}

/** Minimum brief readiness score (0-100) before a build_spec may be generated. */
export const BRIEF_READINESS_MIN_SCORE = 85;

/**
 * A brief is only generated when ALL of these hold.
 * Mirrors docs/03-ai-pipeline.md (Brief readiness gate).
 */
export function isBriefReady(input: {
  brief_score: number;
  status: ProjectStatus;
  client_confirmed: boolean;
}): boolean {
  return (
    input.brief_score >= BRIEF_READINESS_MIN_SCORE &&
    input.status === "deal" &&
    input.client_confirmed
  );
}

/** Field weights for brief readiness scoring (mirrors backend scoring.py). */
export const BRIEF_READINESS_FIELDS = [
  { key: "status", label: "Negotiation status", weight: 15 },
  { key: "requirements", label: "Scope / pages", weight: 15 },
  { key: "summary", label: "Design direction", weight: 15 },
  { key: "features", label: "Features", weight: 15 },
  { key: "budget", label: "Budget", weight: 15 },
  { key: "deadline", label: "Deadline", weight: 15 },
  { key: "content", label: "Content plan", weight: 15 },
  { key: "client_confirmed", label: "Client confirmed", weight: 10 },
] as const;

export interface BriefReadinessResult {
  score: number;
  missing: string[];
  ready: boolean;
}

/** Score how complete project_json is for brief generation. */
export function scoreBriefReadiness(projectJson: ProjectJson): BriefReadinessResult {
  let score = 0;
  const missing: string[] = [];

  if (projectJson.status && projectJson.status !== "new") {
    score += 15;
  } else {
    missing.push("Negotiation status");
  }

  const reqs = projectJson.requirements ?? [];
  if (reqs.length >= 1) {
    score += 15;
  } else {
    missing.push("Scope / pages");
  }

  if (projectJson.summary) {
    score += 15;
  } else {
    missing.push("Design direction");
  }

  if (reqs.length >= 2) {
    score += 15;
  } else {
    missing.push("Features");
  }

  if (projectJson.budget) {
    score += 15;
  } else {
    missing.push("Budget");
  }

  if (projectJson.deadline) {
    score += 15;
  } else {
    missing.push("Deadline");
  }

  if (projectJson.notes || reqs.length >= 1) {
    score += 15;
  } else {
    missing.push("Content plan");
  }

  if (projectJson.client_confirmed) {
    score += 10;
  } else {
    missing.push("Client confirmed");
  }

  const finalScore = Math.min(score, 100);
  return {
    score: finalScore,
    missing,
    ready: isBriefReady({
      brief_score: finalScore,
      status: projectJson.status,
      client_confirmed: projectJson.client_confirmed,
    }),
  };
}
