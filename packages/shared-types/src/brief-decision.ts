/**
 * Brief decision — member choice after brief readiness is met.
 * See docs/03-ai-pipeline.md and POST /ext/brief/decision on the backend.
 */

export const BRIEF_DECISION_ACTIONS = ["build", "document", "both"] as const;
export type BriefDecisionAction = (typeof BRIEF_DECISION_ACTIONS)[number];

export interface BriefDecisionRequest {
  project_id: string;
  action: BriefDecisionAction;
}

/** Human-readable labels for extension popup / dashboard UI. */
export const BRIEF_DECISION_LABELS: Record<BriefDecisionAction, string> = {
  build: "Build site (Agent 2)",
  document: "Download client brief (Markdown + PDF)",
  both: "Build site and download brief",
};
