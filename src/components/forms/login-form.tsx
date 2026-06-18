"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (otpError) {
        throw otpError;
      }

      setState("sent");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
      setState("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold text-stone-800">
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          className="min-h-11 rounded-md border border-[#234331]/14 bg-[#fbfaf6] px-3 font-normal outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
        />
      </label>
      {state === "sent" && (
        <p className="text-sm font-semibold text-[#234331]">
          Check your inbox for your secure free account link.
        </p>
      )}
      {state === "error" && (
        <p className="text-sm font-semibold text-red-700">{error}</p>
      )}
      <button
        type="submit"
        disabled={state === "loading"}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#183326] px-5 font-black text-white shadow-[0_18px_36px_rgba(24,51,38,0.2)] transition hover:bg-[#10271d] disabled:opacity-60"
      >
        <Mail size={17} aria-hidden="true" />
        {state === "loading" ? "Sending" : "Continue for free"}
      </button>
    </form>
  );
}
