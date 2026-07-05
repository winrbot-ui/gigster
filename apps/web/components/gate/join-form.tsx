"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  submitInviteGate,
  type InviteActionState,
} from "@/app/actions/invites";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
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

interface JoinFormProps {
  initialNickname?: string;
  turnstileSiteKey: string;
}

export function JoinForm({ initialNickname = "", turnstileSiteKey }: JoinFormProps) {
  const [turnstileToken, setTurnstileToken] = useState("");
  const [state, formAction, pending] = useActionState<
    InviteActionState,
    FormData
  >(submitInviteGate, {});

  useEffect(() => {
    if (initialNickname) {
      const input = document.getElementById("nickname") as HTMLInputElement | null;
      if (input && !input.value) input.value = initialNickname;
    }
  }, [initialNickname]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Enter the club</CardTitle>
        <CardDescription>
          Gigster is invite-only. Enter your friend&apos;s @nickname to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form action={formAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nickname">Invite @nickname</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted">@</span>
              <Input
                id="nickname"
                name="nickname"
                defaultValue={initialNickname}
                placeholder="jordan"
                autoComplete="off"
                spellCheck={false}
                required
              />
            </div>
          </div>
          <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />
          <TurnstileWidget
            siteKey={turnstileSiteKey}
            onVerify={setTurnstileToken}
          />
          {state.error && (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending || (!!turnstileSiteKey && !turnstileToken)}>
            {pending ? "Checking…" : "Continue"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted">
          Already a member?{" "}
          <Link href="/login" className="text-accent-strong hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
