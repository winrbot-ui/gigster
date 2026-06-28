import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyPanel } from "@/components/auth/verify-panel";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Verify email",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (user?.status === "pending_payment" || user?.status === "active") {
    redirect("/buy");
  }

  return (
    <VerifyPanel
      email={params.email ?? user?.email}
      error={params.error === "confirmation_failed" ? "Email confirmation failed. Request a new link." : undefined}
    />
  );
}
