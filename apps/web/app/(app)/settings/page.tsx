import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getUserSubscription } from "@/lib/subscription";
import { getPersona } from "@/app/actions/persona";
import { SettingsView } from "@/components/app/settings-view";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [subscription, persona] = await Promise.all([
    getUserSubscription(user.id),
    getPersona(user.id),
  ]);
  return (
    <SettingsView
      user={user}
      subscription={subscription}
      persona={persona}
      showResetHint={params.reset === "1"}
    />
  );
}
