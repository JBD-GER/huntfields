"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, hasSupabaseBrowserEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  if (!hasSupabaseBrowserEnv()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createBrowserClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    auth: {
      experimental: {
        passkey: true,
      },
    },
  });
}
