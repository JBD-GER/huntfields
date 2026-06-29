import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  DollarSign,
  FileText,
  MapPinned,
  ShieldCheck,
  Trees,
} from "lucide-react";
import { LeasePricingCalculator } from "@/components/forms/lease-pricing-calculator";
import {
  absoluteUrl,
  breadcrumbStructuredData,
  pageMetadata,
} from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Hunting Lease Pricing Calculator | Free Landowner Estimate",
  description:
    "Use the free hunting lease pricing calculator to estimate land lease value by acreage, habitat, wildlife, access, demand, amenities, risk, and listing readiness.",
  path: "/lease-pricing-calculator",
  image: "/images/guides/hunting-lease-income-landowner-guide.jpg",
});

const seoSections = [
  {
    kicker: "Lease value inputs",
    title: "Hunting lease pricing depends on more than acreage.",
    body: "Acreage matters, but hunting lease value usually comes from the mix of huntable habitat, species demand, access quality, privacy, proof, and how confidently a landowner can explain the rules. A smaller property with water, documented whitetail movement, secure parking, and clear written terms can price better than larger acreage with weak proof and unclear access.",
    image: "/images/guides/hunting-lease-income-landowner-guide.jpg",
    alt: "Private hunting land with timber habitat used to estimate hunting lease income",
    points: [
      "Huntable acres and usable habitat shape the baseline.",
      "Wildlife proof improves confidence in the asking range.",
      "Access, parking, gates, and roads reduce uncertainty for hunters.",
    ],
  },
  {
    kicker: "Wildlife and demand",
    title: "Species mix and local demand move the price range.",
    body: "Hunters compare leases by the quality of the opportunity. Whitetail, turkey, mule deer, elk, waterfowl, upland birds, hog, and predator access all create different demand signals. The same property can also price differently depending on whether it is remote, near a regional drive market, close to a metro area, or a destination hunting region.",
    image: "/images/listings/texas-panhandle-mule-deer-quail-lease.jpg",
    alt: "Open ranch country used for hunting lease price comparison",
    points: [
      "High-demand species can support a stronger target ask.",
      "Multi-species access helps owners explain year-round value.",
      "Nearby hunter demand can matter as much as raw acreage.",
    ],
  },
  {
    kicker: "Listing readiness",
    title: "A stronger listing can make the estimate easier to defend.",
    body: "A hunting lease price is easier to hold when the listing answers the questions serious hunters already have: where the huntable area is, what proof exists, what rules apply, how many hunters are allowed, what access is included, and which parts of the property stay private until approval.",
    image: "/images/guides/advertise-hunting-land-for-lease-owner-guide.jpg",
    alt: "Landowner preparing a private hunting lease listing",
    points: [
      "Mapped boundaries and habitat photos raise trust.",
      "Written rules reduce back-and-forth before a request.",
      "A PDF report helps owners compare pricing scenarios before listing.",
    ],
  },
];

const faqItems = [
  {
    question: "How much should I charge for a hunting lease?",
    answer:
      "A hunting lease price should reflect huntable acreage, species, habitat quality, access, exclusivity, local demand, amenities, risk, and proof. The calculator creates a directional range, target ask, deposit, and per-acre view so landowners can compare scenarios before publishing a listing.",
  },
  {
    question: "Is hunting lease price always based on acres?",
    answer:
      "No. Acreage creates the baseline, but wildlife proof, water, crop edges, timber, access roads, secure parking, lodging, stands, low hunting pressure, and clear rules can move the price up or down.",
  },
  {
    question: "Why does listing readiness affect hunting lease value?",
    answer:
      "Hunters are more likely to pay a fair price when the opportunity is clear. Photos, mapped huntable areas, wildlife proof, written rules, and a privacy-safe approval workflow reduce uncertainty and make the asking price easier to defend.",
  },
  {
    question: "Does the PDF report replace an appraisal or legal advice?",
    answer:
      "No. The PDF is a planning report for lease positioning. Final terms should reflect local law, season dates, property condition, liability planning, tax questions, and professional guidance where needed.",
  },
  {
    question: "What is a good price per acre for a deer lease?",
    answer:
      "A deer lease price per acre depends on the state, huntable acres, deer sign, harvest history, food, water, cover, access, hunting pressure, and exclusivity. A per-acre number is useful, but the strongest pricing decision also considers the lease product, party size, and how much proof the landowner can show.",
  },
  {
    question: "Should I price a hunting lease by day, weekend, season, or year?",
    answer:
      "Day and weekend access can work for smaller parcels, travel hunters, and limited windows. Season and annual leases usually fit properties with stronger wildlife proof, better access, and landowners who want fewer turnovers. The calculator lets owners compare these lease products before deciding.",
  },
  {
    question: "Can amenities increase hunting lease value?",
    answer:
      "Yes. Lodging, blinds, stands, food plots, water, secure parking, road access, trail networks, and owner check-in can reduce uncertainty and improve perceived value. Amenities matter most when they are clearly described and tied to real hunting access.",
  },
  {
    question: "Why should exact boundaries stay private before approval?",
    answer:
      "Landowners often need to protect gates, homes, livestock areas, neighbors, access roads, and sensitive property lines. A privacy-safe listing can explain the opportunity while saving exact boundaries and arrival details for approved hunters.",
  },
];

const leaseTypeBlocks = [
  {
    title: "Deer lease pricing",
    body: "Whitetail and mule deer leases often price around proof, pressure, habitat edges, water, food sources, and whether the hunter gets exclusive or limited-party access. Trail camera history, rub lines, bedding cover, crop edges, and harvest history make the asking range easier to defend.",
  },
  {
    title: "Turkey and spring access",
    body: "Turkey leases can be priced as seasonal access, weekend windows, or add-on value for a larger deer lease. Roost areas, creek bottoms, open fields, low disturbance, and documented gobbler activity can change how hunters compare one property against another.",
  },
  {
    title: "Waterfowl lease estimates",
    body: "Waterfowl pricing depends on water control, flyway position, crop proximity, blind setup, pressure management, access roads, and how predictable the hunting window is. A property with strong water and managed pressure can justify a different structure than broad acreage alone.",
  },
  {
    title: "Elk, upland, hog, and predator access",
    body: "Western big game, upland birds, hogs, and predator access each carry different demand signals. The best estimate separates species demand from practical access: parking, check-in, terrain difficulty, road quality, lodging, and how many hunters the land can support.",
  },
];

const factorBlocks = [
  {
    title: "Habitat and huntable acreage",
    body: "Raw acreage can overstate value when large areas are unhuntable, heavily disturbed, or hard to access. Huntable acres, cover, food, water, travel corridors, elevation, crop edges, timber, and wetlands are more useful signals for hunters comparing leases.",
  },
  {
    title: "Proof and confidence",
    body: "Wildlife proof changes confidence. Tracks, rubs, roosts, trail camera photos, harvest records, and repeat sightings help a landowner explain the estimate without sharing sensitive coordinates publicly.",
  },
  {
    title: "Access and risk",
    body: "Gates, roads, parking, check-in rules, livestock areas, fire restrictions, weather closures, and neighboring pressure affect lease value. Clear constraints can still support a good price when they are explained before a request.",
  },
  {
    title: "Exclusivity and pressure",
    body: "Exclusive access normally supports a stronger price than shared access, but it also reduces how many hunters can use the property. Managed low-pressure access can be more valuable than open access with unclear rules.",
  },
];

const seoLinks = [
  {
    href: "/guides/hunting-lease-income-landowner-guide",
    label: "Hunting lease income guide",
  },
  {
    href: "/guides/lease-your-land-for-hunting-landowner-guide",
    label: "Lease your land for hunting",
  },
  {
    href: "/guides/advertise-hunting-land-for-lease-owner-guide",
    label: "Advertise hunting land for lease",
  },
  {
    href: "/guides/day-hunting-lease-landowner-guide",
    label: "Day hunting lease guide",
  },
  {
    href: "/land/united-states/texas",
    label: "Texas hunting leases",
  },
  {
    href: "/land/united-states/georgia",
    label: "Georgia hunting leases",
  },
  {
    href: "/land/united-states/colorado",
    label: "Colorado hunting leases",
  },
  {
    href: "/land/united-states/montana",
    label: "Montana hunting leases",
  },
];

export default function LeasePricingCalculatorPage() {
  return (
    <div className="bg-[#fbfaf6]">
      <section className="border-b border-[#234331]/10 bg-[#17251d] text-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-3 py-8 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-white/14 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/76">
              <Calculator size={16} aria-hidden="true" />
              Free landowner calculator
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[1.02] tracking-normal sm:text-5xl">
              Lease Pricing Calculator
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              Build a defensible hunting lease range from acreage, huntable
              habitat, wildlife, access, exclusivity, demand, amenities, and
              property constraints.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [ShieldCheck, "Privacy-first", "Exact boundaries can stay gated until approval."],
              [FileText, "Report-ready", "Download a PDF snapshot after name and email."],
              [Calculator, "Live range", "Change inputs and see the pricing range update."],
            ].map(([Icon, title, body]) => {
              const IconComponent = Icon as typeof Calculator;
              return (
                <div
                  key={String(title)}
                  className="rounded-md border border-white/12 bg-white/9 p-4"
                >
                  <IconComponent size={18} className="text-[#d99a61]" aria-hidden="true" />
                  <p className="mt-3 text-sm font-black">{String(title)}</p>
                  <p className="mt-1 text-sm leading-6 text-white/62">
                    {String(body)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <LeasePricingCalculator />
      </main>

      <section className="border-y border-[#234331]/10 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.74fr_1.26fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
                Hunting lease pricing guide
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal text-stone-950 sm:text-5xl">
                Estimate private hunting land value with the right signals.
              </h2>
            </div>
            <p className="text-base leading-7 text-stone-600">
              A hunting lease calculator should not treat every acre the same.
              The strongest estimates combine land size, huntable habitat,
              wildlife quality, market demand, amenities, access control,
              privacy, and the proof a landowner can show before final terms.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {[
              [DollarSign, "Price range", "Low, target, high, per-acre, and deposit guidance."],
              [Trees, "Property quality", "Habitat, water, pressure plan, and huntable acreage."],
              [MapPinned, "Access value", "Roads, gates, parking, exclusivity, and private boundaries."],
            ].map(([Icon, title, body]) => {
              const IconComponent = Icon as typeof DollarSign;
              return (
                <div
                  key={String(title)}
                  className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_14px_38px_rgba(25,35,29,0.06)]"
                >
                  <IconComponent className="size-6 text-[#2f6f8f]" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-black text-stone-950">
                    {String(title)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {String(body)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-3 sm:px-6 lg:px-8">
          {seoSections.map((section, index) => (
            <article
              key={section.title}
              className="grid gap-6 lg:grid-cols-2 lg:items-center"
            >
              <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
                  {section.kicker}
                </p>
                <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal text-stone-950 sm:text-4xl">
                  {section.title}
                </h2>
                <p className="mt-4 text-base leading-7 text-stone-600">
                  {section.body}
                </p>
                <div className="mt-5 grid gap-3">
                  {section.points.map((point) => (
                    <p
                      key={point}
                      className="flex gap-3 text-sm font-semibold leading-6 text-stone-700"
                    >
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#2f6f8f]" aria-hidden="true" />
                      {point}
                    </p>
                  ))}
                </div>
              </div>
              <div className="relative min-h-[260px] overflow-hidden rounded-lg border border-[#234331]/10 bg-stone-200 shadow-[0_22px_64px_rgba(25,35,29,0.1)] sm:min-h-[340px]">
                <Image
                  src={section.image}
                  alt={section.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#234331]/10 bg-[#17251d] py-14 text-white sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-3 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d99a61]">
              From estimate to listing
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal sm:text-4xl">
              Turn a pricing estimate into a privacy-safe hunting lease listing.
            </h2>
            <p className="mt-4 text-base leading-7 text-white/70">
              Once the price range feels right, Huntfields helps landowners
              present the opportunity without exposing exact gates, addresses,
              or sensitive boundaries to anonymous visitors.
            </p>
            <Link
              href="/list-your-land"
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-[#183326] transition hover:bg-[#f7f3ea]"
            >
              List your land
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Draw the huntable area once and keep exact boundaries private.",
              "Show species, habitat, rules, amenities, and access style clearly.",
              "Use request-first screening before sharing sensitive details.",
              "Move serious requests toward terms, signatures, and payment readiness.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-md border border-white/12 bg-white/9 p-4 text-sm font-semibold leading-6 text-white/78"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
              Lease products
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal text-stone-950 sm:text-4xl">
              Compare hunting lease value by species and access type.
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-600">
              A good hunting lease estimate should match the way hunters
              actually buy access. Deer, turkey, waterfowl, elk, upland, hog,
              and predator access all create different pricing questions.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {leaseTypeBlocks.map((block) => (
              <article
                key={block.title}
                className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_14px_38px_rgba(25,35,29,0.05)]"
              >
                <h3 className="text-xl font-black text-stone-950">
                  {block.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  {block.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#234331]/10 bg-[#f7f3ea] py-14 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-3 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
              Pricing factors
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal text-stone-950 sm:text-4xl">
              What landowners should document before setting a lease price.
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-600">
              The calculator gives a fast estimate, but the final asking price
              becomes easier to defend when the listing explains the exact
              factors hunters use to compare private hunting land.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {factorBlocks.map((block) => (
              <article
                key={block.title}
                className="rounded-lg border border-[#234331]/10 bg-white p-5 shadow-[0_14px_38px_rgba(25,35,29,0.05)]"
              >
                <h3 className="text-lg font-black text-stone-950">
                  {block.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {block.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-3 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
              Landowner resources
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal text-stone-950 sm:text-4xl">
              Keep researching hunting lease pricing and listing strategy.
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-600">
              Use the calculator as the first pass, then compare the estimate
              with landowner guides, state landing pages, and the way similar
              hunting leases are presented on Huntfields.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {seoLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-12 items-center justify-between gap-3 rounded-md border border-[#234331]/12 bg-white px-4 py-3 text-sm font-black text-stone-800 shadow-sm transition hover:border-[#234331]/35 hover:text-[#183326]"
              >
                {item.label}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
            Pricing FAQ
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-normal text-stone-950 sm:text-4xl">
            Common questions about hunting lease value.
          </h2>
          <div className="mt-8 grid gap-4">
            {faqItems.map((item) => (
              <section
                key={item.question}
                className="rounded-lg border border-[#234331]/10 bg-white p-5 shadow-[0_14px_38px_rgba(25,35,29,0.05)]"
              >
                <h3 className="text-lg font-black text-stone-950">
                  {item.question}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {item.answer}
                </p>
              </section>
            ))}
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbStructuredData([
              { name: "Home", path: "/" },
              {
                name: "Lease Pricing Calculator",
                path: "/lease-pricing-calculator",
              },
            ]),
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Huntfields Lease Pricing Calculator",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: absoluteUrl("/lease-pricing-calculator"),
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqItems.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.answer,
                },
              })),
            },
          ]),
        }}
      />
    </div>
  );
}
