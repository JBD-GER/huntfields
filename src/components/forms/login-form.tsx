"use client";

import { useState } from "react";
import {
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "register";
type AuthState = "idle" | "loading" | "success" | "error";

type LoginFormProps = {
  authError?: string | null;
  authMessage?: string | null;
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
  authMessage = null,
  initialMode = "login",
  nextPath = "/dashboard",
}: LoginFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<AuthState>(
    authError ? "error" : authMessage ? "success" : "idle",
  );
  const [message, setMessage] = useState<string | null>(
    authError ?? authMessage,
  );

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

  async function handlePasskeyAuth() {
    setState("loading");
    setMessage(null);

    try {
      if (
        typeof window === "undefined" ||
        !("PublicKeyCredential" in window)
      ) {
        throw new Error("This browser does not support passkeys.");
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPasskey();

      if (error) {
        throw error;
      }

      window.location.assign(nextPath);
    } catch (caught) {
      setState("error");
      setMessage(
        friendlyError(
          caught,
          "Unable to sign in with passkey. Use Google or email if this account has no passkey yet.",
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
        <GoogleMark />
        Continue with Google
      </button>

      <button
        type="button"
        onClick={handlePasskeyAuth}
        disabled={loading}
        className="inline-flex min-h-11 items-center justify-center gap-3 rounded-md border border-[#234331]/14 bg-[#fbfaf6] px-4 text-sm font-black text-[#183326] shadow-sm transition hover:border-[#234331]/32 hover:bg-white disabled:opacity-60"
      >
        <Fingerprint size={18} aria-hidden="true" />
        Continue with passkey
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
        free and may require email confirmation depending on your Supabase Auth
        settings. Passkeys can be added after your first login.
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
