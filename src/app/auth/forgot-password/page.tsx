import Image from "next/image";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { pageMetadata } from "@/lib/seo/site";

const authImage = "/images/hunting-lease-forest-bear-hero.png";

export const metadata = pageMetadata({
  title: "Reset your password",
  description:
    "Request a secure Huntfields password reset link for your hunting lease marketplace account.",
  path: "/auth/forgot-password",
  image: authImage,
  index: false,
});

export default function ForgotPasswordPage() {
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
            Account recovery
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-normal text-stone-950">
            Reset your password.
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Enter your account email and we will send a secure link to create a
            new password.
          </p>
          <div className="mt-6">
            <ForgotPasswordForm />
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
