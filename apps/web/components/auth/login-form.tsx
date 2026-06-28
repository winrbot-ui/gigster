"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthActionState } from "@/app/actions/auth";
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

export function LoginForm({ blocked = false }: { blocked?: boolean }) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    login,
    {},
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Log in with your @nickname or email.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {blocked && (
          <p className="text-sm text-danger" role="alert">
            Your account has been blocked. Contact support if you believe this is an error.
          </p>
        )}
        <form action={formAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="identifier">@nickname or email</Label>
            <Input id="identifier" name="identifier" placeholder="@marko or you@example.com" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required />
          </div>
          {state.error && (
            <p className="text-sm text-danger" role="alert">{state.error}</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Log in"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted">
          No account?{" "}
          <Link href="/join" className="text-accent-strong hover:underline">
            Enter with invite
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
