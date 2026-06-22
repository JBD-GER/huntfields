import { HunterOnboardingForm } from "@/components/forms/hunter-onboarding-form";
import { getUsStateRules } from "@/lib/compliance/us-state-rules";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Hunter registration and compliance",
  description:
    "Complete hunter onboarding for US hunting land access, state attestations, license details, and electronic lease signing.",
  path: "/onboarding/hunter",
  index: false,
});

export default async function HunterOnboardingPage() {
  const stateRules = await getUsStateRules();

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-4 shadow-[0_22px_70px_rgba(25,35,29,0.10)] sm:p-6">
        <div className="mb-5 rounded-md border border-[#234331]/10 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
            Hunter verification
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-normal text-stone-950 sm:text-3xl">
            Get request-ready
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Huntfields reuses your account onboarding details. Add only the
            hunter-specific minimum: birth date, primary hunting state,
            license or education path, optional proof documents, and electronic
            signing consent.
          </p>
        </div>
        <HunterOnboardingForm stateRules={stateRules} />
      </section>
    </div>
  );
}
