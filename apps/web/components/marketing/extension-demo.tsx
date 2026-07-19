"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Animated, looping demo of the Gigster extension at work:
 * client message → Agent 1 types a draft (free) → negotiation → deal closed →
 * membership unlock moment. Pure CSS/JS — no video file needed.
 */

type ChatMsg = { role: "client" | "agent"; text: string };

const DRAFT_1 =
  "Hi Sarah! Absolutely — I build sites for local businesses every week. Do you already have branding, and would you like online ordering for the bakery?";
const DRAFT_2 =
  "Perfect, $450 works for that scope. I'll lock it in: 5-page site, online ordering, done in 2 weeks. Sending the summary now — excited to start!";

const STEPS = [
  { id: "client1", duration: 2200 },
  { id: "typing1", duration: 500 },
  { id: "draft1", duration: 0 }, // duration driven by typing
  { id: "sent1", duration: 1600 },
  { id: "client2", duration: 2400 },
  { id: "typing2", duration: 500 },
  { id: "draft2", duration: 0 },
  { id: "sent2", duration: 1600 },
  { id: "deal", duration: 3800 },
  { id: "unlock", duration: 5200 },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const TYPE_SPEED_MS = 18;

function useDemoLoop() {
  const [stepIndex, setStepIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = STEPS[stepIndex].id as StepId;

  useEffect(() => {
    const current = STEPS[stepIndex];

    if (current.id === "draft1" || current.id === "draft2") {
      const full = current.id === "draft1" ? DRAFT_1 : DRAFT_2;
      let i = 0;
      const tick = () => {
        i += 1;
        setTyped(full.slice(0, i));
        if (i < full.length) {
          timerRef.current = setTimeout(tick, TYPE_SPEED_MS);
        } else {
          timerRef.current = setTimeout(() => {
            setStepIndex((s) => (s + 1) % STEPS.length);
          }, 900);
        }
      };
      setTyped("");
      timerRef.current = setTimeout(tick, 300);
    } else {
      timerRef.current = setTimeout(() => {
        setStepIndex((s) => {
          const next = (s + 1) % STEPS.length;
          if (next === 0) setTyped("");
          return next;
        });
      }, current.duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stepIndex]);

  return { step, stepIndex, typed };
}

function reached(step: StepId, target: StepId): boolean {
  const order = STEPS.map((s) => s.id);
  return order.indexOf(step) >= order.indexOf(target);
}

function Bubble({
  msg,
  show,
}: {
  msg: ChatMsg;
  show: boolean;
}) {
  return (
    <div
      className={cn(
        "flex transition-all duration-500",
        msg.role === "client" ? "justify-start" : "justify-end",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
          msg.role === "client"
            ? "rounded-bl-sm bg-surface-2 text-foreground"
            : "rounded-br-sm border border-accent/25 bg-accent/10 text-foreground",
        )}
      >
        {msg.text}
      </div>
    </div>
  );
}

export function ExtensionDemo() {
  const { step, typed } = useDemoLoop();

  const dealReached = reached(step, "deal");
  const unlockReached = reached(step, "unlock");
  const score =
    step === "client1" || step === "typing1" || step === "draft1"
      ? 34
      : step === "sent1"
        ? 58
        : step === "client2" || step === "typing2" || step === "draft2"
          ? 74
          : dealReached
            ? 92
            : 92;

  const statusText =
    step === "typing1" || step === "typing2"
      ? "Gigster is drafting…"
      : step === "draft1" || step === "draft2"
        ? "Writing in your voice…"
        : unlockReached
          ? "Deal closed — deliverables ready"
          : dealReached
            ? "Client confirmed. Brief ready!"
            : "Watching your inbox…";

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
      {/* Marketplace inbox mock */}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-elevated)]">
        <div className="flex items-center gap-2 border-b border-border bg-surface-2/60 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/50" />
          <span className="ml-3 text-xs text-faint">marketplace inbox · Sarah M.</span>
        </div>
        <div className="flex min-h-[290px] flex-col justify-end gap-3 p-4">
          <Bubble
            show={reached(step, "client1")}
            msg={{
              role: "client",
              text: "Hi! I need a website for my bakery — 5 pages and online ordering. Can you help?",
            }}
          />
          <Bubble
            show={reached(step, "sent1")}
            msg={{ role: "agent", text: DRAFT_1 }}
          />
          <Bubble
            show={reached(step, "client2")}
            msg={{
              role: "client",
              text: "Sounds great. Budget is $450 and I need it in 2 weeks. Let's do it! ✅",
            }}
          />
          <Bubble
            show={reached(step, "sent2")}
            msg={{ role: "agent", text: DRAFT_2 }}
          />
        </div>
      </div>

      {/* Gigster extension popup mock */}
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-[var(--radius-card)] border bg-surface shadow-[var(--shadow-elevated)] transition-colors duration-700",
          dealReached ? "border-accent/50" : "border-border",
          dealReached && "animate-glow",
        )}
      >
        <div className="flex items-center justify-between border-b border-border bg-surface-2/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">Gigster</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-faint">
              extension
            </span>
          </div>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors duration-500",
              unlockReached
                ? "border-accent/40 bg-accent/15 text-accent-strong"
                : "border-success/30 bg-success/10 text-success",
            )}
          >
            {unlockReached ? "Membership" : "Free"}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* status line */}
          <div className="flex items-center gap-2 text-xs text-muted">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                dealReached ? "bg-accent" : "bg-success",
              )}
            />
            {statusText}
          </div>

          {/* draft panel */}
          <div className="rounded-lg border border-border bg-surface-2/50 p-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-faint">
              AI draft — your persona
            </p>
            <p className="min-h-[72px] text-[13px] leading-relaxed text-foreground">
              {step === "draft1" || step === "draft2" ? (
                <>
                  {typed}
                  <span className="demo-caret" />
                </>
              ) : reached(step, "sent2") ? (
                DRAFT_2
              ) : reached(step, "sent1") ? (
                DRAFT_1
              ) : (
                <span className="text-faint">Waiting for a client message…</span>
              )}
            </p>
          </div>

          {/* brief score */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Brief score</span>
              <span
                className={cn(
                  "font-mono transition-colors duration-500",
                  dealReached ? "text-accent-strong" : "text-foreground",
                )}
              >
                {score}/100
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-out",
                  dealReached ? "bg-accent" : "bg-success/70",
                )}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* deal / unlock moment */}
          <div
            className={cn(
              "rounded-lg border p-3 transition-all duration-700",
              dealReached
                ? "translate-y-0 border-accent/35 bg-accent/10 opacity-100"
                : "pointer-events-none translate-y-2 border-border opacity-40",
            )}
          >
            {unlockReached ? (
              <>
                <p className="text-[13px] font-semibold text-accent-strong">
                  First deal closed — activate membership
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Drafting stays free on Basic &amp; Pro. Unlock the client brief (PDF) and
                  the project website built from this deal — from $200 after your first client.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground">
                    Basic — $200
                  </span>
                  <span className="rounded-full border border-accent/40 px-3 py-1 text-[11px] text-accent-strong">
                    Pro — $300
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold">
                  {dealReached ? "Deal confirmed 🎉" : "Deal pending…"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {dealReached
                    ? "Budget locked at $450 · 2-week deadline · brief is ready."
                    : "Keep negotiating — Gigster tracks scope, budget, and deadline."}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
