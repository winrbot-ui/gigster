import type {
  Agent2Status,
  PaymentStatus,
  Plan,
  ProjectPlatform,
  ProjectStatus,
  ReferralStatus,
  UserRole,
  UserStatus,
} from "./enums";
import type { AgentPersona } from "./persona";
import type { ProjectJson } from "./project";
import type { BuildSpec } from "./build-spec";

/**
 * Row types mirroring the Postgres tables in infra/supabase/migrations.
 * Timestamps are ISO-8601 strings as returned by Supabase (postgrest).
 */

export interface UserRow {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  referred_by_id: string | null;
  status: UserStatus;
  created_at: string;
  email_verified_at: string | null;
  signup_ip: string | null;
  /** Set once the member closes their first deal — triggers the payment prompt. */
  has_reached_deal: boolean;
  /** Timestamp of the first concluded deal (brief ready), or null. */
  first_deal_at: string | null;
}

export interface AgentPersonaRow extends AgentPersona {
  user_id: string;
  updated_at: string;
}

export interface InviteCodeRow {
  id: string;
  owner_id: string;
  code: string;
  uses_remaining: number;
  expires_at: string | null;
}

export interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_id: string;
  qualified_at: string | null;
  status: ReferralStatus;
  created_at: string;
}

export interface MarketerMilestoneRow {
  marketer_id: string;
  milestone_20_paid: boolean;
  milestone_40_paid: boolean;
  salary_active: boolean;
  qualified_count: number;
  tier_10k_reached_at: string | null;
  tier_20k_reached_at: string | null;
  salary_started_at: string | null;
  updated_at: string;
}

export interface DesktopAutoSettingsRow {
  user_id: string;
  enabled: boolean;
  disclaimer_accepted: boolean;
  delay_minutes: number;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: Plan;
  platforms_allowed: number;
  started_at: string;
  expires_at: string;
  active: boolean;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  amount: number;
  plan: Plan;
  chain: string;
  tx_hash: string;
  status: PaymentStatus;
  paid_at: string | null;
  verified_by: string | null;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  platform: ProjectPlatform;
  client_name: string | null;
  /** Marketplace thread/conversation id from the extension. */
  thread_id: string | null;
  status: ProjectStatus;
  project_json: ProjectJson | null;
  build_spec: BuildSpec | null;
  brief_score: number | null;
  agent2_status: Agent2Status;
  preview_url: string | null;
  preview_slug: string | null;
  created_at: string;
}

export type MessageRole = "client" | "assistant";

export interface ConversationMessageRow {
  id: string;
  user_id: string;
  platform: ProjectPlatform;
  thread_id: string;
  role: MessageRole;
  text: string;
  sent_at: string | null;
  created_at: string;
}

export interface MessageEventRow {
  id: string;
  user_id: string;
  platform: ProjectPlatform;
  client_name: string | null;
  thread_id: string | null;
  detected_at: string;
  processed: boolean;
}

export interface FewShotExampleRow {
  id: string;
  niche: string;
  client_msg: string;
  good_reply: string;
  bad_reply: string;
}

export interface TelegramLinkRow {
  user_id: string;
  chat_id: string | null;
  link_code: string;
  linked_at: string | null;
}

export interface IpAttemptRow {
  ip: string;
  endpoint: string;
  attempt_count: number;
  window_start: string;
}
