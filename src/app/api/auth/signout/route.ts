import { NextResponse } from "next/server";
import { clearSupabaseAuthCookies } from "@/lib/auth/supabase-cookie-cleanup";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  await clearSupabaseAuthCookies();

  return NextResponse.redirect(new URL("/", env.appUrl));
}
