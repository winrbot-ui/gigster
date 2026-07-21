"use client";

import { useActionState } from "react";
import type { AgentPersonaRow } from "@gigster/shared-types";
import {
  AGENT_CAPABILITIES,
  AGENT_NON_CAPABILITIES,
  AGENT_OFFERINGS,
  DEFAULT_PERSONA_ALWAYS_DO,
  DEFAULT_PERSONA_SPECIALTY,
  DEFAULT_PERSONA_TITLE,
  SPECIALTY_SUGGESTIONS,
  TONE_SUGGESTIONS,
  sanitizePersonaFields,
} from "@gigster/shared-types";
import { savePersona, type PersonaActionState } from "@/app/actions/persona";
import { PageHeader } from "@/components/app/app-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PersonaFormProps {
  persona: AgentPersonaRow | null;
  showLegacyNotice?: boolean;
}

export function PersonaForm({ persona, showLegacyNotice }: PersonaFormProps) {
  const [state, formAction, pending] = useActionState<
    PersonaActionState,
    FormData
  >(savePersona, {});

  const display = persona ? sanitizePersonaFields(persona) : null;

  return (
    <>
      <PageHeader
        title="Agent setup"
        description="Define the persona your AI speaks as. Changes apply live to Agent 1 drafts and Agent 2 builds."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>What your agents can build</CardTitle>
          <CardDescription>
            Agent 1 offers these confidently. Agent 2 delivers them as live preview sites.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AGENT_OFFERINGS.map((o) => (
              <div
                key={o.id}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <p className="font-medium">{o.label}</p>
                <p className="mt-1 text-sm text-muted">{o.description}</p>
                <Badge tone="accent" className="mt-2">
                  {o.template}
                </Badge>
              </div>
            ))}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Section building blocks</p>
            <div className="flex flex-wrap gap-2">
              {AGENT_CAPABILITIES.slice(0, 12).map((c) => (
                <Badge key={c.id} tone="neutral">
                  {c.label}
                </Badge>
              ))}
              <Badge tone="neutral">+{AGENT_CAPABILITIES.length - 12} more</Badge>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">
              Not supported — Agent 1 will decline and suggest an alternative
            </p>
            <ul className="space-y-2 text-sm text-muted">
              {AGENT_NON_CAPABILITIES.map((n) => (
                <li key={n.id} className="rounded-md border border-border p-3">
                  <span className="font-medium text-foreground">{n.label}</span>
                  <p className="mt-1">{n.alternative}</p>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Persona</CardTitle>
          <CardDescription>
            Gigster reads this from the database on every draft — never cached.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showLegacyNotice && (
            <p className="mb-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
              Outdated defaults (WordPress / “2–5 sentences”) were auto-updated for
              natural inbox replies. Review below and save if it looks good.
            </p>
          )}
          <form action={formAction} className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2 rounded-lg border border-border bg-surface/50 p-4">
              <p className="text-sm font-medium">Marketplace usernames</p>
              <p className="text-xs text-muted">
                Required — enter at least one. This is your seller handle on Fiverr or
                Freelancer (without @).
              </p>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fiverr_username">Fiverr username</Label>
                  <Input
                    id="fiverr_username"
                    name="fiverr_username"
                    placeholder="your_fiverr_handle"
                    defaultValue={display?.fiverr_username ?? ""}
                    autoComplete="off"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="freelancer_username">Freelancer username</Label>
                  <Input
                    id="freelancer_username"
                    name="freelancer_username"
                    placeholder="your_freelancer_handle"
                    defaultValue={display?.freelancer_username ?? ""}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="agent_name">Agent name</Label>
              <Input id="agent_name" name="agent_name" placeholder="Jordan" defaultValue={display?.agent_name ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" placeholder="Jordan Smith" defaultValue={display?.full_name ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={display?.title ?? ""}
                placeholder={DEFAULT_PERSONA_TITLE}
              />
              <p className="text-xs text-muted">Job title only — not a sales pitch.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Input
                id="specialty"
                name="specialty"
                list="specialty-suggestions"
                defaultValue={display?.specialty ?? ""}
                placeholder={DEFAULT_PERSONA_SPECIALTY}
              />
              <p className="text-xs text-muted">
                Custom-coded static sites only — no WordPress, Wix, or Shopify.
              </p>
              <datalist id="specialty-suggestions">
                {SPECIALTY_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tone">Tone</Label>
              <Input
                id="tone"
                name="tone"
                list="tone-suggestions"
                defaultValue={display?.tone ?? ""}
                placeholder="Friendly and professional"
              />
              <datalist id="tone-suggestions">
                {TONE_SUGGESTIONS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="US / Eastern" defaultValue={display?.location ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="experience_years">Experience (years)</Label>
              <Input id="experience_years" name="experience_years" type="number" defaultValue={display?.experience_years ?? 0} />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="never_say">Never say (comma-separated)</Label>
              <Input
                id="never_say"
                name="never_say"
                placeholder="As an AI, I'm a bot, Happy to help"
                defaultValue={display?.never_say?.join(", ") ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="always_do">Always do</Label>
              <textarea
                id="always_do"
                name="always_do"
                rows={3}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                defaultValue={display?.always_do ?? ""}
                placeholder={DEFAULT_PERSONA_ALWAYS_DO}
              />
              <p className="text-xs text-muted">
                Avoid “2–5 sentences” or “use client first name every message” — that makes replies sound robotic.
              </p>
            </div>
            {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
            {state.success && <p className="text-sm text-success sm:col-span-2">{state.success}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save persona"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
