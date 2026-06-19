import Link from "next/link";
import { LockKeyhole, Mail, MapPinned, ShieldCheck } from "lucide-react";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "Learn how Huntfields collects, uses, protects, and shares personal information for hunting lease search, landowner listings, requests, maps, emails, and account workflows.",
  path: "/privacy",
});

const updatedAt = "June 18, 2026";

const sections = [
  {
    title: "Information we collect",
    body: [
      "Account details such as name, email address, phone number, role, address, onboarding status, and communication preferences.",
      "Marketplace activity such as listings, saved searches, favorites, requests, bookings, messages, approvals, signatures, and admin review records.",
      "Land listing data such as approximate public location, owner-drawn boundaries, acreage, wildlife, amenities, rules, private access notes, generated descriptions, and listing images.",
      "Verification records such as property proof, identity-check status, insurance policy details, uploaded documents, and review notes where those features are enabled.",
      "Technical data such as IP address, device/browser information, timestamps, security logs, cookie preferences, and analytics data if you consent to analytics cookies.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "Operate accounts, authentication, onboarding, listing submission, map search, requests, messaging, booking workflows, and electronic agreement features.",
      "Protect landowner privacy by showing approximate public map information while keeping exact gates, routes, private addresses, and precise boundary details approval-gated.",
      "Send transactional emails such as signup confirmations, listing review updates, hunter requests, owner responses, booking updates, contract notifications, and contact-form replies.",
      "Generate optional listing content such as regional cover images or owner-editable descriptions when a landowner actively uses AI-supported tools.",
      "Improve reliability, safety, fraud prevention, compliance workflows, SEO pages, and marketplace performance.",
    ],
  },
  {
    title: "Service providers",
    body: [
      "Supabase provides authentication, PostgreSQL database, storage, geospatial data, and row-level security infrastructure.",
      "Resend provides transactional email delivery.",
      "OpenAI may process listing context when optional AI description or image generation tools are used.",
      "Map providers such as MapLibre-compatible tile providers or Mapbox/MapTiler may receive map tile requests and related technical data.",
      "Stripe or another payment provider may be used later for payments, identity, or billing workflows.",
      "Vercel hosts the application and may process technical logs required to operate the website.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can create a free account, update profile information, choose whether to list as a hunter or landowner, and control optional cookie consent.",
      "You can reject optional analytics and marketing cookies. Necessary cookies are used to run security, authentication, and marketplace functions.",
      "You can contact us to request access, correction, deletion, or export of personal information, subject to legal, security, and marketplace recordkeeping limits.",
      "Landowners can choose what to submit publicly, but exact private access details should only be shared through approved workflows.",
    ],
  },
  {
    title: "Data retention and security",
    body: [
      "We keep information for as long as needed to operate the marketplace, satisfy legal or security requirements, resolve disputes, prevent abuse, and maintain transaction or agreement records.",
      "We use technical and organizational safeguards such as authenticated access, storage controls, row-level security patterns, private buckets for verification documents, and limited service-role use.",
      "No online service can guarantee perfect security. Users should avoid sending unnecessary sensitive information in messages.",
    ],
  },
  {
    title: "Children and eligibility",
    body: [
      "Huntfields is not intended for children. Hunting access, contracts, verification, and payments may require legal capacity and compliance with federal, state, and local requirements.",
      "Users are responsible for complying with applicable hunting licenses, permits, tags, firearm rules, hunter education rules, private land permission rules, insurance requirements, and landowner terms.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-5xl px-3 py-10 sm:px-6 sm:py-14 lg:px-8">
      <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_50px_rgba(25,35,29,0.08)] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
          Legal
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-stone-950 sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
          This Privacy Policy explains how Huntfields handles information for
          hunters, landowners, marketplace visitors, and account users. Last
          updated: {updatedAt}.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [LockKeyhole, "Exact locations stay gated"],
            [MapPinned, "Public maps are approximate"],
            [ShieldCheck, "Consent-based optional cookies"],
          ].map(([Icon, label]) => {
            const IconComponent = Icon as typeof LockKeyhole;
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
        <Mail className="size-5 text-[#d99a61]" aria-hidden="true" />
        <h2 className="mt-3 text-2xl font-black">Contact</h2>
        <p className="mt-2 text-sm leading-7 text-white/72">
          Huntfields is operated by Flaaq Holding GmbH, Großer Kamp 5a, 31633
          Leese, Germany. For privacy requests, contact{" "}
          <a href="mailto:ops@huntfields.com" className="font-black text-white">
            ops@huntfields.com
          </a>
          . You can also use the{" "}
          <Link href="/contact" className="font-black text-white underline">
            contact form
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
