import { redirect } from "next/navigation";
import { GuideView } from "@/components/app/guide-view";
import { requireActive } from "@/lib/auth";

export default async function GuidePage() {
  const user = await requireActive();
  if (!user) redirect("/login");
  return <GuideView />;
}
