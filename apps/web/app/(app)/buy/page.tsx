import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { BuyForm } from "@/components/app/buy-form";

export const metadata: Metadata = {
  title: "Membership",
};

export default async function BuyPage() {
  await requireUser();
  const usdtAddress = process.env.GIGSTER_USDT_TRC20_ADDRESS ?? "";
  return <BuyForm usdtAddress={usdtAddress} />;
}
