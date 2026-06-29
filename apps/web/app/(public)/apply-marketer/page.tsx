import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ApplyMarketerForm } from "@/components/marketing/apply-marketer-form";
import { getCurrentUser } from "@/lib/auth";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Become a marketer",
  description:
    "Apply to grow the Gigster club and earn through referral milestones.",
};

export default async function ApplyMarketerPage() {
  const user = await getCurrentUser();

  return (
    <Container className="py-24">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Become a Gigster marketer
          </h1>
          <p className="text-sm text-muted">
            Bring serious freelancers into the club. Hit referral milestones,
            unlock recurring rewards.
          </p>
        </div>

        {!user ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Members only</CardTitle>
              <CardDescription>
                You must be an active Gigster member before you can apply as a marketer.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted">
              <p>1. Join the club with an invite and create your account.</p>
              <p>2. Activate your membership (Basic or Pro).</p>
              <p>3. Come back here and apply — you keep your member access and add marketer rewards.</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/join" className={buttonClasses("primary", "sm")}>
                  Enter with invite
                </Link>
                <Link href="/login" className={buttonClasses("secondary", "sm")}>
                  Log in
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : user.status !== "active" ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Activate your membership first</CardTitle>
              <CardDescription>
                Marketers are active members who also earn referral rewards.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted">
              <p>Finish your membership payment, then apply as a marketer.</p>
              <Link href="/buy" className={buttonClasses("primary", "sm")}>
                Go to membership
              </Link>
            </CardContent>
          </Card>
        ) : user.role === "marketer" || user.role === "admin" ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>You already have marketer access</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted">
              <Link href="/marketer" className={buttonClasses("primary", "sm")}>
                Open marketer dashboard
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ApplyMarketerForm email={user.email} />
        )}
      </div>
    </Container>
  );
}
