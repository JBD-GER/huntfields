import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileSignature,
  MapPinned,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LandownerOnboardingForm } from "@/components/forms/landowner-onboarding-form";
import { ListingSubmissionForm } from "@/components/forms/listing-submission-form";
import { getListingTypes } from "@/lib/data/listings";
import { getUsStateRules } from "@/lib/compliance/us-state-rules";
import { pageMetadata } from "@/lib/seo/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = pageMetadata({
  title: "List Your Hunting Land | Lease Private Land to Hunters",
  description:
    "Create a landowner account, draw huntable boundaries, keep exact locations private, review hunter requests, and prepare hunting lease agreements.",
  path: "/list-your-land",
});

export default async function ListYourLandPage() {
  const supabase = await createSupabaseServerClient();
  const userResult = supabase ? await supabase.auth.getUser() : null;
  const user = userResult?.data.user ?? null;

  const { data: profile } = user
    ? await supabase!
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const canListLand =
    profile?.role === "landowner" && profile.onboarding_completed;

  const listingTypes = canListLand
    ? await getListingTypes()
    : { data: [], error: null };
  const stateRules = canListLand ? await getUsStateRules() : [];

  return (
    <div>
      <section className="relative overflow-hidden bg-[#101b15] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(217,154,97,0.28),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(47,111,143,0.22),transparent_32%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-3 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 lg:py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-white/14 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/76">
              <ShieldCheck size={15} aria-hidden="true" />
              For landowners
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.98] tracking-normal sm:text-6xl">
              List hunting land without exposing your exact property.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/72 sm:text-lg sm:leading-8">
              Draw the huntable area, set rules, review hunter messages, and
              keep gates, addresses, and exact boundaries private until you
              approve access.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={user ? "#submit-land" : "/auth/login?next=/list-your-land"}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-[#183326] shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition hover:bg-[#f7f3ea]"
              >
                {user ? "Continue setup" : "Create a free landowner account"}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                href="/land"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/18 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/16"
              >
                View marketplace
              </Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-white/12 bg-white/10 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-5">
            {[
              [MapPinned, "Draw the huntable area", "No house number required. Use the map to define woods, fields, ranch blocks, or creek corridors."],
              [Sparkles, "A listing that feels premium", "Show the region, habitat, wildlife, and access style clearly without revealing private gates or routes."],
              [MessageSquareText, "Request-first workflow", "Hunters send a short message first. You decide who gets the next step."],
              [FileSignature, "Contract-ready foundation", "Approved requests can move into digital terms, signatures, and PDFs as the booking flow expands."],
            ].map(([Icon, title, body]) => {
              const IconComponent = Icon as typeof MapPinned;
              return (
                <div
                  key={String(title)}
                  className="grid grid-cols-[auto_1fr] gap-3 rounded-md border border-white/12 bg-white/9 p-3"
                >
                  <span className="grid size-10 place-items-center rounded-md bg-white text-[#183326]">
                    <IconComponent size={18} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-black">{String(title)}</span>
                    <span className="mt-1 block text-sm leading-6 text-white/66">
                      {String(body)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="grid gap-4 md:grid-cols-3">
          {[
            [
              "1",
              "Create an owner profile",
              "Add basic contact details and select the landowner role so listing tools unlock only for the right users.",
            ],
            [
              "2",
              "Draw and describe the land",
              "Mark the exact huntable boundary, add acreage if you have a survey number, choose species, rules, and access style.",
            ],
            [
              "3",
              "Approve the right hunter",
              "Requests start as simple messages. Exact coordinates and access terms stay gated until approval.",
            ],
          ].map(([step, title, body]) => (
            <div
              key={step}
              className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_48px_rgba(25,35,29,0.07)]"
            >
              <div className="grid size-9 place-items-center rounded-md bg-[#183326] text-sm font-black text-white">
                {step}
              </div>
              <h2 className="mt-4 text-xl font-black text-stone-950">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_48px_rgba(25,35,29,0.07)] sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
              Owner controls
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-stone-950">
              Built for trust before the first gate opens.
            </h2>
            <div className="mt-5 grid gap-3">
              {[
                "Ownership proof can be uploaded during review.",
                "Hunter insurance and identity checks have dedicated database records.",
                "Exact map details stay hidden until you approve the right hunter.",
                "State-specific rules help you collect the right information before a request moves forward.",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-md bg-[#f7f3ea] p-3">
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-[#2f6f8f]" aria-hidden="true" />
                  <p className="text-sm font-semibold leading-6 text-stone-700">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#234331]/10 bg-[#18261e] p-5 text-white shadow-[0_24px_70px_rgba(25,35,29,0.14)] sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d99a61]">
              Built for serious landowners
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight">
              Lease hunting land to a serious, approval-first audience.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/68 sm:text-base">
              Huntfields is designed around private hunting access, not generic
              classifieds. Every listing can show acreage, wildlife, amenities,
              rules, privacy-safe map previews, and a request workflow that
              keeps you in control before any exact access details are shared.
            </p>
            <Link
              href={user ? "#submit-land" : "/auth/login?next=/list-your-land"}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-[#183326] transition hover:bg-[#f7f3ea]"
            >
              {user ? "Open landowner tools" : "Create a free landowner account"}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_48px_rgba(25,35,29,0.07)] sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                Why landowners use Huntfields
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-stone-950">
                Turn private acreage into controlled hunting access.
              </h2>
            </div>
            <div className="grid gap-4 text-sm leading-7 text-stone-600 sm:grid-cols-2">
              <p>
                A hunting lease works best when the landowner can show the value
                of the property without giving away too much too early. Hunters
                need to understand habitat, acreage, species, access style, and
                rules. Owners need to protect gates, routes, livestock areas,
                neighbors, and sensitive boundaries.
              </p>
              <p>
                Huntfields is designed around that balance. You can present the
                general hunting opportunity, draw the area, add rules, and start
                with a simple request message before any exact access details
                are released.
              </p>
              <p>
                For owners, the first step is free. You can create an account,
                choose the landowner role, and prepare a listing without needing
                payment keys or a live booking provider in the MVP.
              </p>
              <p>
                For hunters, the process feels clear: find a property, read the
                rules, send a respectful request, and wait for approval before
                expecting private location details.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "Ranches and farms",
              "List pasture edges, timber blocks, crop fields, creek bottoms, or larger ranch sections with custom rules.",
            ],
            [
              "Woodland parcels",
              "Show wooded acreage, access corridors, water features, and habitat without publishing exact private boundaries.",
            ],
            [
              "Seasonal access",
              "Offer season leases, limited windows, weekend access, or owner-approved custom dates.",
            ],
            [
              "Guided access",
              "Owners and outfitters can describe guided support, check-in rules, staging areas, and allowed species.",
            ],
          ].map(([title, body]) => (
            <div
              key={title}
              className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_14px_36px_rgba(25,35,29,0.06)]"
            >
              <h3 className="text-base font-black text-stone-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-lg border border-[#234331]/10 bg-[#18261e] p-5 text-white shadow-[0_24px_70px_rgba(25,35,29,0.14)] sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d99a61]">
            Landowner FAQ
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight">
            Common questions before listing hunting land.
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              [
                "Is it free to start?",
                "Yes. Creating a landowner account and starting the listing flow is free. Payments can be added later when a booking flow is ready.",
              ],
              [
                "Do I need a street address?",
                "No. Many hunting properties are best described by a drawn huntable area, nearest town, and private access instructions shared later.",
              ],
              [
                "Who sees the exact boundary?",
                "Public visitors see an approximate preview. Exact access should be shared only after you approve the hunter and terms are ready.",
              ],
              [
                "Can I require proof from hunters?",
                "Yes. The product is prepared for insurance documents, identity checks, license details, and owner-specific request requirements.",
              ],
              [
                "Can I reject a request?",
                "Yes. The request-first workflow is built so you stay in control and only move forward with hunters who feel like the right fit.",
              ],
              [
                "What should I include in rules?",
                "Include guest limits, vehicle access, stand placement, gates, livestock areas, alcohol policy, harvest expectations, and emergency contact details.",
              ],
              [
                "Can I list more than one property?",
                "Yes. The account structure supports multiple listings, each with its own map area, rules, species, price, and request flow.",
              ],
              [
                "Will hunters understand the land without exact coordinates?",
                "Yes. A strong listing can show region, nearest town, acreage, habitat, wildlife, amenities, and an approximate map preview before exact access is released.",
              ],
            ].map(([question, answer]) => (
              <div
                key={question}
                className="rounded-md border border-white/12 bg-white/9 p-4"
              >
                <h3 className="text-sm font-black">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-white/68">{answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="submit-land" className="mt-8 scroll-mt-24">
          {!supabase ? (
            <div className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-6 shadow-[0_18px_48px_rgba(25,35,29,0.07)]">
              <h2 className="text-2xl font-black text-stone-950">
                Listing submissions are not connected yet.
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                The landing page is ready. Connect the backend environment to
                activate accounts, onboarding, and real listing creation.
              </p>
            </div>
          ) : !user ? (
            <div className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-6 text-center shadow-[0_18px_48px_rgba(25,35,29,0.07)] sm:p-8">
              <h2 className="text-3xl font-black text-stone-950">
                Start with a free landowner account.
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
                After signup, choose the landowner role and the listing form
                unlocks with map drawing, species, rules, compliance fields,
                and image generation.
              </p>
              <Link
                href="/auth/login?next=/list-your-land"
                className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#183326] px-5 text-sm font-black text-white shadow-[0_18px_44px_rgba(25,35,29,0.18)] transition hover:bg-[#10271d]"
              >
                Create a free landowner account
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          ) : !canListLand ? (
            <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
              <aside className="rounded-lg border border-[#234331]/10 bg-[#18261e] p-5 text-white shadow-[0_24px_70px_rgba(25,35,29,0.16)] sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d99a61]">
                  Owner access
                </p>
                <h2 className="mt-3 text-3xl font-black leading-[1.05] tracking-normal sm:text-4xl">
                  Confirm you are listing as a landowner.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/70 sm:text-base">
                  Only registered users who selected the landowner role can
                  submit hunting land. This keeps the marketplace cleaner for
                  both sides.
                </p>
              </aside>
              <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_18px_50px_rgba(25,35,29,0.1)]">
                <LandownerOnboardingForm nextPath="/list-your-land" />
              </section>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c76b2f]">
                  Listing tools
                </p>
                <h2 className="mt-3 text-3xl font-black leading-[1.06] tracking-normal text-stone-950 sm:text-4xl">
                  Submit the huntable area for review.
                </h2>
                <p className="mt-4 text-base leading-7 text-stone-600">
                  Draw the exact forest, ranch, field, or access section once.
                  Huntfields uses that map area for acreage and search, while
                  public users see only an approximate location until you approve
                  access.
                </p>
              </aside>
              <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-4 shadow-[0_22px_70px_rgba(25,35,29,0.12)] sm:p-5">
                <ListingSubmissionForm
                  listingTypes={listingTypes.data}
                  stateRules={stateRules}
                />
              </section>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
