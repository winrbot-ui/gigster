/**
 * Public, browser-safe environment. Only NEXT_PUBLIC_* values belong here.
 * Server-only secrets (service role key, backend keys) must never be imported
 * into client code — read them directly from process.env in server modules.
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function assertPublicEnv(): void {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local (see .env.example).",
    );
  }
}
