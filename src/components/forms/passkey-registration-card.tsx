"use client";

import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type PasskeyState = "idle" | "loading" | "success" | "error";

export function PasskeyRegistrationCard({ email }: { email?: string | null }) {
  const [state, setState] = useState<PasskeyState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function registerPasskey() {
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
      const { error } = await supabase.auth.registerPasskey();

      if (error) {
        throw error;
      }

      setState("success");
      setMessage("Passkey added. Next time you can sign in without a password.");
    } catch (caught) {
      setState("error");
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Unable to add passkey. Make sure Passkeys are enabled in Supabase Auth.",
      );
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_16px_46px_rgba(25,35,29,0.08)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
            Faster login
          </p>
          <h2 className="mt-2 text-2xl font-black text-stone-950">
            Add a passkey
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Use Face ID, Touch ID, Windows Hello, or a security key for this
            account{email ? ` (${email})` : ""}. It stays optional.
          </p>
        </div>
        <button
          type="button"
          onClick={registerPasskey}
          disabled={state === "loading"}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(24,51,38,0.18)] transition hover:bg-[#10271d] disabled:opacity-60"
        >
          <Fingerprint size={17} aria-hidden="true" />
          {state === "loading" ? "Opening passkey" : "Add passkey"}
        </button>
      </div>
      {message ? (
        <p
          className={`mt-4 rounded-md border p-3 text-sm font-semibold leading-6 ${
            state === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-[#234331]/14 bg-[#e9f2e9] text-[#234331]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
