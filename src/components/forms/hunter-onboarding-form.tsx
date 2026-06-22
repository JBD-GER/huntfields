"use client";

import { useState } from "react";
import { FileUp, ShieldCheck } from "lucide-react";
import type { UsStateHuntingRule } from "@/lib/compliance/us-state-rules";

export function HunterOnboardingForm({
  stateRules,
}: {
  stateRules: UsStateHuntingRule[];
}) {
  const [stateCode, setStateCode] = useState(stateRules[0]?.state_code ?? "TX");
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const activeRule =
    stateRules.find((rule) => rule.state_code === stateCode) ?? stateRules[0];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const response = await fetch("/api/hunter-compliance", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "Unable to save hunter profile.");
      setStatus("error");
      return;
    }

    setStatus("saved");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="rounded-md border border-[#234331]/10 bg-[#eef3ec] p-4 text-sm leading-6 text-[#183326]">
        <p className="font-black">Account details are reused.</p>
        <p className="mt-1 font-semibold">
          Your legal name, address, and contact details come from account
          onboarding and are not requested again here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Date of birth
          <input
            name="date_of_birth"
            type="date"
            required
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Primary hunting state
          <select
            name="hunting_license_state_code"
            value={stateCode}
            onChange={(event) => setStateCode(event.target.value)}
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          >
            {stateRules.map((rule) => (
              <option key={rule.state_code} value={rule.state_code}>
                {rule.state_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Hunting license number
          <input
            name="hunting_license_number"
            placeholder="Can be updated later"
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          License expiration
          <input
            name="hunting_license_expires_on"
            type="date"
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-800">
          Hunter education / exemption number
          <input
            name="hunter_education_number"
            placeholder="Certificate, deferral, apprentice, or exemption"
            className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-stone-800">
        Hunter education path
        <select
          name="hunter_education_status"
          required
          className="min-h-11 rounded-md border border-stone-300 px-3 font-normal outline-none focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20"
        >
          <option value="completed">Completed hunter education</option>
          <option value="deferral">Deferral, apprentice, or supervised path</option>
          <option value="exempt">Exempt under state rules</option>
          <option value="not_required_yet">
            Not required for my current access request
          </option>
        </select>
      </label>
      <label className="flex gap-3 text-sm font-semibold leading-6 text-stone-800">
        <input
          name="hunter_education_completed"
          type="checkbox"
          className="mt-1 size-4 rounded border-stone-300 text-[#234331]"
        />
        I have completed hunter education or qualify for a lawful exemption,
        deferral, apprentice, or supervised hunting path in the state where I
        hunt.
      </label>

      <section className="rounded-md border border-[#234331]/10 bg-white p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#eef3ec] text-[#183326]">
            <FileUp size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-black text-stone-950">
              Supporting documents
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Optional now, useful before owners approve access or final terms:
              license/permit proof and hunter education, deferral, apprentice,
              or exemption proof.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Hunting license document
            <input
              name="hunting_license_document"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-[#eef3ec] file:px-3 file:py-2 file:text-sm file:font-bold file:text-[#183326] focus:border-[#234331] focus:outline-none focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Hunter education certificate
            <input
              name="hunter_education_document"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-[#eef3ec] file:px-3 file:py-2 file:text-sm file:font-bold file:text-[#183326] focus:border-[#234331] focus:outline-none focus:ring-2 focus:ring-[#234331]/20"
            />
          </label>
        </div>
      </section>

      {activeRule && (
        <section className="rounded-md border border-[#d9c6aa] bg-[#fff9ef] p-4">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#c76b2f]">
            {activeRule.state_name} hunter checks
          </p>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-stone-700">
            {activeRule.hunter_attestations.map((attestation) => (
              <label key={attestation} className="flex gap-2">
                <input
                  name="attestations"
                  value={attestation}
                  type="checkbox"
                  required
                  className="mt-1 size-4 rounded border-stone-300 text-[#234331]"
                />
                <span>{attestation}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-600">
            Source baseline: {activeRule.agency_name}. Always verify current
            regulations before hunting.
          </p>
        </section>
      )}

      <label className="flex gap-3 text-sm font-semibold leading-6 text-stone-800">
        <input
          name="rules_acknowledged"
          type="checkbox"
          required
          className="mt-1 size-4 rounded border-stone-300 text-[#234331]"
        />
        I understand Huntfields does not replace state regulations, tags,
        licenses, permits, hunter education, landowner permission, or legal
        review.
      </label>
      <label className="flex gap-3 text-sm font-semibold leading-6 text-stone-800">
        <input
          name="liability_waiver_acknowledged"
          type="checkbox"
          required
          className="mt-1 size-4 rounded border-stone-300 text-[#234331]"
        />
        I acknowledge hunting and land access involve risk and that property
        rules and liability terms will be part of each booking agreement.
      </label>
      <label className="flex gap-3 text-sm font-semibold leading-6 text-stone-800">
        <input
          name="electronic_records_consent"
          type="checkbox"
          required
          className="mt-1 size-4 rounded border-stone-300 text-[#234331]"
        />
        I consent to receive and sign booking agreements electronically.
      </label>

      {status === "error" && (
        <p className="text-sm font-semibold text-red-700">{error}</p>
      )}
      {status === "saved" && (
        <p className="text-sm font-semibold text-[#234331]">
          Hunter profile saved. You can now message landowners.
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#234331] px-5 font-bold text-white transition hover:bg-[#162d22] disabled:opacity-60"
      >
        <ShieldCheck size={18} aria-hidden="true" />
        {status === "loading" ? "Saving" : "Complete hunter profile"}
      </button>
    </form>
  );
}
