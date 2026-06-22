"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Fingerprint,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-assets";
import { PasskeyRegistrationCard } from "@/components/forms/passkey-registration-card";

type Role = "hunter" | "landowner";
type Step = "welcome" | "role" | "details" | "passkey" | "done";

const steps: { id: Step; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "role", label: "Role" },
  { id: "details", label: "Details" },
  { id: "passkey", label: "Passkey" },
  { id: "done", label: "Next" },
];

const roleCopy = {
  hunter: {
    label: "Hunter",
    icon: UserRound,
    title: "Find leases, request access, and manage signed agreements.",
    body: "Search private hunting leases from your dashboard, send respectful access requests, share compliance details, sign first, and pay before the landowner countersigns.",
    bullets: [
      "Dashboard search and filters",
      "Request and message workflow",
      "Compliance and contract readiness",
    ],
    dashboardHref: "/dashboard?view=leases&next=request",
    nextLabel: "Start with Hunting Leases",
  },
  landowner: {
    label: "Landowner",
    icon: Building2,
    title: "List land, review hunters, and prepare payouts before contracts.",
    body: "Create controlled listings, review incoming requests, propose final terms, digitally sign contracts, and connect payout details before money can move.",
    bullets: [
      "Listing tools and map drawing",
      "Request review and final terms",
      "Stripe Connect payout readiness",
    ],
    dashboardHref: "/dashboard?view=listings&next=create-listing",
    nextLabel: "Create the First Listing",
  },
} satisfies Record<
  Role,
  {
    label: string;
    icon: typeof UserRound;
    title: string;
    body: string;
    bullets: string[];
    dashboardHref: string;
    nextLabel: string;
  }
>;

function stepIndex(step: Step) {
  return steps.findIndex((item) => item.id === step);
}

function fieldClass() {
  return "min-h-12 w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 text-base font-normal text-stone-950 outline-none transition focus:border-[#234331] focus:ring-2 focus:ring-[#234331]/20";
}

export function ProfileOnboardingForm({ email }: { email?: string | null }) {
  const [step, setStep] = useState<Step>("welcome");
  const [role, setRole] = useState<Role>("hunter");
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const activeRole = roleCopy[role];
  const ActiveRoleIcon = activeRole.icon;
  const activeIndex = stepIndex(step);

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
    setStep("passkey");
  }

  return (
    <section className="relative min-h-dvh overflow-hidden bg-[#f4efe5] text-stone-950">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgb(255_255_255_/0.82),rgb(246_242_233_/0.82)),repeating-linear-gradient(90deg,rgb(35_67_49_/0.055)_0,rgb(35_67_49_/0.055)_1px,transparent_1px,transparent_22px),repeating-linear-gradient(0deg,rgb(199_107_47_/0.05)_0,rgb(199_107_47_/0.05)_1px,transparent_1px,transparent_22px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 overflow-hidden bg-[#234331]/10">
        <span className="huntfields-onboarding-scan block h-full w-1/3 bg-[#c76b2f]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-1 items-center justify-center py-5 lg:py-8">
          <main className="w-full rounded-lg border border-[#234331]/10 bg-[#fffdf7]/94 p-4 shadow-[0_28px_90px_rgba(25,35,29,0.16)] backdrop-blur sm:p-5 lg:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <Link href="/" aria-label="Huntfields home">
                <BrandLogo variant="black" priority className="w-36 sm:w-44" />
              </Link>
              <p className="hidden text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f] sm:block">
                Account setup
              </p>
            </div>
            <div className="mb-5 grid gap-2 sm:grid-cols-5">
              {steps.map((item, index) => {
                const complete = index < activeIndex;
                const active = index === activeIndex;
                return (
                  <div
                    key={item.id}
                    className={`min-h-10 rounded-md border px-2.5 py-2 text-xs font-black ${
                      active
                        ? "border-[#234331] bg-[#eef3ec] text-[#183326]"
                        : complete
                          ? "border-[#234331]/18 bg-white text-[#234331]"
                          : "border-stone-200 bg-white/70 text-stone-500"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {complete ? (
                        <CheckCircle2 size={14} aria-hidden="true" />
                      ) : (
                        <span className="grid size-5 place-items-center rounded-full bg-stone-100 text-[10px]">
                          {index + 1}
                        </span>
                      )}
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {step === "welcome" ? (
              <div className="grid min-h-[470px] content-between gap-8">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                    Account onboarding
                  </p>
                  <h2 className="mt-3 text-4xl font-black leading-[1.02] text-stone-950 sm:text-5xl">
                    Welcome to Huntfields.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
                    Set up your account once, choose the right role, add the
                    shared profile details, and then continue into a dashboard
                    that matches what you want to do first.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["1", "Choose role", "Hunter or landowner tools unlock."],
                    ["2", "Add details", "Shared profile data stays reusable."],
                    ["3", "Start progress", "Dashboard shows what to finish."],
                  ].map(([number, title, body]) => (
                    <div
                      key={number}
                      className="rounded-md border border-[#234331]/10 bg-white p-4"
                    >
                      <span className="grid size-8 place-items-center rounded-md bg-[#183326] text-sm font-black text-white">
                        {number}
                      </span>
                      <h3 className="mt-4 text-base font-black text-stone-950">
                        {title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        {body}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-[#234331]/10 bg-[#f7f3ea] p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#183326] text-white">
                      <Fingerprint size={18} aria-hidden="true" />
                    </span>
                    <p className="text-sm font-semibold leading-6 text-stone-700">
                      Passkeys are optional. You can add one during setup, skip
                      it, and still manage everything from the dashboard.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("role")}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#183326] px-5 text-sm font-black text-white shadow-[0_18px_44px_rgba(24,51,38,0.2)] transition hover:bg-[#10271d] sm:w-auto"
                >
                  Start setup
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            ) : null}

            {step === "role" ? (
              <div className="grid min-h-[470px] content-between gap-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                    Role selection
                  </p>
                  <h2 className="mt-3 text-3xl font-black leading-tight text-stone-950">
                    Pick the workflow you need first.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-stone-600">
                    You can still interact with both sides later, but the first
                    dashboard should match what you came here to do.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {(["hunter", "landowner"] as const).map((item) => {
                    const copy = roleCopy[item];
                    const Icon = copy.icon;
                    const selected = role === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setRole(item)}
                        className={`min-h-[260px] rounded-lg border p-5 text-left transition ${
                          selected
                            ? "border-[#234331] bg-[#eef3ec] shadow-[0_18px_46px_rgba(35,67,49,0.12)]"
                            : "border-stone-200 bg-white hover:border-[#234331]/35"
                        }`}
                      >
                        <span
                          className={`grid size-12 place-items-center rounded-md ${
                            selected
                              ? "bg-[#183326] text-white"
                              : "bg-[#f7f3ea] text-[#183326]"
                          }`}
                        >
                          <Icon size={22} aria-hidden="true" />
                        </span>
                        <span className="mt-5 block text-xl font-black text-stone-950">
                          {copy.label}
                        </span>
                        <span className="mt-2 block text-sm font-semibold leading-6 text-stone-600">
                          {copy.title}
                        </span>
                        <span className="mt-4 grid gap-2">
                          {copy.bullets.map((bullet) => (
                            <span
                              key={bullet}
                              className="flex items-center gap-2 text-sm font-bold text-stone-700"
                            >
                              <CheckCircle2
                                className="size-4 text-[#2f6f8f]"
                                aria-hidden="true"
                              />
                              {bullet}
                            </span>
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep("welcome")}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-black text-stone-700"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("details")}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#183326] px-5 text-sm font-black text-white"
                  >
                    Continue as {activeRole.label}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}

            {step === "details" ? (
              <form onSubmit={onSubmit} className="grid gap-5">
                <div className="rounded-md border border-[#234331]/10 bg-[#f7f3ea] p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[#183326] text-white">
                      <ActiveRoleIcon size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                        Shared account details
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-stone-950">
                        {activeRole.label} profile
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        {activeRole.body}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-800">
                    First name
                    <input name="first_name" required className={fieldClass()} />
                  </label>
                  <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-800">
                    Last name
                    <input name="last_name" required className={fieldClass()} />
                  </label>
                </div>

                <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-800">
                  Street address
                  <input
                    name="street_address"
                    required
                    autoComplete="street-address"
                    className={fieldClass()}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(90px,120px)_minmax(120px,150px)]">
                  <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-800">
                    City
                    <input
                      name="city"
                      required
                      autoComplete="address-level2"
                      className={fieldClass()}
                    />
                  </label>
                  <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-800">
                    State
                    <input
                      name="admin_area_code"
                      maxLength={2}
                      placeholder="TX"
                      autoComplete="address-level1"
                      className={`${fieldClass()} uppercase`}
                    />
                  </label>
                  <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-800">
                    ZIP
                    <input
                      name="postal_code"
                      autoComplete="postal-code"
                      className={fieldClass()}
                    />
                  </label>
                </div>

                <label className="grid min-w-0 gap-2 text-sm font-semibold text-stone-800">
                  Phone
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    className={fieldClass()}
                  />
                </label>

                {role === "landowner" ? (
                  <label className="flex gap-3 rounded-md border border-[#d9c6aa] bg-[#fff9ef] p-3 text-sm font-semibold leading-6 text-stone-800">
                    <input
                      name="landowner_attestation"
                      type="checkbox"
                      required
                      className="mt-1 size-4 rounded border-stone-300 text-[#234331]"
                    />
                    I am the landowner or legally authorized to list this
                    property for hunting access.
                  </label>
                ) : null}

                {status === "error" ? (
                  <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    {error}
                  </p>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep("role")}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-black text-stone-700"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#234331] px-5 text-sm font-black text-white transition hover:bg-[#162d22] disabled:opacity-60"
                  >
                    <ShieldCheck size={18} aria-hidden="true" />
                    {status === "loading" ? "Saving" : "Save account setup"}
                  </button>
                </div>
              </form>
            ) : null}

            {step === "passkey" ? (
              <div className="grid min-h-[470px] content-between gap-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                    Faster sign in
                  </p>
                  <h2 className="mt-3 text-3xl font-black leading-tight text-stone-950">
                    Add a passkey now or continue without one.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-stone-600">
                    Passkeys are optional, but they make the dashboard feel much
                    more like a modern SaaS workspace on mobile.
                  </p>
                </div>
                <PasskeyRegistrationCard email={email} />
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep("done")}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-black text-stone-700"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("done")}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#183326] px-5 text-sm font-black text-white"
                  >
                    Continue
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}

            {step === "done" ? (
              <div className="grid min-h-[470px] content-between gap-6">
                <div>
                  <BadgeCheck className="size-9 text-[#234331]" aria-hidden="true" />
                  <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                    Setup saved
                  </p>
                  <h2 className="mt-3 text-3xl font-black leading-tight text-stone-950">
                    Your dashboard is ready for the first real step.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
                    The checklist in your dashboard will now guide you through
                    the next action: hunters start with a request, landowners
                    start with a listing and payout readiness.
                  </p>
                </div>
                <div className="rounded-md border border-[#234331]/10 bg-[#eef3ec] p-4">
                  <p className="text-sm font-black text-[#183326]">
                    Next for {activeRole.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-700">
                    {role === "hunter"
                      ? "Search leases in the backend, open a property, and start your first access request."
                      : "Create the first land listing, then connect Stripe payouts before a signed contract can be paid."}
                  </p>
                </div>
                <Link
                  href={activeRole.dashboardHref}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#183326] px-5 text-sm font-black text-white shadow-[0_18px_44px_rgba(24,51,38,0.2)] transition hover:bg-[#10271d] sm:w-auto"
                >
                  {activeRole.nextLabel}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </section>
  );
}
