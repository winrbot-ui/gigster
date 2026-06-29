import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password",
};

export default async function ResetPasswordPage() {
  // The recovery link goes through /auth/callback, which exchanges the code for
  // a session. If there is no session, the link expired or was opened directly.
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=reset_expired");

  return <ResetPasswordForm email={user.email} />;
}
