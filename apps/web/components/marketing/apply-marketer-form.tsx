"use client";

import { useActionState } from "react";
import { submitMarketerApplication, type MarketerActionState } from "@/app/actions/marketer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ApplyMarketerForm() {
  const [state, formAction, pending] = useActionState<
    MarketerActionState,
    FormData
  >(submitMarketerApplication, {});

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Apply as Marketer</CardTitle>
        <CardDescription>
          Help grow the club. Approved marketers earn tier rewards for qualified referrals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pitch">Why you?</Label>
            <textarea
              id="pitch"
              name="pitch"
              rows={4}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              required
            />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          {state.success && <p className="text-sm text-success">{state.success}</p>}
          <Button type="submit" disabled={pending}>Submit application</Button>
        </form>
      </CardContent>
    </Card>
  );
}
