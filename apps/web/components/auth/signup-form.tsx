"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signup, type AuthActionState } from "@/app/actions/auth";
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

interface SignupFormProps {
  turnstileSiteKey: string;
}

export function SignupForm({ turnstileSiteKey }: SignupFormProps) {
  const [turnstileToken, setTurnstileToken] = useState("");
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    signup,
    {},
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Pick your @nickname — it&apos;s permanent. We&apos;ll email you a
          verification link.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form action={formAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Your @nickname</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted">@</span>
              <Input id="username" name="username" placeholder="marko" required />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" minLength={8} required />
          </div>
          <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />
          <TurnstileWidget siteKey={turnstileSiteKey} onVerify={setTurnstileToken} />
          {state.error && (
            <p className="text-sm text-danger" role="alert">{state.error}</p>
          )}
          <Button
            type="submit"
            disabled={pending || (!!turnstileSiteKey && !turnstileToken)}
          >
            {pending ? "Creating…" : "Create account"}
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
