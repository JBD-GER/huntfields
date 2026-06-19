"use client";

import { useState } from "react";
import {
  Building2,
  KeyRound,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "register";
type AuthState = "idle" | "loading" | "success" | "error";

type LoginFormProps = {
  authError?: string | null;
  initialMode?: AuthMode;
  nextPath?: string;
};

function callbackUrl(nextPath: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

function friendlyError(caught: unknown, fallback: string) {
  if (caught instanceof Error) {
    return caught.message;
  }

  return fallback;
}

export function LoginForm({
  authError = null,
  initialMode = "login",
  nextPath = "/dashboard",
}: LoginFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ssoDomain, setSsoDomain] = useState("");
  const [state, setState] = useState<AuthState>(authError ? "error" : "idle");
  const [message, setMessage] = useState<string | null>(authError);

  async function handlePasswordAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        window.location.assign(nextPath);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callbackUrl(nextPath),
        },
      });

      if (error) {
        throw error;
      }

      setState("success");
      setMessage("Check your inbox to confirm your account, then sign in.");
    } catch (caught) {
      setState("error");
      setMessage(
        friendlyError(
          caught,
          mode === "login" ? "Unable to sign in." : "Unable to create account.",
        ),
      );
    }
  }

  async function handleGoogleAuth() {
    setState("loading");
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl(nextPath),
        },
      });

      if (error) {
        throw error;
      }
    } catch (caught) {
      setState("error");
      setMessage(friendlyError(caught, "Unable to start Google sign-in."));
    }
  }

  async function handleSsoAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage(null);

    try {
      const domain = ssoDomain.trim().replace(/^@/, "").toLowerCase();

      if (!domain || !domain.includes(".")) {
        throw new Error("Enter your company domain, for example company.com.");
      }

      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithSSO({
        domain,
        options: {
          redirectTo: callbackUrl(nextPath),
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (caught) {
      setState("error");
      setMessage(
        friendlyError(
          caught,
          "Unable to start SAML SSO. Check the company domain and Supabase SSO setup.",
        ),
      );
    }
  }

  const loading = state === "loading";

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-md border border-[#234331]/10 bg-[#f0eadf] p-1">
        {(["login", "register"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setMode(item);
              setState("idle");
              setMessage(null);
            }}
            className={`min-h-10 rounded-md px-3 text-sm font-black transition ${
              mode === item
                ? "bg-[#183326] text-white shadow-[0_12px_26px_rgba(24,51,38,0.16)]"
                : "text-stone-600 hover:bg-white/72 hover:text-stone-950"
            }`}
          >
            {item === "login" ? "Log in" : "Create account"}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading}
        className="inline-flex min-h-11 items-center justify-center gap-3 rounded-md border border-[#234331]/14 bg-white px-4 text-sm font-black text-stone-900 shadow-sm transition hover:border-[#234331]/32 hover:bg-[#fbfaf6] disabled:opacity-60"
      >
        <span className="grid size-6 place-items-center rounded-full bg-stone-950 text-xs font-black text-white">
          G
        </span>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.14em] text-stone-400">
        <span className="h-px flex-1 bg-[#234331]/12" />
        Email and password
        <span className="h-px flex-1 bg-[#234331]/12" />
      </div>

      <form onSubmit={handlePasswordAuth} className="grid gap-4">
        <label className="grid gap-2 text-sm font-bold text-stone-800">
          Email
          <span className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
              className="min-h-11 w-full rounded-md border border-[#234331]/14 bg-[#fbfaf6] px-3 pl-10 font-normal outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </span>
        </label>
        <label className="grid gap-2 text-sm font-bold text-stone-800">
          Password
          <span className="relative">
            <LockKeyhole
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              className="min-h-11 w-full rounded-md border border-[#234331]/14 bg-[#fbfaf6] px-3 pl-10 font-normal outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
            />
          </span>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#183326] px-5 font-black text-white shadow-[0_18px_36px_rgba(24,51,38,0.2)] transition hover:bg-[#10271d] disabled:opacity-60"
        >
          <KeyRound size={17} aria-hidden="true" />
          {loading
            ? "Working"
            : mode === "login"
              ? "Log in"
              : "Create free account"}
        </button>
      </form>

      <form
        onSubmit={handleSsoAuth}
        className="grid gap-3 rounded-md border border-[#234331]/10 bg-[#f6f2e9] p-3"
      >
        <label className="grid gap-2 text-sm font-bold text-stone-800">
          Company SAML domain
          <input
            value={ssoDomain}
            onChange={(event) => setSsoDomain(event.target.value)}
            type="text"
            placeholder="company.com"
            required
            className="min-h-10 rounded-md border border-[#234331]/14 bg-white px-3 font-normal outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#234331]/14 bg-white px-4 text-sm font-black text-[#183326] transition hover:border-[#234331]/35 disabled:opacity-60"
        >
          <Building2 size={16} aria-hidden="true" />
          Continue with SAML 2.0
        </button>
      </form>

      {message ? (
        <p
          className={`rounded-md border p-3 text-sm font-semibold leading-6 ${
            state === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-[#234331]/14 bg-[#e9f2e9] text-[#234331]"
          }`}
        >
          {message}
        </p>
      ) : null}

      <p className="text-xs font-semibold leading-5 text-stone-500">
        Default is login. Create account is only for new users. Registration is
        free and can require email confirmation depending on your Supabase Auth
        settings.
      </p>
    </div>
  );
}
