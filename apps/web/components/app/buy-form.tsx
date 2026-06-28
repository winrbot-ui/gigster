"use client";

import { useActionState, useState } from "react";
import { submitPayment, type PaymentActionState } from "@/app/actions/payments";
import { PLAN_PLATFORMS, PLAN_PRICE_USD, type Plan } from "@gigster/shared-types";
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
import { PageHeader } from "@/components/app/app-shell";

interface BuyFormProps {
  usdtAddress: string;
}

export function BuyForm({ usdtAddress }: BuyFormProps) {
  const [plan, setPlan] = useState<Plan>("pro");
  const [state, formAction, pending] = useActionState<
    PaymentActionState,
    FormData
  >(submitPayment, {});

  return (
    <>
      <PageHeader
        title="Membership"
        description="Pay in USDT (TRC-20), then submit your transaction hash for verification."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {(["basic", "pro"] as const).map((p) => (
          <Card
            key={p}
            className={plan === p ? "border-accent/40" : undefined}
            onClick={() => setPlan(p)}
            role="button"
            tabIndex={0}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{p}</CardTitle>
                {p === "pro" && <Badge tone="accent">Popular</Badge>}
              </div>
              <CardDescription>
                ${PLAN_PRICE_USD[p]} · {PLAN_PLATFORMS[p]} platform
                {PLAN_PLATFORMS[p] > 1 ? "s" : ""} · 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant={plan === p ? "primary" : "secondary"}
                size="sm"
                onClick={() => setPlan(p)}
              >
                {plan === p ? "Selected" : `Choose ${p}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Send USDT (TRC-20)</CardTitle>
          <CardDescription>
            Send exactly ${PLAN_PRICE_USD[plan]} USDT to this address, then paste
            the transaction hash below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg bg-surface-2 p-4 font-mono text-sm break-all">
            {usdtAddress || "Set GIGSTER_USDT_TRC20_ADDRESS in env"}
          </div>
          <form action={formAction} className="flex max-w-md flex-col gap-4">
            <input type="hidden" name="plan" value={plan} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="tx_hash">Transaction hash</Label>
              <Input id="tx_hash" name="tx_hash" placeholder="0x…" spellCheck={false} required />
            </div>
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            {state.success && <p className="text-sm text-success">{state.success}</p>}
            <Button type="submit" disabled={pending || !usdtAddress}>
              {pending ? "Submitting…" : "Submit for verification"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
