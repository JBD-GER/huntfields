import { HunterOnboardingForm } from "@/components/forms/hunter-onboarding-form";
import { StateRulePanel } from "@/components/compliance/state-rule-panel";
import { getUsStateRules } from "@/lib/compliance/us-state-rules";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Hunter registration and compliance",
  description:
    "Complete hunter onboarding for US hunting land access, state attestations, license details, and electronic lease signing.",
  path: "/onboarding/hunter",
});

export default async function HunterOnboardingPage() {
  const stateRules = await getUsStateRules();

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
      <aside className="grid content-start gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c76b2f]">
            Hunter onboarding
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-normal text-stone-950">
            Get request-ready before you message a landowner.
          </h1>
          <p className="mt-4 text-base leading-7 text-stone-600">
            Start with the US market. Huntfields collects the core information
            needed for state-aware access requests and electronic lease signing.
          </p>
        </div>
        {stateRules[0] && <StateRulePanel rule={stateRules[0]} title="First market" />}
      </aside>
      <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
        <HunterOnboardingForm stateRules={stateRules} />
      </section>
    </div>
  );
}
