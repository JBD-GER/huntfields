"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { PasskeyRegistrationCard } from "@/components/forms/passkey-registration-card";

type Role = "hunter" | "landowner";

export function ProfileOnboardingForm({ email }: { email?: string | null }) {
  const [role, setRole] = useState<Role>("hunter");
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("role", role);

    const response = await fetch("/api/onboarding/profile", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Unable to save onboarding.");
      setStatus("error");
      return;
    }

    setStatus("saved");
  }

  if (status === "saved") {
    return (
      <div className="grid gap-5">
        <div className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_16px_46px_rgba(25,35,29,0.08)]">
          <BadgeCheck className="size-7 text-[#234331]" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-black text-stone-950">
            Account setup saved.
          </h2>
          {role === "hunter" ? (
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Next, complete hunter compliance so landowners can evaluate your
              requests with license, safety, and signature readiness in place.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Next, submit land for review. You will draw the huntable area,
              confirm authority, set rules, and see the platform fee before
              price-sensitive steps.
            </p>
          )}
          <Link
            href={role === "hunter" ? "/onboarding/hunter" : "/list-your-land"}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-[#234331] px-5 text-sm font-black text-white"
          >
            {role === "hunter"
              ? "Complete hunter compliance"
              : "List your land"}
          </Link>
        </div>
        <PasskeyRegistrationCard email={email} />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {(["hunter", "landowner"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setRole(item)}
            className={`rounded-md border p-4 text-left transition ${
              role === item
                ? "border-[#234331] bg-[#eef3ec]"
                : "border-stone-200 bg-white"
            }`}
          >
            <p className="text-sm font-black capitalize text-stone-950">
              {item}
            </p>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              {item === "hunter"
                ? "Message owners, share compliance details, sign agreements, and pay after signature."
                : "Submit land, review requests, propose final terms, and receive payouts through Connect later."}
            </p>
          </button>
        ))}
      </div>

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

      <div className="grid gap-4 sm:grid-cols-[1fr_110px_150px]">
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

      {role === "landowner" ? (
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
      ) : null}

      {status === "error" ? (
        <p className="text-sm font-semibold text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#234331] px-5 font-bold text-white transition hover:bg-[#162d22] disabled:opacity-60"
      >
        <ShieldCheck size={18} aria-hidden="true" />
        {status === "loading" ? "Saving" : "Save account setup"}
      </button>
    </form>
  );
}
