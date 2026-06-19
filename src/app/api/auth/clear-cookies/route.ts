import { NextResponse } from "next/server";
import { clearSupabaseAuthCookies } from "@/lib/auth/supabase-cookie-cleanup";

export async function GET(request: Request) {
  await clearSupabaseAuthCookies();
  return NextResponse.redirect(new URL("/auth/login?cookies_cleared=1", request.url), {
    status: 303,
  });
}

export async function POST(request: Request) {
  await clearSupabaseAuthCookies();
  return NextResponse.redirect(new URL("/auth/login?cookies_cleared=1", request.url), {
    status: 303,
  });
}
