import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/seo/site";

const authImage = "/images/hunting-lease-forest-bear-hero.png";

export const metadata = pageMetadata({
  title: "Set a new password",
  description:
    "Set a new password for a Huntfields hunting lease marketplace account.",
  path: "/auth/reset-password",
  image: authImage,
  index: false,
});

export default async function ResetPasswordPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/auth/login?auth_error=Supabase%20Auth%20is%20not%20configured.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/auth/login?auth_error=Open%20the%20latest%20password%20reset%20link%20from%20your%20email.",
    );
  }

  return (
    <main className="relative min-h-[calc(100svh-3.5rem)] overflow-hidden bg-[#101b15]">
      <Image
        src={authImage}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,18,13,0.9),rgba(10,18,13,0.68)_52%,rgba(10,18,13,0.36)),linear-gradient(180deg,rgba(10,18,13,0.08),rgba(10,18,13,0.86))]" />

      <div className="relative mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-6xl items-center px-3 py-8 sm:px-6 lg:px-8">
        <section className="ml-auto w-full max-w-md rounded-lg border border-white/14 bg-[#fffdf7]/96 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
            Secure reset
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-normal text-stone-950">
            Create a new password.
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Use at least 8 characters. After saving, you will return to the
            login screen.
          </p>
          <div className="mt-6">
            <ResetPasswordForm />
          </div>
          <Link
            href="/auth/login"
            className="mt-5 inline-flex text-sm font-black text-[#234331] hover:underline"
          >
            Back to login
          </Link>
        </section>
      </div>
    </main>
  );
}
