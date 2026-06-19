"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type FormState = "idle" | "loading" | "success" | "error";

function resetRedirectUrl() {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(
    "/auth/reset-password",
  )}`;
}

function friendlyError(caught: unknown) {
  return caught instanceof Error
    ? caught.message
    : "Unable to send password reset email.";
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetRedirectUrl(),
      });

      if (error) {
        throw error;
      }

      setState("success");
      setMessage("Check your inbox for the secure password reset link.");
    } catch (caught) {
      setState("error");
      setMessage(friendlyError(caught));
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
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

      <button
        type="submit"
        disabled={state === "loading"}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#183326] px-5 font-black text-white shadow-[0_18px_36px_rgba(24,51,38,0.2)] transition hover:bg-[#10271d] disabled:opacity-60"
      >
        <Send size={17} aria-hidden="true" />
        {state === "loading" ? "Sending" : "Send reset link"}
      </button>

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
    </form>
  );
}
