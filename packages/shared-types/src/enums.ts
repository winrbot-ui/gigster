/**
 * Canonical enums shared across web, backend, and desktop.
 * These mirror the Postgres enum types defined in infra/supabase/migrations.
 */

export const USER_ROLES = ["member", "marketer", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = [
  "pending_email",
  "free",
  "pending_payment",
  "active",
  "expired",
  "blocked",
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * Statuses allowed to use Agent 1 (drafting) without an active subscription.
 * Agent 1 is free; the paid payoff (brief document + Agent 2) requires `active`.
 */
export const AGENT1_STATUSES: readonly UserStatus[] = [
  "free",
  "pending_payment",
  "active",
  "expired",
];

/** True when the member may run Agent 1 drafting (free tier or paid). Admins always can. */
export function canUseAgent1(
  status: UserStatus,
  role?: UserRole,
): boolean {
  if (role === "admin") return true;
  return AGENT1_STATUSES.includes(status);
}

/**
 * True when the member has closed their first deal but has no active membership,
 * so the profile must prompt them to pay before unlocking the paid payoff.
 */
export function membershipRequiresPayment(user: {
  status: UserStatus;
  role?: UserRole;
  has_reached_deal?: boolean | null;
}): boolean {
  if (user.role === "admin") return false;
  if (user.status === "active") return false;
  return Boolean(user.has_reached_deal);
}

export const PLANS = ["basic", "pro"] as const;
export type Plan = (typeof PLANS)[number];

/** Distinct marketplace platforms allowed per plan (Fiverr + Freelancer only; Upwork is coming soon). */
export const PLAN_PLATFORMS: Record<Plan, number> = {
  basic: 1,
  pro: 2,
};

/** Plan price in USD (USDT TRC-20, manual). */
export const PLAN_PRICE_USD: Record<Plan, number> = {
  basic: 200,
  pro: 300,
};

/** Subscription duration in days. */
export const SUBSCRIPTION_DAYS = 30;

export const PAYMENT_STATUSES = ["submitted", "verified", "rejected"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PROJECT_PLATFORMS = ["upwork", "fiverr", "freelancer"] as const;
export type ProjectPlatform = (typeof PROJECT_PLATFORMS)[number];

export const PROJECT_STATUSES = ["new", "negotiating", "deal", "done"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const AGENT2_STATUSES = ["idle", "building", "ready", "failed"] as const;
export type Agent2Status = (typeof AGENT2_STATUSES)[number];

export const REFERRAL_STATUSES = ["pending", "qualified", "churned"] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];
