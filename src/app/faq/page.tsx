import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CircleHelp,
  LockKeyhole,
  MapPinned,
  ShieldCheck,
} from "lucide-react";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Huntfields FAQ | Hunting Lease Questions for Hunters and Landowners",
  description:
    "Answers about hunting leases, private land access, landowner listings, approximate public maps, account privacy, requests, and approval-gated boundaries.",
  path: "/faq",
});

const hunterFaq = [
  [
    "Is Huntfields free for hunters to start?",
    "Yes. Creating an account is free. You can browse listings, review public details, and start a request without paying upfront.",
  ],
  [
    "Why do I only see a general map area before signing up?",
    "Private hunting land is sensitive. Public visitors see enough location context to judge fit, but exact shapes, gates, access roads, and owner instructions stay protected.",
  ],
  [
    "What changes after I create an account?",
    "A registered hunter can see richer listing context, send a message to the landowner, and begin the request workflow. Exact access still depends on landowner approval.",
  ],
  [
    "Why are price and acreage shown as ranges publicly?",
    "Ranges help you understand whether a lease is likely a fit without exposing exact business terms or property details to anonymous visitors.",
  ],
  [
    "What should I include in my first request?",
    "Mention preferred dates, species, hunting method, party size, experience level, and anything that helps the owner understand you are serious and respectful.",
  ],
  [
    "Do I need insurance or license details?",
    "Some owners may ask for license, hunter education, insurance, identity, or liability information before approving access. Requirements can vary by state and property.",
  ],
  [
    "Can I book instantly?",
    "The MVP is request-first. Landowners review hunters before exact access or booking terms move forward. This is intentional for safety and trust.",
  ],
  [
    "When do I see the exact boundary?",
    "Exact boundary and access instructions are released only after the landowner approves the request or a booking/contract step is completed.",
  ],
] as const;

const ownerFaq = [
  [
    "Is listing land free to start?",
    "Yes. You can create a landowner account and begin the listing workflow for free. Payments can be added later when the booking flow is ready.",
  ],
  [
    "Do I need a normal street address for a hunting property?",
    "No. Many woods, ranches, farms, and timber blocks do not have a useful house number. You can draw the huntable area and provide nearest-town context.",
  ],
  [
    "Will the public see my exact property boundary?",
    "No. Public visitors see a general location and broad ranges. Registered users may see richer previews, but exact gates, routes, and private access details stay approval-gated.",
  ],
  [
    "Can I approve or reject hunters?",
    "Yes. Huntfields is built around a request-first workflow so you can review the person, timing, party size, and intent before sharing sensitive information.",
  ],
  [
    "What should I include in my listing?",
    "Include habitat, general region, available dates, species, access style, allowed methods, guest policy, vehicle rules, emergency contact expectations, and anything that prevents confusion.",
  ],
  [
    "Can I require documents from hunters?",
    "The platform is prepared for insurance documents, identity checks, license details, and owner-specific requirements. The first MVP keeps that workflow practical and review-based.",
  ],
  [
    "Can I draw an irregular hunting area?",
    "Yes. The owner map tool supports drawn polygon areas with editable points, so you can represent timber blocks, fields, draws, creek corridors, and non-rectangular shapes.",
  ],
  [
    "Can I list multiple properties?",
    "Yes. The data model supports multiple listings per owner, each with its own map area, rules, wildlife, price, dates, and request workflow.",
  ],
] as const;

const generalFaq = [
  [
    "What is a hunting lease?",
    "A hunting lease is an agreement where a landowner grants a hunter or hunting party access to private land for defined dates, species, rules, and terms.",
  ],
  [
    "Why does Huntfields focus on the United States first?",
    "The first market is the US because state-based search, private land access, hunting leases, and landowner approval workflows fit the initial product best.",
  ],
  [
    "Does Huntfields replace state hunting laws?",
    "No. Hunters and landowners remain responsible for license, season, species, firearm, insurance, access, and reporting rules in the relevant state.",
  ],
  [
    "Will Stripe payments be required for MVP listings?",
    "No. The MVP is Stripe-ready but does not require live Stripe keys. Booking and payment collection can be enabled later.",
  ],
] as const;

function FaqGrid({
  items,
  dark = false,
}: {
  items: readonly (readonly [string, string])[];
  dark?: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(([question, answer]) => (
        <article
          key={question}
          className={[
            "rounded-lg border p-5 shadow-[0_14px_36px_rgba(25,35,29,0.06)]",
            dark
              ? "border-white/12 bg-white/9 text-white"
              : "border-[#234331]/10 bg-[#fffdf7] text-stone-950",
          ].join(" ")}
        >
          <h3 className="text-base font-black leading-6">{question}</h3>
          <p
            className={[
              "mt-2 text-sm leading-6",
              dark ? "text-white/68" : "text-stone-600",
            ].join(" ")}
          >
            {answer}
          </p>
        </article>
      ))}
    </div>
  );
}

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...hunterFaq, ...ownerFaq, ...generalFaq].map(
      ([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
        },
      }),
    ),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="relative overflow-hidden bg-[#101b15] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(217,154,97,0.3),transparent_28%),radial-gradient(circle_at_86%_14%,rgba(47,111,143,0.24),transparent_34%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-6 px-3 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-white/14 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/76">
              <CircleHelp size={15} aria-hidden="true" />
              Hunting lease FAQ
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.98] tracking-normal sm:text-6xl">
              Questions for hunters and landowners.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/72 sm:text-lg sm:leading-8">
              Learn how Huntfields protects private land details, why requests
              start with messaging, what registered users can see, and how
              landowners stay in control.
            </p>
          </div>
          <div className="grid gap-3 self-end rounded-lg border border-white/12 bg-white/10 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-5">
            {[
              [MapPinned, "Browse leases by state"],
              [LockKeyhole, "Keep exact property details gated"],
              [BadgeCheck, "Use an approval-first request flow"],
            ].map(([Icon, text]) => {
              const IconComponent = Icon as typeof MapPinned;
              return (
                <div
                  key={String(text)}
                  className="flex items-center gap-3 rounded-md border border-white/12 bg-white/9 p-3 text-sm font-black"
                >
                  <span className="grid size-9 place-items-center rounded-md bg-white text-[#183326]">
                    <IconComponent size={17} aria-hidden="true" />
                  </span>
                  {String(text)}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-3 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                For hunters
              </p>
              <h2 className="mt-2 text-3xl font-black text-stone-950">
                Finding and requesting hunting leases
              </h2>
            </div>
            <Link
              href="/land"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#183326] px-4 text-sm font-black text-white shadow-[0_16px_36px_rgba(24,51,38,0.18)]"
            >
              Search leases
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <FaqGrid items={hunterFaq} />
        </section>

        <section className="rounded-lg bg-[#18261e] p-5 text-white shadow-[0_24px_70px_rgba(25,35,29,0.14)] sm:p-7">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d99a61]">
                For landowners
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Listing private land safely
              </h2>
            </div>
            <Link
              href="/list-your-land"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-black text-[#183326]"
            >
              List your land
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <FaqGrid items={ownerFaq} dark />
        </section>

        <section>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
              General
            </p>
            <h2 className="mt-2 text-3xl font-black text-stone-950">
              Hunting lease basics
            </h2>
          </div>
          <FaqGrid items={generalFaq} />
        </section>

        <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_48px_rgba(25,35,29,0.07)] sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <ShieldCheck className="size-6 text-[#c76b2f]" aria-hidden="true" />
              <h2 className="mt-3 text-3xl font-black text-stone-950">
                Still deciding where to start?
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">
                Hunters usually start with state and acreage filters. Landowners
                usually start by drawing the huntable area and describing rules.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/land"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#234331]/14 bg-white px-4 text-sm font-black text-[#183326]"
              >
                Find hunting leases
              </Link>
              <Link
                href="/list-your-land"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#183326] px-4 text-sm font-black text-white"
              >
                List land
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
