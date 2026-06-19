import { BadgeCheck, ShieldCheck } from "lucide-react";

export default function HunterOnboardingLoading() {
  return (
    <main className="mx-auto max-w-4xl px-3 py-8 sm:px-6 sm:py-12 lg:px-8">
      <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_50px_rgba(25,35,29,0.08)] sm:p-8">
        <div className="huntfields-app-loader grid size-14 place-items-center rounded-md bg-[#183326] text-white">
          <BadgeCheck size={24} aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
          Hunter onboarding
        </p>
        <h1 className="mt-3 text-3xl font-black text-stone-950">
          Preparing your access profile
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-stone-600">
          Loading compliance questions, account details, and request readiness.
        </p>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-[#e8e1d4]">
          <div className="huntfields-route-loading-bar h-full w-1/2 bg-[#183326]" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Identity", "License details", "Rules acknowledgement"].map((item) => (
            <span
              key={item}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#234331]/10 bg-[#f6f2e9] px-3 text-sm font-black text-stone-800"
            >
              <ShieldCheck size={15} aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
