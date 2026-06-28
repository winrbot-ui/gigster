"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type MarketerActionState = { error?: string; success?: string };

export async function submitMarketerApplication(
  _prev: MarketerActionState,
  formData: FormData,
): Promise<MarketerActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const pitch = String(formData.get("pitch") ?? "").trim();

  if (!email || !fullName || !country || pitch.length < 20) {
    return { error: "Fill all fields. Pitch must be at least 20 characters." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("marketer_applications").insert({
    email,
    full_name: fullName,
    country,
    pitch,
    status: "pending",
  });

  if (error) return { error: error.message };
  revalidatePath("/apply-marketer");
  return { success: "Application submitted. We'll review it within a few days." };
}

export async function getMarketerStats(marketerId: string) {
  const admin = createAdminClient();
  const { data: milestones } = await admin
    .from("marketer_milestones")
    .select("*")
    .eq("marketer_id", marketerId)
    .maybeSingle();

  const { count: qualified } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", marketerId)
    .eq("status", "qualified");

  const { count: pending } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", marketerId)
    .eq("status", "pending");

  const { count: churned } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", marketerId)
    .eq("status", "churned");

  const qualifiedCount = qualified ?? 0;

  return {
    milestones,
    qualifiedCount,
    pendingCount: pending ?? 0,
    churnedCount: churned ?? 0,
    tiers: {
      tier10kReached: Boolean(milestones?.milestone_20_paid),
      tier20kReached: Boolean(milestones?.milestone_40_paid),
      salaryActive: Boolean(milestones?.salary_active),
    },
  };
}
