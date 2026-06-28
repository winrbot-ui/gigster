import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { SettingsView } from "@/components/app/settings-view";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  return <SettingsView user={user} showResetHint={params.reset === "1"} />;
}
