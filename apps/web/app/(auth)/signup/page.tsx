import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { INVITE_COOKIE } from "@/lib/security";

export const metadata: Metadata = {
  title: "Create your account",
};

export default async function SignupPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get(INVITE_COOKIE)?.value) {
    redirect("/join");
  }
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  return <SignupForm turnstileSiteKey={turnstileSiteKey} />;
}
