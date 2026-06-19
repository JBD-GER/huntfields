export const SUPABASE_AUTH_COOKIE_NAME = "hf-auth";

export const supabaseAuthCookieOptions = {
  name: SUPABASE_AUTH_COOKIE_NAME,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
