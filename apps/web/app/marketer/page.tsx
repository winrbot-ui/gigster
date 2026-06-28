import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getMarketerStats, MARKETER_TIERS } from "@/app/actions/marketer";
import { PageHeader } from "@/components/app/app-shell";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Marketer",
};

export default async function MarketerOverviewPage() {
  const user = await requireRole("marketer", "admin");
  const { milestones, qualifiedCount, pendingCount, churnedCount, tiers } =
    await getMarketerStats(user.id);

  const nextMilestone =
    qualifiedCount >= MARKETER_TIERS.tier20k.count
      ? "All tiers unlocked"
      : qualifiedCount >= MARKETER_TIERS.tier10k.count
        ? `${MARKETER_TIERS.tier20k.count} users (${MARKETER_TIERS.tier20k.reward})`
        : `${MARKETER_TIERS.tier10k.count} users (${MARKETER_TIERS.tier10k.reward})`;

  return (
    <>
      <PageHeader
        title="Marketer overview"
        description="Track referrals and milestone tiers. Users qualify after 90 days active."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Qualified users</CardDescription>
            <CardTitle className="text-3xl">{qualifiedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending (under 90 days)</CardDescription>
            <CardTitle className="text-3xl">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Churned (clawed back)</CardDescription>
            <CardTitle className="text-3xl">{churnedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Next milestone</CardDescription>
            <CardTitle className="text-lg">{nextMilestone}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>{MARKETER_TIERS.tier10k.count} qualified users</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              {MARKETER_TIERS.tier10k.reward}
              <Badge tone={tiers.tier10kReached ? "success" : "neutral"}>
                {tiers.tier10kReached ? "Reached" : "Locked"}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{MARKETER_TIERS.tier20k.count} qualified users</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              {MARKETER_TIERS.tier20k.reward}
              <Badge tone={tiers.tier20kReached ? "success" : "neutral"}>
                {tiers.tier20kReached ? "Reached" : "Locked"}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>After {MARKETER_TIERS.tier20k.count} qualified</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              {MARKETER_TIERS.salary.reward}
              <Badge tone={tiers.salaryActive ? "success" : "neutral"}>
                {tiers.salaryActive ? "Active" : "Inactive"}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </>
  );
}
