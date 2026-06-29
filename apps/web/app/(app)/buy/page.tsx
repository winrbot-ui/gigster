import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPendingPaymentForUser } from "@/lib/payments";
import { BuyForm } from "@/components/app/buy-form";

export const metadata: Metadata = {
  title: "Membership",
};

export default async function BuyPage() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");

  const pendingPayment = await getPendingPaymentForUser(user.id);
  const usdtAddress = process.env.GIGSTER_USDT_TRC20_ADDRESS ?? "";

  return <BuyForm usdtAddress={usdtAddress} pendingPayment={pendingPayment} />;
}
