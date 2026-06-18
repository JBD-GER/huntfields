import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, Heart, Inbox, LogOut, MapPinned } from "lucide-react";
import { MessageReplyForm } from "@/components/forms/message-reply-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Dashboard",
  description:
    "Manage Huntfields listing submissions, requests, bookings, favorites, and saved searches.",
  path: "/dashboard",
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

  const [requests, bookings, favorites, savedSearches, listings] =
    await Promise.all([
      supabase
        .from("listing_requests")
        .select("id, status, created_at, hunter_id, listings(title, slug, owner_id)")
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
        .select("id, status, hunter_id, message, listings(title, slug, owner_id)")
        .eq("id", activeRequestId)
        .maybeSingle()
    : { data: null, error: null };
  const activeMessages = activeRequestId
    ? await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, created_at")
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
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <form
                        action={`/api/requests/${request.id}/decision`}
                        method="post"
                      >
                        <input type="hidden" name="decision" value="approved" />
                        <button className="min-h-9 w-full rounded-md bg-[#234331] px-3 text-xs font-bold text-white">
                          Approve + contract
                        </button>
                      </form>
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
