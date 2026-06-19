import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeRedirectPath(value: string | null, origin: string) {
  if (!value) {
    return "/dashboard";
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  try {
    const url = new URL(value);

    if (url.origin === origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return "/dashboard";
  }

  return "/dashboard";
}

function redirectToLogin(origin: string, message: string) {
  const url = new URL("/auth/login", origin);
  url.searchParams.set("auth_error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(
    requestUrl.searchParams.get("next") ??
      requestUrl.searchParams.get("redirect_to"),
    requestUrl.origin,
  );
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return redirectToLogin(requestUrl.origin, "Supabase Auth is not configured.");
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return redirectToLogin(
    requestUrl.origin,
    "Your sign-in link expired or could not be verified. Please try again.",
  );
}
