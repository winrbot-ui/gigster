"use server";

import { PLAN_PRICE_USD, type Plan } from "@gigster/shared-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getPendingPaymentForUser, type PaymentActionState } from "@/lib/payments";
import { checkIpRateLimit } from "@/lib/security";

export async function submitPayment(
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    const user = await requireUser();
    const plan = String(formData.get("plan") ?? "") as Plan;
    const txHash = String(formData.get("tx_hash") ?? "").trim();

    if (plan !== "basic" && plan !== "pro") {
      return { error: "Select a valid plan." };
    }
    if (!txHash || txHash.length < 10) {
      return { error: "Enter a valid transaction hash." };
    }

    const existingPending = await getPendingPaymentForUser(user.id);
    if (existingPending) {
      return {
        success:
          "Your payment is already submitted and pending admin verification (up to 24 hours).",
      };
    }

    const { allowed } = await checkIpRateLimit("crypto_submit", 5, 24);
    if (!allowed) {
      return { error: "Too many payment submissions. Try again later." };
    }

    const admin = createAdminClient();

    const { data: existingTx } = await admin
      .from("payments")
      .select("id")
      .eq("tx_hash", txHash)
      .maybeSingle();
    if (existingTx) {
      return { error: "This transaction hash was already submitted." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      amount: PLAN_PRICE_USD[plan],
      plan,
      chain: "tron",
      tx_hash: txHash,
      status: "submitted",
    });

    if (error) {
      console.error("submitPayment insert:", error.message);
      return { error: error.message };
    }

    return {
      success:
        "Payment submitted. An administrator will verify your transaction within 24 hours.",
    };
  } catch (err) {
    console.error("submitPayment failed:", err);
    return {
      error: "Something went wrong submitting your payment. Please try again.",
    };
  }
}
