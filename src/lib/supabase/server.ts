import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  env,
  hasSupabaseBrowserEnv,
  hasSupabaseServiceEnv,
} from "@/lib/env";

export async function createSupabaseServerClient() {
  if (!hasSupabaseBrowserEnv()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server components cannot always write cookies; route handlers can.
        }
      },
    },
  });
}

export function createSupabasePublicClient() {
  if (!hasSupabaseBrowserEnv()) {
    return null;
  }

  return createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createSupabaseServiceClient() {
  if (!hasSupabaseServiceEnv()) {
    return null;
  }

  return createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
