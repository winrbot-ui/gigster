"use client";

import { useActionState } from "react";
import { resendVerification, type AuthActionState } from "@/app/actions/auth";
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

interface VerifyPanelProps {
  email?: string;
  error?: string;
}

export function VerifyPanel({ email = "", error }: VerifyPanelProps) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    resendVerification,
    {},
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          We sent a verification link{email ? ` to ${email}` : ""}. Click it and
          you&apos;re in — your account is free. Start drafting client replies
          right away; you only pay after you close your first deal.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {error && <p className="text-sm text-danger">{error}</p>}
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="email" value={email} />
          {!email && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
          )}
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          {state.success && <p className="text-sm text-success">{state.success}</p>}
          <Button type="submit" variant="secondary" disabled={pending}>
            Resend verification email
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
