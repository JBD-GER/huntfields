"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

export function LandownerOnboardingForm({
  nextPath = "/list-your-land",
}: {
  nextPath?: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("role", "landowner");

    const response = await fetch("/api/onboarding/profile", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Unable to save owner profile.");
      setStatus("error");
      return;
    }

    setStatus("saved");
    window.location.assign(nextPath);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          First name
          <input
            name="first_name"
            required
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Last name
          <input
            name="last_name"
            required
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-stone-800">
        Street address
        <input
          name="street_address"
          required
          className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-[1fr_90px_130px]">
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          City
          <input
            name="city"
            required
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          State
          <input
            name="admin_area_code"
            maxLength={2}
            placeholder="TX"
            className="min-h-11 rounded-md border border-stone-300 px-3 uppercase font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          ZIP
          <input
            name="postal_code"
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-stone-800">
        Phone
        <input
          name="phone"
          type="tel"
          className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
        />
      </label>
      <label className="flex gap-3 text-sm font-semibold leading-6 text-stone-800">
        <input
          name="landowner_attestation"
          type="checkbox"
          required
          className="mt-1 size-4 rounded border-stone-300 text-[#234331]"
        />
        I am the landowner or legally authorized to list this property for
        hunting access.
      </label>
      <p className="rounded-md border border-[#d9c6aa] bg-[#fff9ef] p-3 text-xs leading-5 text-stone-600">
        Proof of ownership can be uploaded during review or connected later via
        GIS/county-record integrations. Listings remain review-gated.
      </p>
      {status === "error" && (
        <p className="text-sm font-semibold text-red-700">{error}</p>
      )}
      {status === "saved" && (
        <p className="text-sm font-semibold text-[#234331]">
          Owner profile saved. Opening listing form.
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#234331] px-5 font-bold text-white transition hover:bg-[#162d22] disabled:opacity-60"
      >
        <ShieldCheck size={18} aria-hidden="true" />
        {status === "loading" ? "Saving" : "Continue as landowner"}
      </button>
    </form>
  );
}
