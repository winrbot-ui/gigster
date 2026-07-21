"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BriefDecisionAction } from "@gigster/shared-types";
import {
  retryAgent2Action,
  submitBriefDecisionAction,
  type ProjectActionState,
} from "@/app/actions/projects";
import {
  getAgent2StatusAction,
  sendApprovedDraft,
  simulateThread,
  type Agent2Status,
  type SimulatorThreadMessage,
  type ThreadResult,
} from "@/app/actions/simulator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PLATFORMS = [
  { value: "fiverr", label: "Fiverr" },
  { value: "freelancer", label: "Freelancer" },
] as const;

const BRIEF_ACTIONS: { action: BriefDecisionAction; label: string }[] = [
  { action: "build", label: "Build site" },
  { action: "document", label: "Brief document" },
  { action: "both", label: "Both" },
];

type ChatMessage = SimulatorThreadMessage & { id: string };

type PendingDraft = {
  text: string;
  aiMode?: string;
  latencyMs: number;
};

function newThreadId() {
  return `sim-${Date.now()}`;
}

function newMessage(role: "client" | "assistant", text: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    text,
    sent_at: new Date().toISOString(),
  };
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const ready = score >= 85;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted">
        <span>Brief score</span>
        <span className={ready ? "text-success font-medium" : ""}>
          {score}/100 {ready ? "(ready)" : "(need 85)"}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full transition-all ${ready ? "bg-success" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function SimulatorView() {
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["value"]>("fiverr");
  const [clientName, setClientName] = useState("Demo Client");
  const [threadId, setThreadId] = useState(newThreadId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [clientInput, setClientInput] = useState("");
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null);
  const [draftEdit, setDraftEdit] = useState("");
  const [threadResult, setThreadResult] = useState<ThreadResult | null>(null);
  const [agent2Status, setAgent2Status] = useState<Agent2Status | null>(null);
  const [debugOpen, setDebugOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefState, setBriefState] = useState<ProjectActionState>({});
  const [retryState, setRetryState] = useState<ProjectActionState>({});

  const projectId = threadResult?.project_id;
  const canSendClient = !loading && !pendingDraft && clientInput.trim().length > 0;

  const resetConversation = useCallback(() => {
    setThreadId(newThreadId());
    setMessages([]);
    setClientInput("");
    setPendingDraft(null);
    setDraftEdit("");
    setThreadResult(null);
    setAgent2Status(null);
    setError(null);
    setBriefState({});
    setRetryState({});
  }, []);

  const handleSendClientMessage = async () => {
    const text = clientInput.trim();
    if (!text || loading || pendingDraft) return;

    const nextMessages = [...messages, newMessage("client", text)];
    setMessages(nextMessages);
    setClientInput("");
    setLoading(true);
    setError(null);

    const started = performance.now();
    const result = await simulateThread({
      platform,
      thread_id: threadId,
      client_name: clientName.trim() || "Demo Client",
      messages: nextMessages.map(({ role, text: t, sent_at }) => ({
        role,
        text: t,
        sent_at,
      })),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setThreadResult(result.data);
    if (result.data.draft) {
      setPendingDraft({
        text: result.data.draft,
        aiMode: result.data.ai_mode,
        latencyMs: Math.round(performance.now() - started),
      });
      setDraftEdit(result.data.draft);
    }
  };

  const handleSendDraft = async () => {
    const text = draftEdit.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);

    const result = await sendApprovedDraft({
      platform,
      thread_id: threadId,
      client_name: clientName.trim() || "Demo Client",
      messages: messages.map(({ role, text: t, sent_at }) => ({
        role,
        text: t,
        sent_at,
      })),
      draft_text: text,
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessages((prev) => [...prev, newMessage("assistant", text)]);
    setPendingDraft(null);
    setDraftEdit("");
    setThreadResult(result.data);
  };

  const handleDiscardDraft = () => {
    setPendingDraft(null);
    setDraftEdit("");
  };

  const pollAgent2 = useCallback(async () => {
    if (!projectId) return;
    const result = await getAgent2StatusAction(projectId);
    if (result.ok) {
      setAgent2Status(result.data);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    void pollAgent2();
  }, [projectId, pollAgent2]);

  useEffect(() => {
    if (!projectId) return;
    const status = agent2Status?.status;
    if (status !== "building" && !agent2Status?.running) return;

    const timer = setInterval(() => {
      void pollAgent2();
    }, 3000);

    return () => clearInterval(timer);
  }, [projectId, agent2Status?.status, agent2Status?.running, pollAgent2]);

  const handleBriefDecision = async (action: BriefDecisionAction) => {
    if (!projectId) return;
    setBriefState({});
    const result = await submitBriefDecisionAction(projectId, action);
    setBriefState(result);
    if (!result.error) {
      void pollAgent2();
    }
  };

  const handleRetryAgent2 = async () => {
    if (!projectId) return;
    setRetryState({});
    const result = await retryAgent2Action(projectId);
    setRetryState(result);
    if (!result.error) {
      void pollAgent2();
    }
  };

  const readiness = threadResult?.readiness;
  const showAgent2Panel =
    Boolean(threadResult?.awaiting_brief_decision) ||
    Boolean(readiness?.ready) ||
    Boolean(agent2Status?.status && agent2Status.status !== "idle");

  const platformLabel = useMemo(
    () => PLATFORMS.find((p) => p.value === platform)?.label ?? platform,
    [platform],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Inbox simulator</CardTitle>
                <CardDescription>
                  {platformLabel} · thread {threadId.slice(0, 16)}…
                </CardDescription>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={resetConversation}>
                New conversation
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="sim-platform">Platform</Label>
                <select
                  id="sim-platform"
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                  value={platform}
                  disabled={messages.length > 0 || loading}
                  onChange={(e) =>
                    setPlatform(e.target.value as (typeof PLATFORMS)[number]["value"])
                  }
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="sim-client">Client name</Label>
                <Input
                  id="sim-client"
                  value={clientName}
                  disabled={messages.length > 0 || loading}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="How the client appears in inbox"
                />
              </div>
            </div>

            <div className="flex max-h-[420px] min-h-[280px] flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-background p-4">
              {messages.length === 0 ? (
                <p className="text-sm text-muted">
                  You are the client. Send the first message to start Agent 1.
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "client" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                        msg.role === "client"
                          ? "bg-surface text-foreground"
                          : "bg-accent/15 text-foreground"
                      }`}
                    >
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                        {msg.role === "client" ? clientName : "You (freelancer)"}
                      </p>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
              {loading && !pendingDraft ? (
                <p className="text-center text-xs text-muted">Agent 1 is drafting…</p>
              ) : null}
            </div>

            {pendingDraft ? (
              <Card className="border-accent/40 bg-accent/5">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">Agent 1 draft</CardTitle>
                    {pendingDraft.aiMode ? (
                      <Badge tone={pendingDraft.aiMode === "live" ? "success" : "neutral"}>
                        {pendingDraft.aiMode}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted">{pendingDraft.latencyMs}ms</span>
                  </div>
                  <CardDescription>Edit before sending as your reply.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <textarea
                    className="min-h-[120px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    value={draftEdit}
                    onChange={(e) => setDraftEdit(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={loading || !draftEdit.trim()}
                      onClick={() => void handleSendDraft()}
                    >
                      Send as reply
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={loading}
                      onClick={handleDiscardDraft}
                    >
                      Discard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex gap-2">
              <Input
                value={clientInput}
                disabled={!!pendingDraft || loading}
                placeholder={
                  pendingDraft
                    ? "Approve or discard the draft first…"
                    : "Write as the client…"
                }
                onChange={(e) => setClientInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendClientMessage();
                  }
                }}
              />
              <Button
                type="button"
                disabled={!canSendClient}
                onClick={() => void handleSendClientMessage()}
              >
                Send
              </Button>
            </div>

            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-2">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setDebugOpen((v) => !v)}
            >
              <CardTitle className="text-base">Debug panel</CardTitle>
              <span className="text-xs text-muted">{debugOpen ? "Hide" : "Show"}</span>
            </button>
          </CardHeader>
          {debugOpen ? (
            <CardContent className="space-y-4 text-sm">
              {!threadResult ? (
                <p className="text-muted">Send a client message to see Agent 1 internals.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {threadResult.stage ? (
                      <Badge tone="accent">stage: {threadResult.stage}</Badge>
                    ) : null}
                    {threadResult.payment_required ? (
                      <Badge tone="neutral">payment required</Badge>
                    ) : null}
                    {threadResult.awaiting_brief_decision ? (
                      <Badge tone="success">awaiting brief decision</Badge>
                    ) : null}
                    {projectId ? (
                      <Badge tone="neutral">project {projectId.slice(0, 8)}…</Badge>
                    ) : null}
                  </div>

                  <ScoreBar score={threadResult.brief_score ?? 0} />

                  {readiness ? (
                    <div className="space-y-1 rounded-md border border-border p-3">
                      <p className="font-medium">Readiness</p>
                      <p className="text-muted">
                        ready: {String(readiness.ready ?? false)} · status:{" "}
                        {String(readiness.status ?? threadResult.project_json?.status ?? "—")} ·
                        client_confirmed:{" "}
                        {String(
                          readiness.client_confirmed ??
                            threadResult.project_json?.client_confirmed ??
                            false,
                        )}
                      </p>
                      {Array.isArray(readiness.missing) && readiness.missing.length > 0 ? (
                        <p className="text-xs text-muted">
                          missing: {readiness.missing.join(", ")}
                        </p>
                      ) : null}
                      {Array.isArray(threadResult.project_json?.out_of_scope_requests) &&
                      (threadResult.project_json?.out_of_scope_requests as string[]).length > 0 ? (
                        <p className="text-xs text-danger">
                          out of scope:{" "}
                          {(threadResult.project_json?.out_of_scope_requests as string[]).join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <p className="text-xs text-muted">
                    messages in thread: {threadResult.message_count ?? messages.length}
                  </p>

                  <details className="rounded-md border border-border">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium">
                      project_json
                    </summary>
                    <pre className="max-h-64 overflow-auto p-3 text-[11px] leading-relaxed text-muted">
                      {JSON.stringify(threadResult.project_json ?? {}, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </CardContent>
          ) : null}
        </Card>

        {showAgent2Panel ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Agent 2</CardTitle>
              <CardDescription>
                Trigger build when brief is ready — same as extension payoff.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {threadResult?.awaiting_brief_decision ? (
                <div className="flex flex-col gap-2">
                  {BRIEF_ACTIONS.map(({ action, label }) => (
                    <Button
                      key={action}
                      type="button"
                      size="sm"
                      variant={action === "build" ? "primary" : "secondary"}
                      disabled={loading}
                      onClick={() => void handleBriefDecision(action)}
                    >
                      {label}
                    </Button>
                  ))}
                  {briefState.error ? (
                    <p className="text-sm text-danger">{briefState.error}</p>
                  ) : null}
                  {briefState.success ? (
                    <p className="text-sm text-success">{briefState.success}</p>
                  ) : null}
                </div>
              ) : readiness?.ready ? (
                <p className="text-xs text-muted">
                  Brief is ready. Decision may already be recorded for this project.
                </p>
              ) : (
                <p className="text-xs text-muted">
                  Reach score ≥85, status deal, and client confirmed to unlock build.
                </p>
              )}

              {projectId ? (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium">Build status</span>
                    <Badge
                      tone={
                        agent2Status?.status === "ready"
                          ? "success"
                          : agent2Status?.status === "failed"
                            ? "danger"
                            : "accent"
                      }
                    >
                      {agent2Status?.status ?? "idle"}
                      {agent2Status?.running ? " (running)" : ""}
                    </Badge>
                    <Button type="button" size="sm" variant="secondary" onClick={() => void pollAgent2()}>
                      Refresh
                    </Button>
                  </div>

                  {agent2Status?.status === "failed" && agent2Status?.error ? (
                    <p className="text-sm text-danger">{agent2Status.error}</p>
                  ) : null}

                  {agent2Status?.preview_url ? (
                    <a
                      href={agent2Status.preview_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm text-accent underline"
                    >
                      {agent2Status.preview_url}
                    </a>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={loading}
                      onClick={() => void handleRetryAgent2()}
                    >
                      Retry build
                    </Button>
                    <a
                      href={`/api/brief-document/${projectId}`}
                      className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium hover:bg-surface"
                    >
                      Download brief PDF
                    </a>
                  </div>

                  {retryState.error ? (
                    <p className="text-sm text-danger">{retryState.error}</p>
                  ) : null}
                  {retryState.success ? (
                    <p className="text-sm text-success">{retryState.success}</p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
