import { CustomOfferPage } from "@/components/public/custom-offer";

export default function CustomPage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  return <CustomOfferPage turnstileSiteKey={turnstileSiteKey} />;
}
