import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 *
 * Next.js 16: `cookies()` is async and must be awaited. Writing cookies from a
 * Server Component throws, so we swallow that case (the session is refreshed in
 * `proxy.ts` instead).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — safe to ignore.
          }
        },
      },
    },
  );
}
