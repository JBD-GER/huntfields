import { cookies } from "next/headers";

function looksLikeSupabaseAuthCookie(name: string) {
  return (
    name.startsWith("sb-") ||
    name.includes("supabase") ||
    name.includes("auth-token") ||
    name.includes("code-verifier")
  );
}

export async function clearSupabaseAuthCookies() {
  const cookieStore = await cookies();

  for (const cookie of cookieStore.getAll()) {
    if (!looksLikeSupabaseAuthCookie(cookie.name)) {
      continue;
    }

    cookieStore.set(cookie.name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      sameSite: "lax",
    });
  }
}
