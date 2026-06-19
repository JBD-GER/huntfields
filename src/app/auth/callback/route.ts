import { NextResponse } from "next/server";
import { clearLegacySupabaseAuthCookies } from "@/lib/auth/supabase-cookie-cleanup";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeRedirectPath(value: string | null, origin: string) {
  if (!value) {
    return "/dashboard";
  }

  if (value.startsWith("/")) {
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
  const error = requestUrl.searchParams.get("error_description");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"), requestUrl.origin);

  if (error) {
    return redirectToLogin(requestUrl.origin, error);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } =
      (await supabase?.auth.exchangeCodeForSession(code)) ?? {};

    if (exchangeError) {
      return redirectToLogin(
        requestUrl.origin,
        "Your sign-in link expired or could not be verified. Please try again.",
      );
    }

    await clearLegacySupabaseAuthCookies();
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
