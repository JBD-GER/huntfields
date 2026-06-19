import { redirect } from "next/navigation";
import { ProfileOnboardingForm } from "@/components/forms/profile-onboarding-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Account onboarding",
  description:
    "Set up a Huntfields account, choose hunter or landowner mode, and add a passkey after your first sign-in.",
  path: "/onboarding",
  index: false,
});

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">
          Supabase required
        </h1>
        <p className="mt-3 text-stone-600">
          Configure Supabase to complete onboarding.
        </p>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/onboarding");
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
      <aside>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c76b2f]">
          Account onboarding
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-stone-950">
          Set up the account once, then follow the right workflow.
        </h1>
        <p className="mt-4 text-base leading-7 text-stone-600">
          Hunters become request-ready with compliance details and digital
          signatures. Landowners can submit land, review chat requests, propose
          final terms, and later receive payouts through Stripe Connect.
        </p>
        <div className="mt-5 rounded-md border border-[#d9c6aa] bg-[#fff9ef] p-4 text-sm leading-6 text-stone-700">
          Passkeys are optional. Add one after saving your account setup, then
          use passkey sign-in on future visits.
        </div>
      </aside>
      <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_16px_46px_rgba(25,35,29,0.08)] sm:p-6">
        <ProfileOnboardingForm email={user.email} />
      </section>
    </div>
  );
}
