import Image from "next/image";
import { BadgeCheck, LockKeyhole, MapPinned, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/forms/login-form";
import { pageMetadata } from "@/lib/seo/site";

const authImage = "/images/hunting-lease-forest-bear-hero.png";

export const metadata = pageMetadata({
  title: "Sign in or sign up for free",
  description:
    "Create a free Huntfields account to message landowners, save hunting leases, request access, or list private hunting land.",
  path: "/auth/login",
  image: authImage,
  index: false,
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/dashboard";

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
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,18,13,0.9),rgba(10,18,13,0.7)_46%,rgba(10,18,13,0.24)),linear-gradient(180deg,rgba(10,18,13,0.1),rgba(10,18,13,0.86))]" />

      <div className="relative mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-7xl gap-6 px-3 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
        <section className="flex flex-col justify-end text-white lg:min-h-[620px]">
          <p className="inline-flex w-fit items-center gap-2 rounded-md border border-white/14 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/78 backdrop-blur">
            <ShieldCheck size={15} aria-hidden="true" />
            100% free to start
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.98] tracking-normal sm:text-6xl">
            One free account for hunters and landowners.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/78 sm:text-lg sm:leading-8">
            Message landowners, request hunting access, save leases, or start
            listing land. Exact gates and private boundaries stay protected
            until a landowner approves the next step.
          </p>
          <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
            {[
              [MapPinned, "Find matching leases"],
              [LockKeyhole, "Private details stay gated"],
              [BadgeCheck, "Serious request workflow"],
            ].map(([Icon, label]) => {
              const IconComponent = Icon as typeof MapPinned;
              return (
                <div
                  key={String(label)}
                  className="rounded-md border border-white/12 bg-white/10 p-3 backdrop-blur"
                >
                  <IconComponent className="size-5 text-[#d99a61]" aria-hidden="true" />
                  <p className="mt-3 text-sm font-black leading-5">
                    {String(label)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-white/14 bg-[#fffdf7]/96 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6 lg:ml-auto lg:w-full lg:max-w-md">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
            Secure account
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-normal text-stone-950">
            Login or create an account.
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Choose how you want to continue with your free Huntfields account.
          </p>
          <div className="mt-5 rounded-md border border-[#234331]/10 bg-[#f6f2e9] p-3 text-sm font-semibold leading-6 text-stone-700">
            Default is login. Switch to create an account only if you are new.
            Google, SAML 2.0, and classic email/password are supported.
          </div>
          <div className="mt-6">
            <LoginForm
              authError={
                typeof params.auth_error === "string"
                  ? params.auth_error
                  : null
              }
              initialMode={params.mode === "register" ? "register" : "login"}
              nextPath={next}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
