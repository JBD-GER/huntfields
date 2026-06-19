"use client";

import { useState } from "react";
import { KeyRound, LockKeyhole } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type FormState = "idle" | "loading" | "success" | "error";

function friendlyError(caught: unknown) {
  return caught instanceof Error
    ? caught.message
    : "Unable to update your password.";
}

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage(null);

    if (password !== confirmPassword) {
      setState("error");
      setMessage("Passwords must match.");
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      setState("success");
      setMessage("Password updated. You can now log in with the new password.");

      window.setTimeout(() => {
        window.location.assign("/auth/login?password_reset=1");
      }, 900);
    } catch (caught) {
      setState("error");
      setMessage(friendlyError(caught));
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold text-stone-800">
        New password
        <span className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="min-h-11 w-full rounded-md border border-[#234331]/14 bg-[#fbfaf6] px-3 pl-10 font-normal outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </span>
      </label>

      <label className="grid gap-2 text-sm font-bold text-stone-800">
        Confirm password
        <span className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <input
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="min-h-11 w-full rounded-md border border-[#234331]/14 bg-[#fbfaf6] px-3 pl-10 font-normal outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </span>
      </label>

      <button
        type="submit"
        disabled={state === "loading" || state === "success"}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#183326] px-5 font-black text-white shadow-[0_18px_36px_rgba(24,51,38,0.2)] transition hover:bg-[#10271d] disabled:opacity-60"
      >
        <KeyRound size={17} aria-hidden="true" />
        {state === "loading" ? "Saving" : "Set new password"}
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
