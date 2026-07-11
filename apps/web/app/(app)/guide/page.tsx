import { redirect } from "next/navigation";
import { GuideView } from "@/components/app/guide-view";
import { requireMember } from "@/lib/auth";

export default async function GuidePage() {
  const user = await requireMember();
  if (!user) redirect("/login");
  return <GuideView />;
}
