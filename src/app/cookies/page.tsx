import { Cookie, Settings, ShieldCheck } from "lucide-react";
import { CookieSettingsButton } from "@/components/privacy/cookie-consent";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Cookie Policy",
  description:
    "Learn how Huntfields uses necessary cookies, optional analytics cookies, marketing consent, and Google Consent Mode-ready preferences.",
  path: "/cookies",
});

const updatedAt = "June 18, 2026";

const categories = [
  {
    title: "Necessary cookies",
    status: "Always on",
    body: "Required for security, authentication, cookie preferences, account sessions, marketplace workflows, and basic site operation.",
  },
  {
    title: "Analytics cookies",
    status: "Optional",
    body: "May be used later to understand page performance, search behavior, conversion paths, and marketplace reliability. These are disabled unless you consent.",
  },
  {
    title: "Marketing cookies",
    status: "Optional",
    body: "May be used later for advertising measurement, remarketing, or campaign optimization. These are disabled unless you consent.",
  },
  {
    title: "Map and media requests",
    status: "Service-dependent",
    body: "Map tiles, generated images, storage assets, and embedded media may require requests to service providers. These are used to deliver core product functionality.",
  },
];

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-5xl px-3 py-10 sm:px-6 sm:py-14 lg:px-8">
      <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_50px_rgba(25,35,29,0.08)] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
          Privacy choices
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-stone-950 sm:text-5xl">
          Cookie Policy
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
          This Cookie Policy explains how Huntfields uses cookies and similar
          technologies. Last updated: {updatedAt}.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [Cookie, "Necessary cookies run the site"],
            [ShieldCheck, "Optional tracking starts denied"],
            [Settings, "You can change choices"],
          ].map(([Icon, label]) => {
            const IconComponent = Icon as typeof Cookie;
            return (
              <div
                key={String(label)}
                className="rounded-md border border-[#234331]/10 bg-[#f8f4eb] p-3"
              >
                <IconComponent className="size-5 text-[#234331]" aria-hidden="true" />
                <p className="mt-3 text-sm font-black text-stone-900">
                  {String(label)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-4">
        {categories.map((category) => (
          <article
            key={category.title}
            className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_14px_36px_rgba(25,35,29,0.06)] sm:p-6"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-black text-stone-950">
                {category.title}
              </h2>
              <span className="w-fit rounded-md bg-[#eef3ec] px-2.5 py-1 text-xs font-black text-[#234331]">
                {category.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              {category.body}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-lg border border-[#234331]/10 bg-[#183326] p-5 text-white shadow-[0_18px_50px_rgba(25,35,29,0.12)] sm:p-6">
        <h2 className="text-2xl font-black">Google Consent Mode readiness</h2>
        <p className="mt-2 text-sm leading-7 text-white/72">
          Huntfields initializes optional Google consent categories as denied
          before any future Google tag is loaded. If you accept or customize
          cookies, the site updates consent for analytics storage, ad storage,
          ad user data, and ad personalization.
        </p>
        <CookieSettingsButton className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-black text-[#183326] transition hover:bg-[#f7f3ea]">
          Open cookie settings
        </CookieSettingsButton>
      </section>
    </main>
  );
}
