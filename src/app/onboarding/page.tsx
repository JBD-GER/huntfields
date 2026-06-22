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
      <div className="grid min-h-dvh place-items-center bg-[#f4efe5] px-4">
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

  return <ProfileOnboardingForm email={user.email} />;
}
