"use client";

import { useActionState } from "react";
import type { AgentPersonaRow } from "@gigster/shared-types";
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

interface PersonaFormProps {
  persona: AgentPersonaRow | null;
}

export function PersonaForm({ persona }: PersonaFormProps) {
  const [state, formAction, pending] = useActionState<
    PersonaActionState,
    FormData
  >(savePersona, {});

  return (
    <>
      <PageHeader
        title="Agent setup"
        description="Define the persona your AI speaks as. Changes apply live."
      />
      <Card>
        <CardHeader>
          <CardTitle>Persona</CardTitle>
          <CardDescription>
            Agent 1 reads this from the database on every Generate — never cached.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="agent_name">Agent name</Label>
              <Input id="agent_name" name="agent_name" defaultValue={persona?.agent_name ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" defaultValue={persona?.full_name ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={persona?.title ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Input id="specialty" name="specialty" defaultValue={persona?.specialty ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tone">Tone</Label>
              <Input id="tone" name="tone" defaultValue={persona?.tone ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={persona?.location ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="experience_years">Experience (years)</Label>
              <Input id="experience_years" name="experience_years" type="number" defaultValue={persona?.experience_years ?? 0} />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="never_say">Never say (comma-separated)</Label>
              <Input id="never_say" name="never_say" defaultValue={persona?.never_say?.join(", ") ?? ""} />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="always_do">Always do</Label>
              <Input id="always_do" name="always_do" defaultValue={persona?.always_do ?? ""} />
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
