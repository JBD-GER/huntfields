import { cookies } from "next/headers";
import { SUPABASE_AUTH_COOKIE_NAME } from "@/lib/supabase/auth-cookies";

const KNOWN_AUTH_COOKIE_NAMES = [
  SUPABASE_AUTH_COOKIE_NAME,
  `${SUPABASE_AUTH_COOKIE_NAME}-code-verifier`,
];

function looksLikeLegacySupabaseAuthCookie(name: string) {
  return (
    !name.startsWith(SUPABASE_AUTH_COOKIE_NAME) &&
    (name.startsWith("sb-") ||
      name.includes("supabase") ||
      name.includes("auth-token") ||
      name.includes("code-verifier"))
  );
}

function looksLikeSupabaseAuthCookie(name: string) {
  return (
    name.startsWith(SUPABASE_AUTH_COOKIE_NAME) ||
    looksLikeLegacySupabaseAuthCookie(name)
  );
}

async function clearMatchingCookies(
  predicate: (name: string) => boolean,
  extraNames: string[] = [],
) {
  const cookieStore = await cookies();
  const names = new Set<string>();

  for (const cookie of cookieStore.getAll()) {
    if (!predicate(cookie.name)) {
      continue;
    }

    names.add(cookie.name);
  }

  for (const name of extraNames) {
    names.add(name);

    for (let index = 0; index < 8; index += 1) {
      names.add(`${name}.${index}`);
    }
  }

  for (const name of names) {
    cookieStore.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      sameSite: "lax",
    });
  }
}

export async function clearSupabaseAuthCookies() {
  await clearMatchingCookies(looksLikeSupabaseAuthCookie, KNOWN_AUTH_COOKIE_NAMES);
}

export async function clearLegacySupabaseAuthCookies() {
  await clearMatchingCookies(looksLikeLegacySupabaseAuthCookie);
}
