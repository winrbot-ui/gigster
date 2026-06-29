"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PaymentRow } from "@gigster/shared-types";
import { submitPayment } from "@/app/actions/payments";
import type { PaymentActionState } from "@/lib/payments";
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
  pendingPayment: PaymentRow | null;
}

function PendingVerificationCard({ payment }: { payment: PaymentRow }) {
  return (
    <Card className="mt-6 border-accent/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle>Pending verification</CardTitle>
          <Badge tone="accent">Submitted</Badge>
        </div>
        <CardDescription>
          Your payment is in the admin queue. Verification usually completes within
          24 hours. You&apos;ll get an email when your membership is active.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="rounded-lg bg-surface-2 p-4">
          <p>
            <span className="text-muted">Plan:</span>{" "}
            <span className="capitalize">{payment.plan}</span> · ${payment.amount} USDT
          </p>
          <p className="mt-2 break-all font-mono text-xs text-muted">
            {payment.tx_hash}
          </p>
        </div>
        <p className="text-muted">
          No further action needed — log in anytime to check status. If it takes longer
          than 24 hours, contact support with your transaction hash.
        </p>
      </CardContent>
    </Card>
  );
}

export function BuyForm({ usdtAddress, pendingPayment }: BuyFormProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>("pro");
  const [state, formAction, pending] = useActionState<
    PaymentActionState,
    FormData
  >(submitPayment, {});

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  const showPending = pendingPayment || state.success;

  return (
    <>
      <PageHeader
        title="Membership"
        description={
          showPending
            ? "Your payment is awaiting administrator verification."
            : "Pay in USDT (TRC-20), then submit your transaction hash for verification."
        }
      />

      {pendingPayment ? (
        <PendingVerificationCard payment={pendingPayment} />
      ) : state.success ? (
        <Card className="mt-6 border-success/30">
          <CardHeader>
            <CardTitle>Payment submitted</CardTitle>
            <CardDescription>{state.success}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">
              Refresh this page in a moment if details do not appear above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
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
                  <Input
                    id="tx_hash"
                    name="tx_hash"
                    placeholder="Paste TRC-20 tx hash"
                    spellCheck={false}
                    required
                  />
                </div>
                {state.error && (
                  <p className="text-sm text-danger" role="alert">
                    {state.error}
                  </p>
                )}
                <Button type="submit" disabled={pending || !usdtAddress}>
                  {pending ? "Submitting…" : "Submit for verification"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
