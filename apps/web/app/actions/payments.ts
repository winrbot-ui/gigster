"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  PLAN_PLATFORMS,
  PLAN_PRICE_USD,
  SUBSCRIPTION_DAYS,
  type Plan,
} from "@gigster/shared-types";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { checkIpRateLimit } from "@/lib/security";

export type PaymentActionState = { error?: string; success?: string };

export async function submitPayment(
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const user = await requireUser();
  const plan = String(formData.get("plan") ?? "") as Plan;
  const txHash = String(formData.get("tx_hash") ?? "").trim();

  if (plan !== "basic" && plan !== "pro") {
    return { error: "Select a valid plan." };
  }
  if (!txHash || txHash.length < 10) {
    return { error: "Enter a valid transaction hash." };
  }

  const { allowed } = await checkIpRateLimit("crypto_submit", 5, 24);
  if (!allowed) {
    return { error: "Too many payment submissions. Try again later." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("tx_hash", txHash)
    .maybeSingle();
  if (existing) {
    return { error: "This transaction hash was already submitted." };
  }

  const { error } = await supabase.from("payments").insert({
    user_id: user.id,
    amount: PLAN_PRICE_USD[plan],
    plan,
    chain: "tron",
    tx_hash: txHash,
    status: "submitted",
  });

  if (error) return { error: error.message };
  revalidatePath("/buy");
  return {
    success:
      "Payment submitted. An admin will verify your transaction and activate your membership.",
  };
}

export async function selectPlan(plan: Plan): Promise<void> {
  // Stored client-side via form hidden field; no server state needed yet.
  void plan;
}

export { PLAN_PRICE_USD, PLAN_PLATFORMS, SUBSCRIPTION_DAYS };
