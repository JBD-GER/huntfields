import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarCheck,
  FileSignature,
  Heart,
  Inbox,
  LogOut,
  MapPinned,
  Trash2,
} from "lucide-react";
import { MessageReplyForm } from "@/components/forms/message-reply-form";
import { PasskeyRegistrationCard } from "@/components/forms/passkey-registration-card";
import { formatBps, formatMoney, INITIAL_HUNTER_FEE_BPS, INITIAL_OWNER_FEE_BPS, RENEWAL_HUNTER_FEE_BPS, RENEWAL_OWNER_FEE_BPS } from "@/lib/payments/fees";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Dashboard",
  description:
    "Manage Huntfields listing submissions, requests, bookings, favorites, and saved searches.",
  path: "/dashboard",
  index: false,
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const activeRequestId = stringParam(params.request);
  const accountError = stringParam(params.account_error);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">
          Connect Supabase
        </h1>
        <p className="mt-3 text-stone-600">
          Add the Supabase environment variables before using authenticated
          dashboard features.
        </p>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const [requests, bookings, favorites, savedSearches, listings] =
    await Promise.all([
      supabase
        .from("listing_requests")
        .select("id, status, workflow_stage, created_at, hunter_id, requested_start, requested_end, party_size, listings(title, slug, owner_id, price_cents, currency)")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("bookings")
        .select("id, status, starts_on, ends_on, listings(title, slug)")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase.from("favorites").select("listing_id").limit(1),
      supabase.from("saved_searches").select("id, name").limit(6),
      supabase
        .from("listings")
        .select("id, title, slug, status, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const activeRequest = activeRequestId
    ? await supabase
        .from("listing_requests")
        .select("id, status, workflow_stage, hunter_id, message, requested_start, requested_end, party_size, listings(title, slug, owner_id, price_cents, currency)")
        .eq("id", activeRequestId)
        .maybeSingle()
    : { data: null, error: null };
  const activeMessages = activeRequestId
    ? await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, created_at, message_attachments(id, file_name, attachment_kind)")
        .eq("request_id", activeRequestId)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  const stats = [
    ["Requests", requests.data?.length ?? 0, Inbox],
    ["Bookings", bookings.data?.length ?? 0, CalendarCheck],
    ["Favorites", favorites.data?.length ?? 0, Heart],
    ["Saved searches", savedSearches.data?.length ?? 0, MapPinned],
  ];

  return (
    <div className="mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-col gap-4 rounded-lg border border-[#234331]/10 bg-[#18261e] p-5 text-white shadow-[0_24px_70px_rgba(25,35,29,0.16)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d99a61]">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-normal sm:text-4xl">
            Marketplace activity
          </h1>
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/18 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/16">
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>

      {accountError ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
          {accountError}
        </div>
      ) : null}

      <PasskeyRegistrationCard email={user.email} />

      <section className="mt-6 rounded-lg border border-red-200/70 bg-[#fffdf7] p-5 shadow-[0_16px_46px_rgba(25,35,29,0.08)] sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
              Account controls
            </p>
            <h2 className="mt-2 text-2xl font-black text-stone-950">
              Delete authenticated user
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Permanently deletes your Supabase Auth user through the server-side
              Admin API. Accounts that own active marketplace records may need
              those records archived or transferred first.
            </p>
          </div>
          <form action="/api/auth/delete-account" method="post" className="grid gap-3">
            <label className="grid gap-2 text-sm font-bold text-stone-800">
              Type DELETE to confirm
              <input
                name="confirm"
                type="text"
                autoComplete="off"
                pattern="DELETE"
                required
                className="min-h-11 rounded-md border border-red-200 bg-white px-3 font-normal outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </label>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-black text-white transition hover:bg-red-800">
              <Trash2 size={16} aria-hidden="true" />
              Delete account
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value, Icon]) => {
          const IconComponent = Icon as typeof Inbox;
          return (
            <div key={String(label)} className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_16px_46px_rgba(25,35,29,0.08)]">
              <IconComponent className="size-5 text-[#2f6f8f]" aria-hidden="true" />
              <p className="mt-4 text-3xl font-black text-stone-950">
                {String(value)}
              </p>
              <p className="text-sm font-semibold text-stone-600">{String(label)}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <DashboardPanel title="Your listing submissions">
          {(listings.data ?? []).length === 0 ? (
            <EmptyDashboardText href="/list-your-land" label="Submit land" />
          ) : (
            (listings.data ?? []).map((listing) => (
              <DashboardRow
                key={listing.id}
                href={`/listings/${listing.slug}`}
                title={listing.title}
                meta={listing.status}
              />
            ))
          )}
        </DashboardPanel>
        <DashboardPanel title="Recent requests">
          {(requests.data ?? []).length === 0 ? (
            <EmptyDashboardText href="/land" label="Search land" />
          ) : (
            (requests.data ?? []).map((request) => {
              const listing = Array.isArray(request.listings)
                ? request.listings[0]
                : request.listings;

              return (
                <DashboardRow
                  key={request.id}
                  href={`/dashboard?request=${request.id}`}
                  title={listing?.title ?? "Listing request"}
                  meta={request.status}
                >
                  {listing?.owner_id === user.id && request.status === "pending" && (
                    <div className="mt-3 grid gap-3">
                      <TermsProposalForm
                        requestId={request.id}
                        requestedStart={request.requested_start}
                        requestedEnd={request.requested_end}
                        partySize={request.party_size}
                        listingPriceCents={listing.price_cents}
                        currency={listing.currency ?? "USD"}
                      />
                      <form
                        action={`/api/requests/${request.id}/decision`}
                        method="post"
                      >
                        <input type="hidden" name="decision" value="declined" />
                        <button className="min-h-9 w-full rounded-md border border-stone-300 px-3 text-xs font-bold text-stone-700">
                          Decline
                        </button>
                      </form>
                    </div>
                  )}
                </DashboardRow>
              );
            })
          )}
        </DashboardPanel>
      </section>

      {activeRequestId && (
        <section className="mt-6">
          <DashboardPanel title="Request chat">
            {!activeRequest.data ? (
              <div className="rounded-md border border-dashed border-stone-300 p-5 text-sm text-stone-600">
                This request is not available to your account.
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="rounded-md border border-stone-200 bg-[#fbfaf6] p-4">
                  <p className="text-sm font-bold text-stone-950">
                    {firstListing(activeRequest.data.listings)?.title ??
                      "Listing request"}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#c76b2f]">
                    {activeRequest.data.status}
                  </p>
                </div>
                <div className="grid gap-3">
                  {(activeMessages.data ?? []).length === 0 ? (
                    <div className="rounded-md border border-dashed border-stone-300 p-5 text-sm text-stone-600">
                      No messages yet.
                    </div>
                  ) : (
                    (activeMessages.data ?? []).map((message) => {
                      const own = message.sender_id === user.id;
                      return (
                        <div
                          key={message.id}
                          className={`max-w-2xl rounded-md px-4 py-3 text-sm leading-6 ${
                            own
                              ? "ml-auto bg-[#234331] text-white"
                              : "bg-stone-100 text-stone-800"
                          }`}
                        >
                          <p>{message.body}</p>
                          {message.message_attachments?.length ? (
                            <div className="mt-3 grid gap-2">
                              {message.message_attachments.map((attachment) => (
                                <Link
                                  key={attachment.id}
                                  href={`/api/messages/attachments/${attachment.id}`}
                                  className={`rounded-md border px-3 py-2 text-xs font-bold ${
                                    own
                                      ? "border-white/20 bg-white/10 text-white"
                                      : "border-stone-200 bg-white text-[#234331]"
                                  }`}
                                >
                                  {attachment.attachment_kind}:{" "}
                                  {attachment.file_name}
                                </Link>
                              ))}
                            </div>
                          ) : null}
                          <p
                            className={`mt-2 text-xs ${
                              own ? "text-white/70" : "text-stone-500"
                            }`}
                          >
                            {new Date(message.created_at).toLocaleString()}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
                <MessageReplyForm requestId={activeRequest.data.id} />
              </div>
            )}
          </DashboardPanel>
        </section>
      )}
    </div>
  );
}

function firstListing<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function DashboardPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-5 shadow-[0_16px_46px_rgba(25,35,29,0.08)]">
      <h2 className="text-xl font-black tracking-normal text-stone-950">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </div>
  );
}

function DashboardRow({
  href,
  title,
  meta,
  children,
}: {
  href: string;
  title: string;
  meta: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-[#234331]/10 bg-white/62 px-3 py-3 text-sm transition hover:border-[#234331]/35">
      <Link href={href} className="flex items-center justify-between gap-4">
        <span className="font-bold text-stone-800">{title}</span>
        <span className="rounded-md bg-[#eef3ec] px-2 py-1 text-xs font-black text-[#234331]">
          {meta}
        </span>
      </Link>
      {children}
    </div>
  );
}

function TermsProposalForm({
  requestId,
  requestedStart,
  requestedEnd,
  partySize,
  listingPriceCents,
  currency,
}: {
  requestId: string;
  requestedStart?: string | null;
  requestedEnd?: string | null;
  partySize?: number | null;
  listingPriceCents?: number | null;
  currency: string;
}) {
  const defaultPrice = listingPriceCents
    ? String(Math.round(listingPriceCents / 100))
    : "";

  return (
    <form
      action={`/api/requests/${requestId}/terms`}
      method="post"
      className="grid gap-3 rounded-md border border-[#d9c6aa] bg-[#fff9ef] p-3"
    >
      <div className="flex items-start gap-2">
        <FileSignature className="mt-0.5 size-4 text-[#c76b2f]" aria-hidden="true" />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#c76b2f]">
            Final terms before signature
          </p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            Owner fee {formatBps(INITIAL_OWNER_FEE_BPS)}, hunter fee{" "}
            {formatBps(INITIAL_HUNTER_FEE_BPS)}. Annual renewals use owner{" "}
            {formatBps(RENEWAL_OWNER_FEE_BPS)} and hunter{" "}
            {formatBps(RENEWAL_HUNTER_FEE_BPS)}.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-xs font-bold text-stone-700">
          Final price
          <input
            name="lease_amount"
            inputMode="decimal"
            required
            defaultValue={defaultPrice}
            placeholder="5000"
            className="min-h-9 rounded-md border border-stone-300 bg-white px-2 text-sm font-normal outline-none focus:border-[#234331]"
          />
        </label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">
          Extras
          <input
            name="additional_fee"
            inputMode="decimal"
            placeholder="0"
            className="min-h-9 rounded-md border border-stone-300 bg-white px-2 text-sm font-normal outline-none focus:border-[#234331]"
          />
        </label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">
          Party
          <input
            name="party_size"
            inputMode="numeric"
            required
            defaultValue={partySize ?? 1}
            className="min-h-9 rounded-md border border-stone-300 bg-white px-2 text-sm font-normal outline-none focus:border-[#234331]"
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-stone-700">
          Starts
          <input
            name="starts_on"
            type="date"
            required
            defaultValue={requestedStart ?? ""}
            className="min-h-9 rounded-md border border-stone-300 bg-white px-2 text-sm font-normal outline-none focus:border-[#234331]"
          />
        </label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">
          Ends
          <input
            name="ends_on"
            type="date"
            required
            defaultValue={requestedEnd ?? ""}
            className="min-h-9 rounded-md border border-stone-300 bg-white px-2 text-sm font-normal outline-none focus:border-[#234331]"
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-stone-700">
          Renewal
          <select
            name="renewal_type"
            defaultValue="none"
            className="min-h-9 rounded-md border border-stone-300 bg-white px-2 text-sm font-normal outline-none focus:border-[#234331]"
          >
            <option value="none">No automatic renewal</option>
            <option value="annual_optional">Annual optional renewal</option>
            <option value="annual_auto">Annual intended renewal</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">
          Notice days
          <input
            name="renewal_notice_days"
            inputMode="numeric"
            defaultValue={30}
            className="min-h-9 rounded-md border border-stone-300 bg-white px-2 text-sm font-normal outline-none focus:border-[#234331]"
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-stone-700">
          Contract source
          <select
            name="contract_source"
            defaultValue="generated"
            className="min-h-9 rounded-md border border-stone-300 bg-white px-2 text-sm font-normal outline-none focus:border-[#234331]"
          >
            <option value="generated">Generate agreement</option>
            <option value="uploaded_pdf">Use uploaded PDF path</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">
          PDF path
          <input
            name="uploaded_contract_path"
            placeholder="Optional private storage path"
            className="min-h-9 rounded-md border border-stone-300 bg-white px-2 text-sm font-normal outline-none focus:border-[#234331]"
          />
        </label>
      </div>

      <label className="grid gap-1 text-xs font-bold text-stone-700">
        Notes
        <textarea
          name="terms_notes"
          rows={2}
          placeholder="Special access, payment, renewal, or property notes"
          className="rounded-md border border-stone-300 bg-white px-2 py-2 text-sm font-normal outline-none focus:border-[#234331]"
        />
      </label>

      <p className="rounded-md border border-[#234331]/10 bg-white/70 p-2 text-xs font-semibold leading-5 text-stone-600">
        Example from current listing price: hunter sees about{" "}
        {formatMoney(
          listingPriceCents ? Math.round(listingPriceCents * 1.05) : 0,
          currency,
        )}{" "}
        total; owner payout before taxes/withholding is about{" "}
        {formatMoney(
          listingPriceCents ? Math.round(listingPriceCents * 0.9) : 0,
          currency,
        )}
        . Exact totals are recalculated from the final price above.
      </p>

      <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#234331] px-3 text-xs font-black text-white">
        <FileSignature size={15} aria-hidden="true" />
        Generate contract for signature
      </button>
    </form>
  );
}

function EmptyDashboardText({ href, label }: { href: string; label: string }) {
  return (
    <div className="rounded-md border border-dashed border-[#234331]/20 bg-white/54 p-5 text-sm text-stone-600">
      No activity yet.{" "}
      <Link href={href} className="font-bold text-[#234331]">
        {label}
      </Link>
    </div>
  );
}
