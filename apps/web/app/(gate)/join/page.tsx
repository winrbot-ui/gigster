import type { Metadata } from "next";
import { JoinForm } from "@/components/gate/join-form";

export const metadata: Metadata = {
  title: "Enter with invite",
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  return (
    <JoinForm
      initialNickname={params.ref ?? ""}
      turnstileSiteKey={turnstileSiteKey}
    />
  );
}
