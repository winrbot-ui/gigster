import type { PaymentRow } from "@gigster/shared-types";
import { createClient } from "@/lib/supabase/server";

export type PaymentActionState = { error?: string; success?: string };

/** Latest payment awaiting admin verification, if any. */
export async function getPendingPaymentForUser(
  userId: string,
): Promise<PaymentRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "submitted")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getPendingPaymentForUser:", error.message);
    return null;
  }
  return (data as PaymentRow | null) ?? null;
}
