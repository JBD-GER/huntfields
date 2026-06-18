"use client";

import Link from "next/link";
import { useState } from "react";
import { LockKeyhole, Send } from "lucide-react";

export function RequestAccessForm({
  listingId,
  isAuthenticated,
  nextPath,
}: {
  listingId: string;
  isAuthenticated: boolean;
  nextPath: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-[310px] overflow-hidden rounded-md border border-[#234331]/10 bg-[#f8f4eb] p-5 sm:min-h-[330px]">
        <div className="pointer-events-none select-none blur-[3px]">
          <div className="h-4 w-32 rounded bg-stone-300" />
          <div className="mt-4 h-28 rounded-md border border-stone-300 bg-white" />
          <div className="mt-4 h-11 rounded-md bg-[#234331]" />
        </div>
        <div className="absolute inset-0 grid place-items-center bg-[#fffdf7]/82 p-5 backdrop-blur-md sm:p-6">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-md bg-[#183326] text-white shadow-[0_18px_38px_rgba(24,51,38,0.22)]">
              <LockKeyhole size={18} aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-xl font-black text-stone-950">
              Create a free account
            </h3>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-stone-600">
              Start a secure conversation with the landowner and keep exact
              location details protected until approval.
            </p>
            <Link
              href={`/auth/login?next=${encodeURIComponent(nextPath)}`}
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[#183326] px-6 text-sm font-black text-white shadow-[0_18px_36px_rgba(24,51,38,0.2)] transition hover:bg-[#10271d] sm:w-auto sm:min-w-60"
            >
              Create free account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("listing_id", listingId);

    const response = await fetch("/api/requests", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Unable to send request.");
      setState("error");
      return;
    }

    event.currentTarget.reset();
    setState("success");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold text-stone-800">
        Message to the landowner
        <textarea
          name="message"
          rows={4}
          placeholder="Hi, I am interested in this hunting lease. Could we talk about availability and access terms?"
          className="rounded-md border border-[#234331]/14 bg-[#fbfaf6] px-3 py-2 font-normal outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
        />
      </label>
      {state === "error" && (
        <p className="text-sm font-semibold text-red-700">
          {error}{" "}
          <Link href="/onboarding/hunter" className="underline">
            Complete hunter setup
          </Link>
        </p>
      )}
      {state === "success" && (
        <p className="text-sm font-semibold text-[#234331]">
          Message sent. A chat has been opened with the landowner.
        </p>
      )}
      <button
        type="submit"
        disabled={state === "loading"}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#183326] px-5 font-black text-white shadow-[0_18px_36px_rgba(24,51,38,0.2)] transition hover:bg-[#10271d] disabled:opacity-60"
      >
        <Send size={17} aria-hidden="true" />
        {state === "loading" ? "Sending" : "Send message"}
      </button>
    </form>
  );
}
