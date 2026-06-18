import Link from "next/link";
import { AlertTriangle, FileSignature, ShieldCheck } from "lucide-react";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "Read the Huntfields Terms of Service for hunting lease search, landowner listings, requests, bookings, messages, verification, and electronic agreements.",
  path: "/terms",
});

const updatedAt = "June 18, 2026";

const sections = [
  {
    title: "Using Huntfields",
    body: [
      "Huntfields provides marketplace software for discovering hunting leases, listing private land access, sending requests, messaging, managing approvals, and preparing access terms.",
      "Creating an account is free. Future payment, subscription, or booking fees may be introduced with clear pricing and checkout terms before payment is collected.",
      "You must provide accurate information, keep your account secure, and use the platform only for lawful hunting access, landowner listing, or marketplace operations.",
    ],
  },
  {
    title: "Hunters",
    body: [
      "Hunters are responsible for required licenses, permits, tags, hunter education, firearm or archery rules, season dates, bag limits, harvest reporting, insurance, and private land permission.",
      "A listing request does not grant access. Access begins only when the landowner approves and any required terms, signatures, payment steps, and check-in instructions are complete.",
      "Hunters must respect gates, livestock, neighbors, roads, closed areas, posted rules, guest limits, vehicle policies, and all landowner instructions.",
    ],
  },
  {
    title: "Landowners",
    body: [
      "Landowners must have legal authority to offer hunting access for the property or access area they list.",
      "Landowners are responsible for accurate listing information, property boundaries, rules, access instructions, ownership or authorization proof, lease-license requirements where applicable, and safety expectations.",
      "Huntfields may review, reject, edit, suspend, or remove listings that appear inaccurate, unsafe, unlawful, misleading, or inconsistent with marketplace standards.",
    ],
  },
  {
    title: "Maps, location privacy, and listing content",
    body: [
      "Public map information is approximate by design. Exact coordinates, gates, routes, private addresses, and precise drawn boundaries may be approval-gated.",
      "Generated descriptions or images are optional tools. Landowners remain responsible for reviewing and correcting all listing content before submission.",
      "You may not upload content that infringes rights, exposes private information without permission, encourages illegal hunting, or misrepresents land access.",
    ],
  },
  {
    title: "Requests, bookings, and agreements",
    body: [
      "Messages, approvals, bookings, generated agreements, and signatures are tools to help document access. They do not replace professional legal, insurance, tax, or regulatory advice.",
      "A landowner may approve, reject, cancel, or condition access based on availability, verification, safety, compliance, or fit.",
      "Electronic signatures and records may be used where supported. Users must review agreement text before signing.",
    ],
  },
  {
    title: "No guarantee",
    body: [
      "Huntfields does not guarantee wildlife presence, harvest success, property conditions, availability, safety, legal compliance by other users, or suitability for a particular hunt.",
      "Users should verify current agency rules, private land permission, weather, road access, emergency plans, and property-specific risks before hunting.",
    ],
  },
  {
    title: "Limitation and changes",
    body: [
      "The marketplace is provided on an as-available basis. To the fullest extent permitted by law, Huntfields is not liable for indirect, incidental, consequential, special, punitive, or lost-profit damages.",
      "We may update these Terms as the product, legal requirements, payment features, verification workflows, or marketplace policies evolve.",
      "If a future paid launch requires additional jurisdiction-specific terms, payment terms, cancellation terms, or operator details, those terms will be presented before paid use.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-5xl px-3 py-10 sm:px-6 sm:py-14 lg:px-8">
      <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_50px_rgba(25,35,29,0.08)] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
          Legal
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-stone-950 sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
          These Terms govern use of Huntfields by hunters, landowners, account
          users, and marketplace visitors. Last updated: {updatedAt}.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [ShieldCheck, "Approval-first access"],
            [FileSignature, "Agreement-ready workflow"],
            [AlertTriangle, "No hunting-success guarantee"],
          ].map(([Icon, label]) => {
            const IconComponent = Icon as typeof ShieldCheck;
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
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_14px_36px_rgba(25,35,29,0.06)] sm:p-6"
          >
            <h2 className="text-2xl font-black text-stone-950">
              {section.title}
            </h2>
            <ul className="mt-4 grid gap-3 text-sm leading-7 text-stone-600">
              {section.body.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#c76b2f]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-lg border border-[#234331]/10 bg-[#183326] p-5 text-white shadow-[0_18px_50px_rgba(25,35,29,0.12)] sm:p-6">
        <h2 className="text-2xl font-black">Questions about these terms?</h2>
        <p className="mt-2 text-sm leading-7 text-white/72">
          Contact{" "}
          <a href="mailto:ops@huntfields.com" className="font-black text-white">
            ops@huntfields.com
          </a>{" "}
          or use the{" "}
          <Link href="/contact" className="font-black text-white underline">
            contact form
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
