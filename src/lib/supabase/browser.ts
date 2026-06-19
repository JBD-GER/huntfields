"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, hasSupabaseBrowserEnv } from "@/lib/env";
import { supabaseAuthCookieOptions } from "@/lib/supabase/auth-cookies";

export function createSupabaseBrowserClient() {
  if (!hasSupabaseBrowserEnv()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createBrowserClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookieOptions: supabaseAuthCookieOptions,
    auth: {
      experimental: {
        passkey: true,
      },
    },
  });
}
