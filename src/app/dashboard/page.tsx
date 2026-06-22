import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  Compass,
  CreditCard,
  ExternalLink,
  FileSignature,
  Inbox,
  LayoutDashboard,
  ListChecks,
  ListPlus,
  LogOut,
  MapPinned,
  MessageSquareText,
  Paperclip,
  PlusCircle,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  WalletCards,
  XCircle,
} from "lucide-react";
import { LeaseFilterForm } from "@/components/forms/lease-filter-form";
import { ListingSubmissionForm } from "@/components/forms/listing-submission-form";
import { MessageReplyForm } from "@/components/forms/message-reply-form";
import { PasskeyRegistrationCard } from "@/components/forms/passkey-registration-card";
import { ProblemReportCard } from "@/components/forms/problem-report-card";
import { ListingResults } from "@/components/listings/listing-results";
import { LazyListingMap } from "@/components/maps/lazy-listing-map";
import { getUsStateRules } from "@/lib/compliance/us-state-rules";
import type { UsStateHuntingRule } from "@/lib/compliance/us-state-rules";
import {
  getListingTypes,
  searchListingsByRadius,
  searchListingsByRegion,
} from "@/lib/data/listings";
import type { ListingCard, ListingType } from "@/lib/data/listings";
import {
  formatBps,
  formatMoney,
  INITIAL_HUNTER_FEE_BPS,
  INITIAL_OWNER_FEE_BPS,
  RENEWAL_HUNTER_FEE_BPS,
  RENEWAL_OWNER_FEE_BPS,
} from "@/lib/payments/fees";
import { pageMetadata } from "@/lib/seo/site";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getUsLaunchState } from "@/lib/us-market";

export const metadata = pageMetadata({
  title: "Dashboard",
  description:
    "Manage Huntfields listings, hunting lease search, requests, contracts, profile settings, and payment readiness.",
  path: "/dashboard",
  index: false,
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Role = "hunter" | "landowner";
type View = "overview" | "leases" | "listings" | "requests" | "contracts" | "profile";
type HunterVerificationStatus =
  | "not_started"
  | "pending"
  | "verified"
  | "rejected"
  | "expired";
type PropertyVerificationStatus = HunterVerificationStatus;
type IdentityVerificationStatus = HunterVerificationStatus;

type DashboardProfile = {
  role: string | null;
  onboarding_completed: boolean;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  admin_area_code: string | null;
  postal_code: string | null;
};

type ListingSummary = {
  id: string;
  title: string;
  slug: string;
  status: string | null;
  property_verification_status?: PropertyVerificationStatus | null;
  created_at?: string | null;
  price_cents?: number | null;
  currency?: string | null;
};

type RequestListing = {
  title: string | null;
  slug: string | null;
  owner_id: string | null;
  price_cents: number | null;
  currency: string | null;
  property_verification_status?: PropertyVerificationStatus | null;
};

type RequestSummary = {
  id: string;
  status: string | null;
  workflow_stage: string | null;
  created_at: string | null;
  hunter_id: string | null;
  message?: string | null;
  requested_start: string | null;
  requested_end: string | null;
  party_size: number | null;
  listings: RequestListing | RequestListing[] | null;
  hunterVerificationStatus?: HunterVerificationStatus;
  hunterIdentityStatus?: IdentityVerificationStatus;
  ownerIdentityStatus?: IdentityVerificationStatus;
};

type BookingSummary = {
  id: string;
  status: string | null;
  workflow_stage: string | null;
  payment_status: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  hunter_id?: string | null;
  landowner_id?: string | null;
  checkout_url?: string | null;
  listings?: { title: string | null; slug: string | null } | { title: string | null; slug: string | null }[] | null;
};

type ContractSummary = {
  id: string;
  request_id: string | null;
  booking_id: string | null;
  title: string | null;
  status: string | null;
  generated_at: string | null;
  signed_at: string | null;
  hunter_id: string | null;
  landowner_id: string | null;
  bookings: BookingSummary | BookingSummary[] | null;
};

type MessageAttachment = {
  id: string;
  file_name: string;
  attachment_kind: string;
};

type RequestMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  message_attachments?: MessageAttachment[] | null;
};

type PaymentAccountSummary = {
  provider: string;
  provider_account_id: string | null;
  onboarding_status: string | null;
  charges_enabled: boolean | null;
  payouts_enabled: boolean | null;
  default_currency: string | null;
  updated_at: string | null;
};

type StripeCustomerSummary = {
  provider_customer_id: string | null;
  email: string | null;
  updated_at: string | null;
};

type BillingHistorySummary = {
  id: string;
  booking_id: string | null;
  hunter_id: string | null;
  landowner_id: string | null;
  status: string | null;
  amount_cents: number | null;
  currency: string | null;
  owner_platform_fee_cents: number | null;
  hunter_platform_fee_cents: number | null;
  application_fee_cents: number | null;
  landowner_payout_cents: number | null;
  provider_invoice_id: string | null;
  provider_invoice_url: string | null;
  provider_invoice_pdf: string | null;
  provider_checkout_id: string | null;
  provider_payment_id: string | null;
  provider_transfer_id: string | null;
  transfer_status: string | null;
  tax_amount_cents: number | null;
  payment_method_type: string | null;
  payment_method_summary: string | null;
  receipt_url: string | null;
  created_at: string | null;
  bookings?:
    | {
        listings?: { title: string | null; slug: string | null } | { title: string | null; slug: string | null }[] | null;
      }
    | {
        listings?: { title: string | null; slug: string | null } | { title: string | null; slug: string | null }[] | null;
      }[]
    | null;
};

type IdentityVerificationSummary = {
  status: IdentityVerificationStatus | null;
  provider_url: string | null;
  result_summary: string | null;
  updated_at: string | null;
  created_at: string | null;
};

const pageSize = 12;

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRole(role: unknown): Role {
  return role === "landowner" ? "landowner" : "hunter";
}

function normalizeView(value: string | undefined, role: Role): View {
  const fallback: View = "overview";
  const allowed =
    role === "hunter"
      ? ["overview", "leases", "requests", "contracts", "profile"]
      : ["overview", "listings", "requests", "contracts", "profile"];

  return allowed.includes(value ?? "") ? (value as View) : fallback;
}

function firstListing<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusLabel(value: string | null | undefined) {
  return (value ?? "not_started").replaceAll("_", " ");
}

function normalizeHunterVerificationStatus(
  value: unknown,
): HunterVerificationStatus {
  return value === "verified" ||
    value === "pending" ||
    value === "rejected" ||
    value === "expired"
    ? value
    : "not_started";
}

function normalizePropertyVerificationStatus(
  value: unknown,
): PropertyVerificationStatus {
  return normalizeHunterVerificationStatus(value);
}

function normalizeIdentityVerificationStatus(
  value: unknown,
): IdentityVerificationStatus {
  return normalizeHunterVerificationStatus(value);
}

function requestCanFinalize(request: RequestSummary) {
  const listing = firstListing(request.listings);
  return (
    request.hunterIdentityStatus === "verified" &&
    request.ownerIdentityStatus === "verified" &&
    request.hunterVerificationStatus === "verified" &&
    normalizePropertyVerificationStatus(listing?.property_verification_status) ===
      "verified"
  );
}

function aggregatePropertyVerificationStatus(
  listings: ListingSummary[],
): PropertyVerificationStatus {
  if (!listings.length) {
    return "not_started";
  }

  const statuses = listings.map((listing) =>
    normalizePropertyVerificationStatus(listing.property_verification_status),
  );

  if (statuses.every((status) => status === "verified")) {
    return "verified";
  }

  if (statuses.some((status) => status === "rejected")) {
    return "rejected";
  }

  if (statuses.some((status) => status === "expired")) {
    return "expired";
  }

  return "pending";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

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
    .select(
      "role, onboarding_completed, full_name, first_name, last_name, phone, city, admin_area_code, postal_code",
    )
    .eq("id", user.id)
    .maybeSingle();
  const accountProfile = profile as DashboardProfile | null;

  if (!accountProfile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const role = normalizeRole(accountProfile.role);
  const activeView = normalizeView(stringParam(params.view), role);
  const activeRequestId = stringParam(params.request);
  const accountError = stringParam(params.account_error);
  const connectState = stringParam(params.connect);
  const billingState = stringParam(params.billing);
  const billingError = stringParam(params.billing_error);
  const verificationState = stringParam(params.verification);
  const identityState = stringParam(params.identity);
  const nextHint = stringParam(params.next);
  const createListing = stringParam(params.create) === "1";
  const lat = cleanNumber(stringParam(params.lat));
  const lng = cleanNumber(stringParam(params.lng));
  const radius = stringParam(params.radius) ?? "statewide";
  const country = stringParam(params.country)?.toUpperCase() || "US";
  const state = getUsLaunchState(stringParam(params.state) ?? "TX");
  const listingType = stringParam(params.type);
  const minAreaValue = stringParam(params.min_area);
  const minArea = cleanNumber(minAreaValue);
  const searchLat = lat ?? state.lat;
  const searchLng = lng ?? state.lng;
  const leaseTypeFilters = listingType ? [listingType] : undefined;

  const leaseSearch =
    role === "hunter"
      ? radius === "statewide"
        ? await searchListingsByRegion({
            countryCode: country,
            adminAreaCode: country === "US" ? state.code : null,
            listingTypes: leaseTypeFilters,
            minAreaAcres: minArea,
            limit: pageSize,
          })
        : await searchListingsByRadius({
            countryCode: country,
            lat: searchLat,
            lng: searchLng,
            radiusMeters: cleanNumber(radius) ?? 160934,
            listingTypes: leaseTypeFilters,
            minAreaAcres: minArea,
            limit: pageSize,
          })
      : { data: [], error: null };

  const [
    requests,
    bookings,
    ownerListings,
    savedSearches,
    hunterCompliance,
    paymentAccount,
    contracts,
    identityCheck,
    stripeCustomer,
    billingHistory,
  ] = await Promise.all([
    role === "hunter"
      ? supabase
          .from("listing_requests")
          .select(
            "id, status, workflow_stage, created_at, hunter_id, requested_start, requested_end, party_size, listings(title, slug, owner_id, price_cents, currency, property_verification_status)",
          )
          .eq("hunter_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12)
      : supabase
          .from("listing_requests")
          .select(
            "id, status, workflow_stage, created_at, hunter_id, requested_start, requested_end, party_size, listings!inner(title, slug, owner_id, price_cents, currency, property_verification_status)",
          )
          .eq("listings.owner_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12),
    supabase
      .from("bookings")
      .select(
        "id, status, workflow_stage, payment_status, starts_on, ends_on, hunter_id, landowner_id, checkout_url, listings(title, slug)",
      )
      .or(`hunter_id.eq.${user.id},landowner_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(12),
    role === "landowner"
      ? supabase
          .from("listings")
          .select("id, title, slug, status, property_verification_status, created_at, price_cents, currency")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("saved_searches")
      .select("id, name")
      .eq("user_id", user.id)
      .limit(12),
    role === "hunter"
      ? supabase
          .from("hunter_compliance_profiles")
          .select("user_id, verification_status")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    role === "landowner"
      ? supabase
          .from("payment_accounts")
          .select(
            "provider, provider_account_id, onboarding_status, charges_enabled, payouts_enabled, default_currency, updated_at",
          )
          .eq("user_id", user.id)
          .eq("provider", "stripe")
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("booking_contracts")
      .select(
        "id, request_id, booking_id, title, status, generated_at, signed_at, hunter_id, landowner_id, bookings(status, workflow_stage, payment_status, checkout_url, listings(title, slug))",
      )
      .or(`hunter_id.eq.${user.id},landowner_id.eq.${user.id}`)
      .order("generated_at", { ascending: false })
      .limit(12),
    supabase
      .from("identity_verification_checks")
      .select("status, provider_url, result_summary, updated_at, created_at")
      .eq("user_id", user.id)
      .eq("provider", "stripe_identity")
      .eq("check_type", "id_document")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("stripe_customers")
      .select("provider_customer_id, email, updated_at")
      .eq("user_id", user.id)
      .eq("provider", "stripe")
      .maybeSingle(),
    supabase
      .from("booking_payment_intents")
      .select(
        "id, booking_id, hunter_id, landowner_id, status, amount_cents, currency, owner_platform_fee_cents, hunter_platform_fee_cents, application_fee_cents, landowner_payout_cents, provider_invoice_id, provider_invoice_url, provider_invoice_pdf, provider_checkout_id, provider_payment_id, provider_transfer_id, transfer_status, tax_amount_cents, payment_method_type, payment_method_summary, receipt_url, created_at, bookings(listings(title, slug))",
      )
      .or(`hunter_id.eq.${user.id},landowner_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const activeRequest = activeRequestId
    ? role === "hunter"
      ? await supabase
          .from("listing_requests")
          .select(
            "id, status, workflow_stage, created_at, hunter_id, message, requested_start, requested_end, party_size, listings(title, slug, owner_id, price_cents, currency, property_verification_status)",
          )
          .eq("id", activeRequestId)
          .eq("hunter_id", user.id)
          .maybeSingle()
      : await supabase
          .from("listing_requests")
          .select(
            "id, status, workflow_stage, created_at, hunter_id, message, requested_start, requested_end, party_size, listings!inner(title, slug, owner_id, price_cents, currency, property_verification_status)",
          )
          .eq("id", activeRequestId)
          .eq("listings.owner_id", user.id)
          .maybeSingle()
    : { data: null, error: null };
  const activeMessages = activeRequestId
    ? await supabase
        .from("messages")
        .select(
          "id, sender_id, recipient_id, body, created_at, message_attachments(id, file_name, attachment_kind)",
        )
        .eq("request_id", activeRequestId)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  const listingTypesForForm =
    role === "landowner" && activeView === "listings" && createListing
      ? await getListingTypes()
      : { data: [], error: null };
  const stateRulesForForm =
    role === "landowner" && activeView === "listings" && createListing
      ? await getUsStateRules()
      : [];

  const firstName =
    accountProfile.first_name ??
    accountProfile.full_name?.split(" ").filter(Boolean)[0] ??
    "there";
  const displayName =
    [accountProfile.first_name, accountProfile.last_name].filter(Boolean).join(" ") ||
    accountProfile.full_name ||
    user.email ||
    "Huntfields user";
  const requestItems = (requests.data ?? []) as RequestSummary[];
  const activeRequestData = activeRequest.data as RequestSummary | null;
  const requestOwnerIds = [...requestItems, activeRequestData]
    .map((request) => firstListing(request?.listings)?.owner_id)
    .filter((ownerId): ownerId is string => Boolean(ownerId));
  const hunterIds = Array.from(
    new Set(
      [...requestItems, activeRequestData]
        .map((request) => request?.hunter_id)
        .filter((hunterId): hunterId is string => Boolean(hunterId)),
    ),
  );
  const hunterVerificationById = new Map<string, HunterVerificationStatus>();
  const identityVerificationById = new Map<
    string,
    IdentityVerificationStatus
  >();

  if (hunterIds.length > 0) {
    const statusRows = await supabase
      .from("hunter_compliance_profiles")
      .select("user_id, verification_status")
      .in("user_id", hunterIds);

    if (statusRows.error) {
      const fallbackRows = await supabase
        .from("hunter_compliance_profiles")
        .select("user_id")
        .in("user_id", hunterIds);

      for (const row of fallbackRows.data ?? []) {
        hunterVerificationById.set(row.user_id, "pending");
      }
    } else {
      for (const row of statusRows.data ?? []) {
        hunterVerificationById.set(
          row.user_id,
          normalizeHunterVerificationStatus(row.verification_status),
        );
      }
    }
  }

  const identityUserIds = Array.from(
    new Set([user.id, ...hunterIds, ...requestOwnerIds]),
  );

  if (identityUserIds.length > 0) {
    const identityDb = service ?? supabase;
    const identityRows = await identityDb
      .from("identity_verification_checks")
      .select("user_id, status, created_at")
      .eq("provider", "stripe_identity")
      .eq("check_type", "id_document")
      .in("user_id", identityUserIds)
      .order("created_at", { ascending: false });

    for (const row of identityRows.data ?? []) {
      if (!identityVerificationById.has(row.user_id)) {
        identityVerificationById.set(
          row.user_id,
          normalizeIdentityVerificationStatus(row.status),
        );
      }
    }
  }

  const requestsWithVerification = requestItems.map((request) => ({
    ...request,
    hunterVerificationStatus: normalizeHunterVerificationStatus(
      hunterVerificationById.get(request.hunter_id ?? ""),
    ),
    hunterIdentityStatus: normalizeIdentityVerificationStatus(
      identityVerificationById.get(request.hunter_id ?? ""),
    ),
    ownerIdentityStatus: normalizeIdentityVerificationStatus(
      identityVerificationById.get(
        firstListing(request.listings)?.owner_id ?? "",
      ),
    ),
  }));
  const activeRequestWithVerification = activeRequestData
    ? {
        ...activeRequestData,
        hunterVerificationStatus: normalizeHunterVerificationStatus(
          hunterVerificationById.get(activeRequestData.hunter_id ?? ""),
        ),
        hunterIdentityStatus: normalizeIdentityVerificationStatus(
          identityVerificationById.get(activeRequestData.hunter_id ?? ""),
        ),
        ownerIdentityStatus: normalizeIdentityVerificationStatus(
          identityVerificationById.get(
            firstListing(activeRequestData.listings)?.owner_id ?? "",
          ),
        ),
      }
    : null;
  const bookingItems = (bookings.data ?? []) as BookingSummary[];
  const listingItems = (ownerListings.data ?? []) as ListingSummary[];
  const contractItems = (contracts.data ?? []) as ContractSummary[];
  const paymentAccountData =
    paymentAccount.data as PaymentAccountSummary | null;
  const stripeCustomerData =
    stripeCustomer.data as StripeCustomerSummary | null;
  const billingHistoryItems =
    (billingHistory.data ?? []) as BillingHistorySummary[];
  const identityCheckData =
    identityCheck.data as IdentityVerificationSummary | null;
  const identityStatus = normalizeIdentityVerificationStatus(
    identityCheckData?.status,
  );
  const identityReady = identityStatus === "verified";
  const paymentReady = Boolean(
    paymentAccountData?.provider_account_id &&
      paymentAccountData?.charges_enabled &&
      paymentAccountData?.payouts_enabled,
  );
  const hunterComplianceStatus = normalizeHunterVerificationStatus(
    hunterCompliance.data?.verification_status,
  );
  const hunterReady = hunterComplianceStatus === "verified";
  const hasRequest = requestsWithVerification.length > 0;
  const hasListing = listingItems.length > 0;
  const activeLeaseCount = bookingItems.filter(
    (booking) =>
      booking.status === "confirmed" ||
      booking.workflow_stage === "active" ||
      booking.payment_status === "paid",
  ).length;
  const hasActiveContract = activeLeaseCount > 0;
  const ownerPropertyStatus = aggregatePropertyVerificationStatus(listingItems);

  const stats =
    role === "hunter"
      ? [
          ["Requests", requestItems.length, Inbox],
          ["Contracts", contractItems.length, FileSignature],
          ["Active leases", activeLeaseCount, CalendarCheck],
          ["Saved searches", savedSearches.data?.length ?? 0, MapPinned],
        ]
      : [
          ["Listings", listingItems.length, ListPlus],
          ["Requests", requestItems.length, Inbox],
          ["Contracts", contractItems.length, FileSignature],
          ["Payout ready", paymentReady ? 1 : 0, WalletCards],
        ];

  return (
    <div className="min-h-dvh bg-[#f6f2e9]">
      <div className="mx-auto grid max-w-7xl gap-5 px-3 py-5 sm:px-6 sm:py-7 lg:px-8">
        <WorkspaceHeader
          role={role}
          firstName={firstName}
          activeView={activeView}
          nextHint={nextHint}
          compact={activeView !== "overview"}
        />

        {accountError ? (
          <StateBanner tone="danger" title="Account action needs attention">
            {accountError}
          </StateBanner>
        ) : null}

        {connectState ? (
          <StateBanner
            tone={
              connectState === "enabled"
                ? "success"
                : connectState === "missing_stripe"
                  ? "danger"
                  : "warning"
            }
            title={
              connectState === "enabled"
                ? "Stripe Connect is ready"
                : connectState === "missing_stripe"
                  ? "Stripe is not configured"
                  : "Stripe Connect onboarding returned"
            }
          >
            {connectState === "enabled"
              ? "Payout capability is active for this account."
              : connectState === "missing_stripe"
                ? "Add STRIPE_SECRET_KEY before landowners can start payout onboarding."
                : "If Stripe still needs information, reopen Connect from Profile settings."}
          </StateBanner>
        ) : null}

        {billingState ? (
          <StateBanner
            tone={
              billingState === "returned"
                ? "success"
                : billingState === "missing_stripe" ||
                    billingState === "missing_supabase" ||
                    billingState === "portal_failed"
                  ? "danger"
                  : "warning"
            }
            title={
              billingState === "returned"
                ? "Billing settings updated"
                : billingState === "missing_stripe"
                  ? "Stripe billing is not configured"
                  : billingState === "missing_supabase"
                    ? "Supabase service role is required"
                    : "Billing portal could not open"
            }
          >
            {billingState === "returned"
              ? "Stripe returned you to Huntfields. Invoices, saved payment methods, and billing details stay managed by Stripe."
              : billingError ||
                "Check the Stripe Customer Portal configuration, live keys, and webhook setup before go-live."}
          </StateBanner>
        ) : null}

        {verificationState === "pending" ? (
          <StateBanner tone="warning" title="Verification proof submitted">
            Property verification is pending review. You can keep listing and
            chatting, but final terms stay locked until the property is verified.
          </StateBanner>
        ) : null}

        {identityState ? (
          <StateBanner
            tone={
              identityState === "already_verified"
                ? "success"
                : identityState === "missing_stripe" ||
                    identityState === "missing_supabase" ||
                    identityState === "session_failed"
                  ? "danger"
                  : "warning"
            }
            title={
              identityState === "already_verified"
                ? "Identity already verified"
                : identityState === "missing_stripe"
                  ? "Stripe Identity is not configured"
                  : identityState === "missing_supabase"
                    ? "Supabase service role is required"
                    : identityState === "session_failed"
                      ? "Identity session could not start"
                      : "Identity verification returned"
            }
          >
            {identityState === "already_verified"
              ? "Your government ID check is complete."
              : identityState === "missing_stripe"
                ? "Add STRIPE_SECRET_KEY and enable Stripe Identity before ID checks can start."
                : identityState === "session_failed"
                  ? "Stripe did not return a verification URL. Try again after checking Stripe Identity settings."
                  : "Stripe is processing the ID check asynchronously. This page updates after the webhook result arrives."}
          </StateBanner>
        ) : null}

        <RoleNavigation role={role} activeView={activeView} />

        {activeView === "overview" ? (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(([label, value, Icon]) => {
              const IconComponent = Icon as typeof Inbox;
              return (
                <MetricCard
                  key={String(label)}
                  label={String(label)}
                  value={String(value)}
                  icon={IconComponent}
                />
              );
            })}
          </section>
        ) : null}

        {activeView === "overview" ? (
          <OverviewView
            role={role}
            displayName={displayName}
            identityStatus={identityStatus}
            identityReady={identityReady}
            hunterComplianceStatus={hunterComplianceStatus}
            hunterReady={hunterReady}
            hasRequest={hasRequest}
            hasListing={hasListing}
            ownerPropertyStatus={ownerPropertyStatus}
            paymentReady={paymentReady}
            hasActiveContract={hasActiveContract}
            requestItems={requestsWithVerification}
            listingItems={listingItems}
            contractItems={contractItems}
          />
        ) : null}

        {activeView === "leases" && role === "hunter" ? (
          <HunterLeasesView
            listings={leaseSearch.data}
            error={leaseSearch.error}
            stateCode={state.code}
            radius={radius}
            minAreaValue={minAreaValue}
            country={country}
            listingType={listingType}
            lat={lat}
            lng={lng}
            identityStatus={identityStatus}
            hunterComplianceStatus={hunterComplianceStatus}
          />
        ) : null}

        {activeView === "listings" && role === "landowner" ? (
          <LandownerListingsView
            listings={listingItems}
            createListing={createListing}
            listingTypes={listingTypesForForm.data}
            stateRules={stateRulesForForm}
            identityStatus={identityStatus}
            ownerPropertyStatus={ownerPropertyStatus}
            paymentReady={paymentReady}
            hasListing={hasListing}
          />
        ) : null}

        {activeView === "requests" ? (
          <RequestsView
            role={role}
            userId={user.id}
            requests={requestsWithVerification}
            activeRequest={activeRequestWithVerification}
            activeMessages={(activeMessages.data ?? []) as RequestMessage[]}
            contracts={contractItems}
          />
        ) : null}

        {activeView === "contracts" ? (
          <ContractsView contracts={contractItems} />
        ) : null}

        {activeView === "profile" ? (
          <ProfileView
            role={role}
            email={user.email}
            displayName={displayName}
            profile={accountProfile}
            paymentAccount={paymentAccountData}
            paymentReady={paymentReady}
            stripeCustomer={stripeCustomerData}
            billingHistory={billingHistoryItems}
            identityCheck={identityCheckData}
            identityStatus={identityStatus}
            hunterComplianceStatus={hunterComplianceStatus}
            ownerPropertyStatus={ownerPropertyStatus}
            hasListing={hasListing}
          />
        ) : null}
      </div>
    </div>
  );
}

function WorkspaceHeader({
  role,
  firstName,
  activeView,
  nextHint,
  compact,
}: {
  role: Role;
  firstName: string;
  activeView: View;
  nextHint?: string;
  compact?: boolean;
}) {
  const copy =
    role === "hunter"
      ? {
          eyebrow: "Hunter workspace",
          title: `Welcome back, ${firstName}`,
          body: "Search leases, start access requests, track contracts, and keep your hunting profile ready without leaving the backend.",
          icon: Compass,
        }
      : {
          eyebrow: "Landowner workspace",
          title: `Good to see you, ${firstName}`,
          body: "Manage listings, review hunter requests, prepare contracts, and keep payout readiness visible before signatures turn into payments.",
          icon: ListPlus,
        };
  const Icon = copy.icon;
  const viewTitle =
    role === "hunter"
      ? {
          overview: "Dashboard",
          leases: "Hunting Leases",
          requests: "Requests",
          contracts: "Contracts",
          profile: "Profile Settings",
          listings: "Listings",
        }[activeView]
      : {
          overview: "Dashboard",
          leases: "Hunting Leases",
          listings: "Listings",
          requests: "Requests",
          contracts: "Active Contracts",
          profile: "Profile Settings",
        }[activeView];

  if (compact) {
    return (
      <section className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-3 shadow-[0_14px_40px_rgba(25,35,29,0.08)] sm:p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#eef3ec] text-[#183326]">
              <Icon size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#c76b2f]">
                {copy.eyebrow}
              </p>
              <h1 className="truncate text-xl font-black tracking-normal text-stone-950 sm:text-2xl">
                {viewTitle}
              </h1>
            </div>
          </div>
          <form action="/api/auth/signout" method="post">
            <button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-[#234331]/14 bg-white px-4 text-sm font-black text-[#183326] transition hover:bg-[#eef3ec] sm:w-auto">
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[#234331]/10 bg-[#17251d] text-white shadow-[0_24px_70px_rgba(25,35,29,0.16)]">
      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#d99a61]">
            <Icon size={15} aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-2xl font-black tracking-normal sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70 sm:text-base">
            {copy.body}
          </p>
          {nextHint ? (
            <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-md border border-[#d99a61]/30 bg-[#d99a61]/12 px-3 py-2 text-sm font-bold text-white">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span className="min-w-0">Continue the onboarding checklist in {activeView}.</span>
            </p>
          ) : null}
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-white/18 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/16 sm:w-auto">
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    </section>
  );
}

function RoleNavigation({ role, activeView }: { role: Role; activeView: View }) {
  const links =
    role === "hunter"
      ? [
          ["overview", "Dashboard", LayoutDashboard],
          ["leases", "Hunting Leases", Search],
          ["requests", "Requests", Inbox],
          ["contracts", "Contracts", FileSignature],
          ["profile", "Profile Settings", Settings],
        ]
      : [
          ["overview", "Dashboard", LayoutDashboard],
          ["listings", "Listings", ListPlus],
          ["requests", "Requests", Inbox],
          ["contracts", "Active Contracts", FileSignature],
          ["profile", "Profile Settings", Settings],
        ];

  return (
    <nav className="overflow-x-auto rounded-lg border border-[#234331]/10 bg-[#fffdf7]/94 p-1.5 shadow-[0_16px_46px_rgba(25,35,29,0.08)] sm:p-2">
      <div className="flex min-w-max snap-x gap-1">
        {links.map(([view, label, Icon]) => {
          const IconComponent = Icon as typeof LayoutDashboard;
          const active = activeView === view;
          return (
            <Link
              key={String(view)}
              href={`/dashboard?view=${view}`}
              className={`inline-flex min-h-10 snap-start items-center gap-2 rounded-md px-2.5 text-xs font-black transition sm:min-h-11 sm:px-3 sm:text-sm ${
                active
                  ? "bg-[#183326] text-white"
                  : "text-stone-700 hover:bg-[#eef3ec] hover:text-[#183326]"
              }`}
            >
              <IconComponent size={16} aria-hidden="true" />
              {String(label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Inbox;
}) {
  return (
    <div className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-4 shadow-[0_16px_46px_rgba(25,35,29,0.08)] sm:p-5">
      <Icon className="size-5 text-[#2f6f8f]" aria-hidden="true" />
      <p className="mt-4 text-2xl font-black text-stone-950 sm:text-3xl">{value}</p>
      <p className="text-sm font-semibold text-stone-600">{label}</p>
    </div>
  );
}

function StateBanner({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone: "success" | "warning" | "danger";
}) {
  const classes = {
    success: "border-[#234331]/18 bg-[#eef3ec] text-[#183326]",
    warning: "border-[#d9c6aa] bg-[#fff9ef] text-stone-800",
    danger: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <div className={`rounded-lg border p-4 text-sm leading-6 ${classes[tone]}`}>
      <p className="font-black">{title}</p>
      <p className="mt-1 font-semibold">{children}</p>
    </div>
  );
}

function OverviewView({
  role,
  displayName,
  identityStatus,
  identityReady,
  hunterComplianceStatus,
  hunterReady,
  hasRequest,
  hasListing,
  ownerPropertyStatus,
  paymentReady,
  hasActiveContract,
  requestItems,
  listingItems,
  contractItems,
}: {
  role: Role;
  displayName: string;
  identityStatus: IdentityVerificationStatus;
  identityReady: boolean;
  hunterComplianceStatus: HunterVerificationStatus;
  hunterReady: boolean;
  hasRequest: boolean;
  hasListing: boolean;
  ownerPropertyStatus: PropertyVerificationStatus;
  paymentReady: boolean;
  hasActiveContract: boolean;
  requestItems: RequestSummary[];
  listingItems: ListingSummary[];
  contractItems: ContractSummary[];
}) {
  const steps =
    role === "hunter"
      ? [
          {
            label: "Account setup",
            done: true,
            body: "Role and shared account details are saved.",
          },
          {
            label: "Identity verification",
            done: identityReady,
            body: "Verify a government ID through Stripe Identity before documents can become final.",
            href: "/dashboard?view=profile",
            action: "Verify ID",
          },
          {
            label: "Hunter compliance",
            done: hunterReady,
            body: "Add license, state, safety, and electronic signing details.",
            href: "/onboarding/hunter",
            action: "Complete compliance",
          },
          {
            label: "First access request",
            done: hasRequest,
            body: "Search leases in the dashboard and message a landowner.",
            href: "/dashboard?view=leases&next=request",
            action: "Find a lease",
          },
          {
            label: "Signed contract",
            done: hasActiveContract,
            body: "Track signatures and payment readiness after approval.",
            href: "/dashboard?view=contracts",
            action: "View contracts",
          },
        ]
      : [
          {
            label: "Account setup",
            done: true,
            body: "Role and shared account details are saved.",
          },
          {
            label: "Identity verification",
            done: identityReady,
            body: "Verify a government ID before property authority review can become final.",
            href: "/dashboard?view=profile",
            action: "Verify ID",
          },
          {
            label: "First listing",
            done: hasListing,
            body: "Create the first huntable area and listing details.",
            href: "/dashboard?view=listings&create=1&next=create-listing",
            action: "Add listing",
          },
          {
            label: "Payout readiness",
            done: paymentReady,
            body: "Connect Stripe before a signed contract can collect payment.",
            href: "/dashboard?view=profile",
            action: "Open payments",
          },
          {
            label: "Active contract",
            done: hasActiveContract,
            body: "Approve a request, propose terms, sign, then activate.",
            href: "/dashboard?view=requests",
            action: "Review requests",
          },
        ];

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
      <div className="grid gap-5">
        <VerificationRoadmap
          role={role}
          title="Verification steps"
          identityStatus={identityStatus}
          hunterStatus={hunterComplianceStatus}
          propertyStatus={ownerPropertyStatus}
          hasListing={hasListing}
          paymentReady={paymentReady}
        />
        <DashboardPanel
          title={`Workspace progress for ${displayName}`}
          eyebrow="Progress"
          icon={ListChecks}
        >
          <div className="grid gap-3">
            {steps.map((step, index) => (
              <ProgressStep
                key={step.label}
                number={index + 1}
                label={step.label}
                body={step.body}
                done={step.done}
                href={step.href}
                action={step.action}
              />
            ))}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-5">
        <PrimaryActionCard role={role} />
        <ProblemReportCard role={role} />
        <DashboardPanel
          title={role === "hunter" ? "Recent Requests" : "Recent Listings"}
          eyebrow="Workspace"
          icon={role === "hunter" ? Inbox : ListPlus}
        >
          {role === "hunter" ? (
            requestItems.length ? (
              requestItems.slice(0, 4).map((request) => {
                const listing = firstListing(request.listings);
                return (
                  <DashboardRow
                    key={request.id}
                    href={`/dashboard?view=requests&request=${request.id}`}
                    title={listing?.title ?? "Listing request"}
                    meta={statusLabel(request.workflow_stage ?? request.status)}
                  />
                );
              })
            ) : (
              <EmptyDashboardText
                href="/dashboard?view=leases&next=request"
                label="Search hunting leases"
              />
            )
          ) : listingItems.length ? (
            listingItems.slice(0, 4).map((listing) => (
              <DashboardRow
                key={listing.id}
                href={`/listings/${listing.slug}`}
                title={listing.title}
                meta={statusLabel(listing.status)}
              />
            ))
          ) : (
            <EmptyDashboardText
              href="/dashboard?view=listings&create=1&next=create-listing"
              label="Add your first listing"
            />
          )}
        </DashboardPanel>

        <DashboardPanel title="Contract Pipeline" eyebrow="Signature" icon={FileSignature}>
          {contractItems.length ? (
            contractItems.slice(0, 3).map((contract) => (
              <DashboardRow
                key={contract.id}
                href={`/contracts/${contract.id}`}
                title={contract.title ?? "Hunting lease agreement"}
                meta={statusLabel(contract.status)}
              />
            ))
          ) : (
            <EmptyDashboardText
              href="/dashboard?view=requests"
              label="Move a request to terms"
            />
          )}
        </DashboardPanel>
      </div>
    </section>
  );
}

function PrimaryActionCard({ role }: { role: Role }) {
  const copy =
    role === "hunter"
      ? {
          icon: Search,
          title: "Start in Hunting Leases",
          body: "Your search and filters now live inside the dashboard, so you can go from discovery to request tracking without switching contexts.",
          href: "/dashboard?view=leases&next=request",
          action: "Search leases",
        }
      : {
          icon: PlusCircle,
          title: "Create the first listing",
          body: "Add property details, draw the huntable area, set rules, and prepare the request workflow from your landowner workspace.",
          href: "/dashboard?view=listings&create=1&next=create-listing",
          action: "Add listing",
        };
  const Icon = copy.icon;

  return (
    <div className="rounded-lg border border-[#234331]/10 bg-[#183326] p-5 text-white shadow-[0_20px_60px_rgba(25,35,29,0.13)]">
      <Icon className="size-6 text-[#d99a61]" aria-hidden="true" />
      <h2 className="mt-4 text-2xl font-black">{copy.title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/70">{copy.body}</p>
      <Link
        href={copy.href}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-black text-[#183326] sm:w-auto"
      >
        {copy.action}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}

type VerificationAction =
  | { kind: "link"; href: string; label: string; icon?: typeof Inbox }
  | { kind: "form"; action: string; label: string; icon?: typeof Inbox };

type VerificationRoadmapItem = {
  label: string;
  body: string;
  done: boolean;
  statusLabel: string;
  action?: VerificationAction;
};

function VerificationRoadmap({
  role,
  title = "Verification steps",
  identityStatus,
  hunterStatus,
  propertyStatus,
  hasListing,
  paymentReady,
}: {
  role: Role;
  title?: string;
  identityStatus: IdentityVerificationStatus;
  hunterStatus: HunterVerificationStatus;
  propertyStatus: PropertyVerificationStatus;
  hasListing: boolean;
  paymentReady: boolean;
}) {
  const identityDone = identityStatus === "verified";
  const hunterDone = hunterStatus === "verified";
  const propertyDone = propertyStatus === "verified";
  const items: VerificationRoadmapItem[] =
    role === "hunter"
      ? [
          {
            label: "Government ID",
            done: identityDone,
            statusLabel: statusLabel(identityStatus),
            body: identityDone
              ? "Your ID check is complete. You do not need to enter the same personal data again."
              : "Start the quick Stripe Identity check once. You can still search and message while it is processing.",
            action: identityDone
              ? undefined
              : {
                  kind: "form",
                  action: "/api/identity/verification/start",
                  label:
                    identityStatus === "pending"
                      ? "Resume ID check"
                      : "Start ID check",
                  icon: ShieldCheck,
                },
          },
          {
            label: "Hunter documents",
            done: hunterDone,
            statusLabel: statusLabel(hunterStatus),
            body: hunterDone
              ? "Your hunter proof is verified and owners see the green hunter status."
              : "Add only the required license, hunter education, or proof that applies to the hunt. No duplicate profile data.",
            action: hunterDone
              ? undefined
              : {
                  kind: "link",
                  href: "/onboarding/hunter",
                  label: "Open hunter verification",
                  icon: ShieldCheck,
                },
          },
          {
            label: "Final lease steps",
            done: identityDone && hunterDone,
            statusLabel:
              identityDone && hunterDone ? "ready" : "locked until verified",
            body: "Requests and chat are available now. File uploads, final terms, digital signature, and checkout unlock when both sides are verified.",
            action: {
              kind: "link",
              href: "/dashboard?view=leases&next=request",
              label: "Search leases",
              icon: Search,
            },
          },
        ]
      : [
          {
            label: "Create listing",
            done: hasListing,
            statusLabel: hasListing ? "created" : "not started",
            body: hasListing
              ? "Your listing can receive requests while the required checks finish in the background."
              : "Create the listing first. Property proof can be uploaded in the listing flow or from the listing card.",
            action: hasListing
              ? undefined
              : {
                  kind: "link",
                  href: "/dashboard?view=listings&create=1&next=create-listing",
                  label: "Add listing",
                  icon: PlusCircle,
                },
          },
          {
            label: "Property authority",
            done: propertyDone,
            statusLabel: hasListing ? statusLabel(propertyStatus) : "after listing",
            body: propertyDone
              ? "Property authority is approved for final contract steps."
              : "Any proof uploaded with the listing is in the review queue. If proof is missing, upload it from the listing card.",
            action:
              hasListing && !propertyDone
                ? {
                    kind: "link",
                    href: "/dashboard?view=listings",
                    label: "View property review",
                    icon: Paperclip,
                  }
                : undefined,
          },
          {
            label: "Government ID",
            done: identityDone,
            statusLabel: statusLabel(identityStatus),
            body: identityDone
              ? "Your ID is verified, so property reviews can become final without duplicate identity questions."
              : "Start your own Stripe Identity check in parallel with property review.",
            action: identityDone
              ? undefined
              : {
                  kind: "form",
                  action: "/api/identity/verification/start",
                  label:
                    identityStatus === "pending"
                      ? "Resume ID check"
                      : "Start ID check",
                  icon: ShieldCheck,
                },
          },
          {
            label: "Payout account",
            done: paymentReady,
            statusLabel: paymentReady ? "ready" : "not connected",
            body: paymentReady
              ? "Stripe Connect is ready to receive marketplace payouts after the owner countersigns."
              : "Connect payouts before a hunter can finish checkout on a signed agreement.",
            action: paymentReady
              ? undefined
              : {
                  kind: "form",
                  action: "/api/stripe/connect",
                  label: "Connect payouts",
                  icon: CircleDollarSign,
                },
          },
        ];

  return (
    <DashboardPanel title={title} eyebrow="Readiness" icon={ShieldCheck}>
      <div className="grid gap-3">
        {items.map((item, index) => (
          <VerificationRoadmapStep
            key={item.label}
            number={index + 1}
            item={item}
          />
        ))}
      </div>
    </DashboardPanel>
  );
}

function VerificationRoadmapStep({
  number,
  item,
}: {
  number: number;
  item: VerificationRoadmapItem;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-[#234331]/10 bg-white p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-md text-sm font-black ${
          item.done ? "bg-[#183326] text-white" : "bg-[#fff9ef] text-[#c76b2f]"
        }`}
      >
        {item.done ? <CheckCircle2 size={18} aria-hidden="true" /> : number}
      </span>
      <div className="min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="text-sm font-black text-stone-950">{item.label}</p>
          <span
            className={`inline-flex w-fit items-center rounded-md px-2 py-1 text-[11px] font-black uppercase tracking-[0.1em] ${
              item.done
                ? "bg-[#eef3ec] text-[#183326]"
                : "bg-stone-100 text-stone-500"
            }`}
          >
            {item.statusLabel}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-600">{item.body}</p>
      </div>
      {item.action ? <VerificationRoadmapAction action={item.action} /> : null}
    </div>
  );
}

function VerificationRoadmapAction({
  action,
}: {
  action: VerificationAction;
}) {
  const Icon = action.icon ?? ArrowRight;
  const className =
    "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-[#234331]/14 bg-white px-3 text-xs font-black text-[#183326] transition hover:bg-[#eef3ec] md:w-auto";

  if (action.kind === "form") {
    return (
      <form action={action.action} method="post">
        <button className={className}>
          <Icon size={14} aria-hidden="true" />
          {action.label}
        </button>
      </form>
    );
  }

  return (
    <Link href={action.href} className={className}>
      <Icon size={14} aria-hidden="true" />
      {action.label}
    </Link>
  );
}

function ProgressStep({
  number,
  label,
  body,
  done,
  href,
  action,
}: {
  number: number;
  label: string;
  body: string;
  done: boolean;
  href?: string;
  action?: string;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-[#234331]/10 bg-white p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
      <span
        className={`grid size-10 place-items-center rounded-md text-sm font-black ${
          done
            ? "bg-[#183326] text-white"
            : "huntfields-step-pulse bg-[#fff9ef] text-[#c76b2f]"
        }`}
      >
        {done ? <CheckCircle2 size={18} aria-hidden="true" /> : number}
      </span>
      <span>
        <span className="block text-sm font-black text-stone-950">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-stone-600">
          {body}
        </span>
      </span>
      {href && action ? (
        <Link
          href={href}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-[#234331]/14 px-3 text-xs font-black text-[#183326] md:w-auto"
        >
          {action}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

function HunterLeasesView({
  listings,
  error,
  stateCode,
  radius,
  minAreaValue,
  country,
  listingType,
  lat,
  lng,
  identityStatus,
  hunterComplianceStatus,
}: {
  listings: ListingCard[];
  error: string | null;
  stateCode: string;
  radius: string;
  minAreaValue?: string;
  country: string;
  listingType?: string;
  lat: number | null;
  lng: number | null;
  identityStatus: IdentityVerificationStatus;
  hunterComplianceStatus: HunterVerificationStatus;
}) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <DashboardPanel title="Hunting Leases" eyebrow="Search" icon={SlidersHorizontal}>
          <LeaseFilterForm
            action="/dashboard"
            variant="hero"
            hiddenFields={{ view: "leases" }}
            defaults={{
              state: stateCode,
              radius,
              minArea: minAreaValue ?? "",
            }}
          />
        </DashboardPanel>
        <VerificationRoadmap
          role="hunter"
          title="Before final terms"
          identityStatus={identityStatus}
          hunterStatus={hunterComplianceStatus}
          propertyStatus="not_started"
          hasListing={false}
          paymentReady={false}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DashboardPanel title="Available Hunting Leases" eyebrow="Inventory" icon={MapPinned}>
          <ListingResults
            initialListings={listings}
            initialError={error}
            pageSize={pageSize}
            viewerCanSeeDetails
            searchQuery={{
              country,
              state: stateCode,
              radius,
              type: listingType,
              min_area: minAreaValue,
              lat: lat ? String(lat) : undefined,
              lng: lng ? String(lng) : undefined,
            }}
          />
        </DashboardPanel>
        <div className="grid gap-5">
          <DashboardPanel title="Map Preview" eyebrow="Region" icon={Compass}>
            <LazyListingMap
              listings={listings}
              viewerCanSeeDetails
              className="min-h-[260px] overflow-hidden rounded-md border border-[#234331]/10 sm:min-h-[340px]"
            />
          </DashboardPanel>
          <div className="rounded-lg border border-[#234331]/10 bg-[#183326] p-5 text-white shadow-[0_18px_50px_rgba(25,35,29,0.12)]">
            <ShieldCheck className="size-5 text-[#d99a61]" aria-hidden="true" />
            <p className="mt-3 text-sm font-black">Request-first access</p>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Open a lease, message the owner, and track the request back here.
              Exact access still depends on approval and signed terms.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandownerListingsView({
  listings,
  createListing,
  listingTypes,
  stateRules,
  identityStatus,
  ownerPropertyStatus,
  paymentReady,
  hasListing,
}: {
  listings: ListingSummary[];
  createListing: boolean;
  listingTypes: ListingType[];
  stateRules: UsStateHuntingRule[];
  identityStatus: IdentityVerificationStatus;
  ownerPropertyStatus: PropertyVerificationStatus;
  paymentReady: boolean;
  hasListing: boolean;
}) {
  if (createListing) {
    return (
      <section className="grid gap-5">
        <VerificationRoadmap
          role="landowner"
          title="What happens after listing"
          identityStatus={identityStatus}
          hunterStatus="not_started"
          propertyStatus={ownerPropertyStatus}
          hasListing={hasListing}
          paymentReady={paymentReady}
        />
        <DashboardPanel title="Create Listing" eyebrow="Guided setup" icon={PlusCircle}>
          <ListingSubmissionForm
            listingTypes={listingTypes}
            stateRules={stateRules}
          />
        </DashboardPanel>
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <div className="grid gap-5">
          <DashboardPanel title="Listings" eyebrow="Landowner tools" icon={ListPlus}>
            <div className="rounded-md border border-[#234331]/10 bg-[#eef3ec] p-4">
              <p className="text-sm font-black text-[#183326]">
                Add land in a guided flow.
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                Create a listing, draw the huntable area, and keep verification
                as a simple status task before final contract steps.
              </p>
              <Link
                href="/dashboard?view=listings&create=1&next=create-listing"
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-sm font-black text-white sm:w-auto"
              >
                <PlusCircle size={16} aria-hidden="true" />
                Add listing
              </Link>
            </div>
          </DashboardPanel>
          <VerificationRoadmap
            role="landowner"
            title="Listing readiness"
            identityStatus={identityStatus}
            hunterStatus="not_started"
            propertyStatus={ownerPropertyStatus}
            hasListing={hasListing}
            paymentReady={paymentReady}
          />
        </div>

        <DashboardPanel title="Your Listings" eyebrow="Inventory" icon={MapPinned}>
          {listings.length ? (
            listings.map((listing) => (
              <DashboardRow
                key={listing.id}
                href={`/listings/${listing.slug}`}
                title={listing.title}
                meta={statusLabel(listing.status)}
              >
                <div className="mt-3">
                  <PropertyVerificationBadge
                    status={listing.property_verification_status}
                  />
                  <PropertyVerificationUploadForm
                    listingId={listing.id}
                    status={listing.property_verification_status}
                  />
                </div>
              </DashboardRow>
            ))
          ) : (
            <EmptyDashboardText
              href="/dashboard?view=listings&create=1&next=create-listing"
              label="Create the first listing"
            />
          )}
        </DashboardPanel>
      </div>
    </section>
  );
}

function RequestsView({
  role,
  userId,
  requests,
  activeRequest,
  activeMessages,
  contracts,
}: {
  role: Role;
  userId: string;
  requests: RequestSummary[];
  activeRequest: RequestSummary | null;
  activeMessages: RequestMessage[];
  contracts: ContractSummary[];
}) {
  if (activeRequest) {
    const activeContract =
      contracts.find((contract) => contract.request_id === activeRequest.id) ??
      null;

    return (
      <RequestConversationWorkspace
        role={role}
        userId={userId}
        request={activeRequest}
        messages={activeMessages}
        contract={activeContract}
      />
    );
  }

  return (
    <section className="grid gap-5">
      <DashboardPanel
        title={role === "hunter" ? "Your Requests" : "Hunter Requests"}
        eyebrow="Messages"
        icon={Inbox}
      >
        {requests.length ? (
          <div className="grid gap-3">
            {requests.map((request) => (
              <RequestListItem
                key={request.id}
                role={role}
                request={request}
              />
            ))}
          </div>
        ) : (
          <EmptyDashboardText
            href={role === "hunter" ? "/dashboard?view=leases" : "/dashboard?view=listings"}
            label={role === "hunter" ? "Search leases" : "Check listings"}
          />
        )}
      </DashboardPanel>
    </section>
  );
}

function RequestListItem({
  role,
  request,
}: {
  role: Role;
  request: RequestSummary;
}) {
  const listing = firstListing(request.listings);

  return (
    <Link
      href={`/dashboard?view=requests&request=${request.id}`}
      className="grid gap-3 rounded-md border border-[#234331]/10 bg-white p-4 transition hover:border-[#234331]/35 hover:bg-[#fbfaf6]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-black text-stone-950">
            {listing?.title ?? "Listing request"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-500">
            <span>Created {formatDate(request.created_at)}</span>
            {request.requested_start || request.requested_end ? (
              <span>
                {formatDate(request.requested_start)} -{" "}
                {formatDate(request.requested_end)}
              </span>
            ) : null}
            {request.party_size ? <span>{request.party_size} hunters</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[#eef3ec] px-2 py-1 text-xs font-black capitalize text-[#234331]">
            {statusLabel(request.workflow_stage ?? request.status)}
          </span>
          <IdentityVerificationBadge
            label={role === "landowner" ? "Hunter ID" : "Owner ID"}
            status={
              role === "landowner"
                ? request.hunterIdentityStatus
                : request.ownerIdentityStatus
            }
          />
          <PropertyVerificationBadge
            status={listing?.property_verification_status}
          />
          {role === "landowner" ? (
            <HunterVerificationBadge
              status={request.hunterVerificationStatus}
            />
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function RequestConversationWorkspace({
  role,
  userId,
  request,
  messages,
  contract,
}: {
  role: Role;
  userId: string;
  request: RequestSummary;
  messages: RequestMessage[];
  contract: ContractSummary | null;
}) {
  const listing = firstListing(request.listings);
  const finalizationReady = requestCanFinalize(request);

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-4 shadow-[0_16px_46px_rgba(25,35,29,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard?view=requests"
              className="inline-flex items-center gap-2 text-sm font-black text-[#183326]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to requests
            </Link>
            <h2 className="mt-3 text-2xl font-black tracking-normal text-stone-950">
              {listing?.title ?? "Listing request"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-500">
              <span>{statusLabel(request.workflow_stage ?? request.status)}</span>
              <span>Created {formatDate(request.created_at)}</span>
              {request.party_size ? <span>{request.party_size} hunters</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <IdentityVerificationBadge
              label={role === "landowner" ? "Hunter ID" : "Owner ID"}
              status={
                role === "landowner"
                  ? request.hunterIdentityStatus
                  : request.ownerIdentityStatus
              }
            />
            <PropertyVerificationBadge
              status={listing?.property_verification_status}
            />
            {role === "landowner" ? (
              <HunterVerificationBadge
                status={request.hunterVerificationStatus}
              />
            ) : null}
            {contract ? (
              <Link
                href={`/contracts/${contract.id}`}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-sm font-black text-white sm:w-auto"
              >
                <FileSignature size={16} aria-hidden="true" />
                Open agreement
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <DashboardPanel title="Request Chat" eyebrow="Conversation" icon={MessageSquareText}>
          <MessageTimeline messages={messages} userId={userId} />
          <MessageReplyForm
            requestId={request.id}
            uploadsEnabled={finalizationReady}
          />
        </DashboardPanel>

        <RequestActionPanel
          role={role}
          userId={userId}
          request={request}
          listing={listing}
          contract={contract}
        />
      </div>
    </section>
  );
}

function MessageTimeline({
  messages,
  userId,
}: {
  messages: RequestMessage[];
  userId: string;
}) {
  return (
    <div className="grid max-h-[52dvh] min-h-[280px] gap-3 overflow-y-auto rounded-md border border-[#234331]/10 bg-white p-2.5 sm:max-h-[60dvh] sm:min-h-[320px] sm:p-3">
      {messages.length === 0 ? (
        <div className="grid place-items-center rounded-md border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600">
          No messages yet.
        </div>
      ) : (
        messages.map((message) => {
          const own = message.sender_id === userId;
          return (
            <div
              key={message.id}
              className={`max-w-[min(36rem,88%)] overflow-hidden rounded-md px-3 py-3 text-sm leading-6 sm:px-4 ${
                own
                  ? "ml-auto bg-[#234331] text-white"
                  : "bg-stone-100 text-stone-800"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              {message.message_attachments?.length ? (
                <div className="mt-3 grid gap-2">
                  {message.message_attachments.map((attachment) => (
                    <Link
                      key={attachment.id}
                      href={`/api/messages/attachments/${attachment.id}`}
                      className={`inline-flex max-w-full min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold ${
                        own
                          ? "border-white/20 bg-white/10 text-white"
                          : "border-stone-200 bg-white text-[#234331]"
                      }`}
                    >
                      <Paperclip size={14} aria-hidden="true" />
                      <span className="min-w-0 truncate">
                        {attachment.attachment_kind}: {attachment.file_name}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
              <p className={`mt-2 text-xs ${own ? "text-white/70" : "text-stone-500"}`}>
                {new Date(message.created_at).toLocaleString()}
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}

function RequestActionPanel({
  role,
  userId,
  request,
  listing,
  contract,
}: {
  role: Role;
  userId: string;
  request: RequestSummary;
  listing: RequestListing | null | undefined;
  contract: ContractSummary | null;
}) {
  const ownerCanAct = role === "landowner" && listing?.owner_id === userId;
  const hunterStatus = normalizeHunterVerificationStatus(
    request.hunterVerificationStatus,
  );
  const hunterIdentityStatus = normalizeIdentityVerificationStatus(
    request.hunterIdentityStatus,
  );
  const ownerIdentityStatus = normalizeIdentityVerificationStatus(
    request.ownerIdentityStatus,
  );
  const propertyStatus = normalizePropertyVerificationStatus(
    listing?.property_verification_status,
  );
  const finalizationReady =
    hunterIdentityStatus === "verified" &&
    ownerIdentityStatus === "verified" &&
    hunterStatus === "verified" &&
    propertyStatus === "verified";

  if (ownerCanAct) {
    return (
      <div className="grid content-start gap-5">
        <DashboardPanel title="Owner Actions" eyebrow="Workflow" icon={FileSignature}>
          {contract && finalizationReady ? (
            <ActionLink
              href={`/contracts/${contract.id}`}
              label="Open digital signature"
              icon={FileSignature}
            />
          ) : contract ? (
            <VerificationGateNotice
              role={role}
              hunterIdentityStatus={hunterIdentityStatus}
              hunterStatus={hunterStatus}
              ownerIdentityStatus={ownerIdentityStatus}
              propertyStatus={propertyStatus}
            />
          ) : request.status === "pending" ? (
            finalizationReady ? (
              <TermsProposalForm
                requestId={request.id}
                requestedStart={request.requested_start}
                requestedEnd={request.requested_end}
                partySize={request.party_size}
                listingPriceCents={listing?.price_cents}
                currency={listing?.currency ?? "USD"}
              />
            ) : (
              <VerificationGateNotice
                role={role}
                hunterIdentityStatus={hunterIdentityStatus}
                hunterStatus={hunterStatus}
                ownerIdentityStatus={ownerIdentityStatus}
                propertyStatus={propertyStatus}
              />
            )
          ) : (
            <ActionNote
              title="Request in progress"
              body="Use text chat to coordinate. Files, final terms, signatures, and payment unlock after both verifications are complete."
            />
          )}
          {request.status === "pending" ? (
            <form action={`/api/requests/${request.id}/decision`} method="post">
              <input type="hidden" name="decision" value="declined" />
              <button className="min-h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-xs font-bold text-stone-700">
                Decline request
              </button>
            </form>
          ) : null}
        </DashboardPanel>
        <ActionNote
          title="Documents and photos"
          body={
            finalizationReady
              ? "Use the message composer to upload owner documents, property photos, insurance proof, or notes for the agreement."
              : "Document and photo uploads are locked until ID checks and document reviews are complete for both sides."
          }
        />
      </div>
    );
  }

  return (
    <div className="grid content-start gap-5">
      <DashboardPanel title="Hunter Actions" eyebrow="Workflow" icon={ShieldCheck}>
        {contract && finalizationReady ? (
          <ActionLink
            href={`/contracts/${contract.id}`}
            label="Review and sign agreement"
            icon={FileSignature}
          />
        ) : contract ? (
          <VerificationGateNotice
            role={role}
            hunterIdentityStatus={hunterIdentityStatus}
            hunterStatus={hunterStatus}
            ownerIdentityStatus={ownerIdentityStatus}
            propertyStatus={propertyStatus}
          />
        ) : (
          <ActionNote
            title="Waiting on owner action"
            body="Keep the text conversation going. Files, final terms, signatures, and payment unlock after both verifications are complete."
          />
        )}
        <ActionLink
          href="/onboarding/hunter"
          label="Update hunter documents"
          icon={ShieldCheck}
        />
      </DashboardPanel>
      <ActionNote
        title="Uploads"
        body={
          finalizationReady
            ? "Use the message composer to upload license proof, education certificates, insurance documents, or trip details."
            : "Uploads are locked until ID checks and document reviews are complete for both sides."
        }
      />
    </div>
  );
}

function ActionLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Inbox;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-center text-sm font-black text-white"
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </Link>
  );
}

function VerificationGateNotice({
  role,
  hunterIdentityStatus,
  hunterStatus,
  ownerIdentityStatus,
  propertyStatus,
}: {
  role: Role;
  hunterIdentityStatus: IdentityVerificationStatus;
  hunterStatus: HunterVerificationStatus;
  ownerIdentityStatus: IdentityVerificationStatus;
  propertyStatus: PropertyVerificationStatus;
}) {
  const actions: VerificationAction[] =
    role === "hunter"
      ? [
          ...(hunterIdentityStatus === "verified"
            ? []
            : [
                {
                  kind: "form" as const,
                  action: "/api/identity/verification/start",
                  label:
                    hunterIdentityStatus === "pending"
                      ? "Resume ID check"
                      : "Start ID check",
                  icon: ShieldCheck,
                },
              ]),
          ...(hunterStatus === "verified"
            ? []
            : [
                {
                  kind: "link" as const,
                  href: "/onboarding/hunter",
                  label: "Open hunter proof",
                  icon: ShieldCheck,
                },
              ]),
        ]
      : [
          ...(ownerIdentityStatus === "verified"
            ? []
            : [
                {
                  kind: "form" as const,
                  action: "/api/identity/verification/start",
                  label:
                    ownerIdentityStatus === "pending"
                      ? "Resume ID check"
                      : "Start ID check",
                  icon: ShieldCheck,
                },
              ]),
          ...(propertyStatus === "verified"
            ? []
            : [
                {
                  kind: "link" as const,
                  href: "/dashboard?view=listings",
                  label: "Open property review",
                  icon: Paperclip,
                },
              ]),
        ];

  return (
    <div className="grid gap-3 rounded-md border border-[#d9c6aa] bg-[#fff9ef] p-4">
      <div className="flex items-start gap-3">
        <LockBadge />
        <div>
          <p className="text-sm font-black text-stone-950">
            Almost ready for final steps
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Chat stays open. Files, final terms, digital signatures, and
            payment unlock after the few required checks below are complete.
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        <VerificationGateRow
          label="Hunter ID"
          verified={hunterIdentityStatus === "verified"}
          status={hunterIdentityStatus}
        />
        <VerificationGateRow
          label="Hunter documents"
          verified={hunterStatus === "verified"}
          status={hunterStatus}
        />
        <VerificationGateRow
          label="Landowner ID"
          verified={ownerIdentityStatus === "verified"}
          status={ownerIdentityStatus}
        />
        <VerificationGateRow
          label="Property authority"
          verified={propertyStatus === "verified"}
          status={propertyStatus}
        />
      </div>
      {actions.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {actions.map((action) => (
            <VerificationRoadmapAction
              key={`${action.kind}-${action.label}`}
              action={action}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LockBadge() {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-white text-[#c76b2f]">
      <XCircle size={17} aria-hidden="true" />
    </span>
  );
}

function VerificationGateRow({
  label,
  verified,
  status,
}: {
  label: string;
  verified: boolean;
  status: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-[#234331]/10 bg-white px-3 py-2 text-xs font-bold sm:flex-row sm:items-center sm:justify-between">
      <span className="text-stone-700">{label}</span>
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 capitalize ${
          verified
            ? "bg-[#eef3ec] text-[#183326]"
            : "bg-stone-100 text-stone-500"
        }`}
      >
        {verified ? (
          <BadgeCheck size={14} aria-hidden="true" />
        ) : (
          <XCircle size={14} aria-hidden="true" />
        )}
        {statusLabel(status)}
      </span>
    </div>
  );
}

function ActionNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-[#234331]/10 bg-white p-4">
      <p className="text-sm font-black text-stone-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
    </div>
  );
}

function HunterVerificationBadge({
  status,
}: {
  status?: HunterVerificationStatus;
}) {
  const verified = status === "verified";

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-black ${
        verified
          ? "border-[#234331]/18 bg-[#eef3ec] text-[#183326]"
          : "border-stone-200 bg-white/55 text-stone-500"
      }`}
    >
      <MapPinned
        size={14}
        aria-hidden="true"
        className={verified ? "text-[#183326]" : "text-stone-400 opacity-55"}
      />
      {verified ? "Verified hunter" : "Not verified"}
    </span>
  );
}

function IdentityVerificationBadge({
  label,
  status,
}: {
  label: string;
  status?: IdentityVerificationStatus | null;
}) {
  const normalized = normalizeIdentityVerificationStatus(status);
  const verified = normalized === "verified";

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-black ${
        verified
          ? "border-[#234331]/18 bg-[#eef3ec] text-[#183326]"
          : "border-stone-200 bg-white/55 text-stone-500"
      }`}
    >
      <ShieldCheck
        size={14}
        aria-hidden="true"
        className={verified ? "text-[#183326]" : "text-stone-400 opacity-55"}
      />
      {verified ? `${label} verified` : `${label} ${statusLabel(normalized)}`}
    </span>
  );
}

function PropertyVerificationBadge({
  status,
}: {
  status?: PropertyVerificationStatus | null;
}) {
  const normalized = normalizePropertyVerificationStatus(status);
  const verified = normalized === "verified";

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-black ${
        verified
          ? "border-[#234331]/18 bg-[#eef3ec] text-[#183326]"
          : "border-stone-200 bg-white/55 text-stone-500"
      }`}
    >
      <MapPinned
        size={14}
        aria-hidden="true"
        className={verified ? "text-[#183326]" : "text-stone-400 opacity-55"}
      />
      {verified ? "Verified property" : `Property ${statusLabel(normalized)}`}
    </span>
  );
}

function PropertyVerificationUploadForm({
  listingId,
  status,
}: {
  listingId: string;
  status?: PropertyVerificationStatus | null;
}) {
  if (normalizePropertyVerificationStatus(status) === "verified") {
    return null;
  }

  return (
    <form
      action={`/api/listings/${listingId}/verification`}
      method="post"
      encType="multipart/form-data"
      className="mt-3 grid gap-2 rounded-md border border-[#d9c6aa] bg-[#fff9ef] p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
    >
      <label className="grid gap-1 text-xs font-bold text-stone-700">
        Property proof, if missing or requested
        <input
          name="authority_document"
          type="file"
          required
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="w-full min-w-0 rounded-md border border-stone-300 bg-white px-2 py-2 text-xs font-normal file:mr-2 file:rounded-md file:border-0 file:bg-[#234331] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
        />
        <span className="font-normal leading-5 text-stone-500">
          If you uploaded proof during listing setup, it is already queued.
          Upload here only when proof is missing, updated, or requested.
        </span>
      </label>
      <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#183326] px-3 text-xs font-black text-white">
        <Paperclip size={14} aria-hidden="true" />
        Upload proof
      </button>
    </form>
  );
}

function ContractsView({ contracts }: { contracts: ContractSummary[] }) {
  return (
    <DashboardPanel title="Contracts" eyebrow="Signature and payment" icon={FileSignature}>
      {contracts.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {contracts.map((contract) => {
            const booking = firstListing(contract.bookings);
            return (
              <Link
                key={contract.id}
                href={`/contracts/${contract.id}`}
                className="rounded-md border border-[#234331]/10 bg-white p-4 transition hover:border-[#234331]/35"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-stone-950">
                      {contract.title ?? "Hunting lease agreement"}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-stone-500">
                      Generated {formatDate(contract.generated_at)}
                    </p>
                  </div>
                  <span className="rounded-md bg-[#eef3ec] px-2 py-1 text-xs font-black text-[#234331]">
                    {statusLabel(contract.status)}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-stone-600">
                  Payment: {statusLabel(booking?.payment_status)}
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyDashboardText
          href="/dashboard?view=requests"
          label="Move a request into final terms"
        />
      )}
    </DashboardPanel>
  );
}

function ProfileView({
  role,
  email,
  displayName,
  profile,
  paymentAccount,
  paymentReady,
  stripeCustomer,
  billingHistory,
  identityCheck,
  identityStatus,
  hunterComplianceStatus,
  ownerPropertyStatus,
  hasListing,
}: {
  role: Role;
  email?: string | null;
  displayName: string;
  profile: DashboardProfile;
  paymentAccount: PaymentAccountSummary | null;
  paymentReady: boolean;
  stripeCustomer: StripeCustomerSummary | null;
  billingHistory: BillingHistorySummary[];
  identityCheck: IdentityVerificationSummary | null;
  identityStatus: IdentityVerificationStatus;
  hunterComplianceStatus: HunterVerificationStatus;
  ownerPropertyStatus: PropertyVerificationStatus;
  hasListing: boolean;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
      <div className="grid gap-5">
        <DashboardPanel title="Profile Settings" eyebrow="Account" icon={Settings}>
          <div className="grid gap-3 text-sm">
            {[
              ["Name", displayName],
              ["Email", email ?? "No email"],
              ["Role", role === "hunter" ? "Hunter" : "Landowner"],
              [
                "Location",
                [profile.city, profile.admin_area_code, profile.postal_code]
                  .filter(Boolean)
                  .join(", ") || "Not set",
              ],
              ["Phone", profile.phone ?? "Not set"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col gap-1 rounded-md border border-[#234331]/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                  {label}
                </span>
                <span className="break-words font-bold text-stone-900 sm:text-right">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <PasskeyRegistrationCard email={email} />
      </div>

      <div className="grid gap-5">
        <VerificationRoadmap
          role={role}
          title="Verification status"
          identityStatus={identityStatus}
          hunterStatus={hunterComplianceStatus}
          propertyStatus={ownerPropertyStatus}
          hasListing={hasListing}
          paymentReady={paymentReady}
        />
        <IdentityVerificationSettingsCard identityCheck={identityCheck} />
        {role === "hunter" ? (
          <HunterVerificationSettingsCard status={hunterComplianceStatus} />
        ) : null}
        <PaymentSettingsCard
          role={role}
          paymentAccount={paymentAccount}
          paymentReady={paymentReady}
        />
        <BillingSettingsCard
          role={role}
          stripeCustomer={stripeCustomer}
          billingHistory={billingHistory}
        />
        <AccountDeleteCard />
      </div>
    </section>
  );
}

function IdentityVerificationSettingsCard({
  identityCheck,
}: {
  identityCheck: IdentityVerificationSummary | null;
}) {
  const status = normalizeIdentityVerificationStatus(identityCheck?.status);
  const verified = status === "verified";
  const failed = status === "rejected" || status === "expired";

  return (
    <DashboardPanel title="Identity Verification" eyebrow="Government ID" icon={ShieldCheck}>
      <div
        className={`rounded-md border p-3 sm:p-4 ${
          verified
            ? "border-[#234331]/18 bg-[#eef3ec]"
            : failed
              ? "border-red-200 bg-red-50"
              : "border-[#d9c6aa] bg-[#fff9ef]"
        }`}
      >
        <div className="flex items-start gap-3">
          {verified ? (
            <BadgeCheck className="mt-0.5 size-5 text-[#234331]" aria-hidden="true" />
          ) : failed ? (
            <XCircle className="mt-0.5 size-5 text-red-700" aria-hidden="true" />
          ) : (
            <ShieldCheck className="mt-0.5 size-5 text-[#c76b2f]" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-black text-stone-950">
              {verified
                ? "Government ID verified"
                : failed
                  ? "ID verification needs retry"
                  : "Step 1: verify your government ID"}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              One quick Stripe Identity check for the account holder. After
              that, hunter documents or property authority proof can be reviewed
              without asking for the same personal data again.
            </p>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
              Status: {statusLabel(status)}
            </p>
            {identityCheck?.result_summary ? (
              <p className="mt-2 text-xs font-semibold leading-5 text-red-700">
                {identityCheck.result_summary}
              </p>
            ) : null}
          </div>
        </div>
        {!verified ? (
          <form action="/api/identity/verification/start" method="post" className="mt-4">
            <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-sm font-black text-white">
              <ShieldCheck size={16} aria-hidden="true" />
              {failed ? "Retry ID verification" : "Start ID verification"}
            </button>
          </form>
        ) : null}
      </div>
    </DashboardPanel>
  );
}

function HunterVerificationSettingsCard({
  status,
}: {
  status: HunterVerificationStatus;
}) {
  const verified = status === "verified";
  const failed = status === "rejected" || status === "expired";

  return (
    <DashboardPanel title="Hunter Verification" eyebrow="Compliance" icon={ShieldCheck}>
      <div
        className={`rounded-md border p-4 ${
          verified
            ? "border-[#234331]/18 bg-[#eef3ec]"
            : failed
              ? "border-red-200 bg-red-50"
              : "border-[#d9c6aa] bg-[#fff9ef]"
        }`}
      >
        <div className="flex items-start gap-3">
          {verified ? (
            <BadgeCheck className="mt-0.5 size-5 text-[#234331]" aria-hidden="true" />
          ) : failed ? (
            <XCircle className="mt-0.5 size-5 text-red-700" aria-hidden="true" />
          ) : (
            <ShieldCheck className="mt-0.5 size-5 text-[#c76b2f]" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-black text-stone-950">
              {verified
                ? "Hunter proof verified"
                : failed
                  ? "Hunter proof needs review"
                  : "Hunter proof is needed before final terms"}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Add the minimum license or education proof that applies to your
              hunt. Owners can ask for state- or species-specific proof later in
              chat.
            </p>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
              Status: {statusLabel(status)}
            </p>
          </div>
        </div>
        {!verified ? (
          <Link
            href="/onboarding/hunter"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-sm font-black text-white sm:w-auto"
          >
            <ShieldCheck size={16} aria-hidden="true" />
            {failed ? "Update hunter proof" : "Open hunter verification"}
          </Link>
        ) : null}
      </div>
    </DashboardPanel>
  );
}

function PaymentSettingsCard({
  role,
  paymentAccount,
  paymentReady,
}: {
  role: Role;
  paymentAccount: PaymentAccountSummary | null;
  paymentReady: boolean;
}) {
  if (role === "hunter") {
    return (
      <DashboardPanel title="Payment Method" eyebrow="Checkout" icon={CreditCard}>
        <div className="rounded-md border border-[#234331]/10 bg-white p-4">
          <CreditCard className="size-5 text-[#2f6f8f]" aria-hidden="true" />
          <p className="mt-3 text-sm font-black text-stone-950">
            Payment happens after hunter signature.
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Huntfields opens Stripe Checkout after the hunter signs. The
            landowner countersigns after payment clears and the payout account
            is ready.
          </p>
        </div>
      </DashboardPanel>
    );
  }

  return (
    <DashboardPanel title="Payout Method" eyebrow="Stripe Connect" icon={WalletCards}>
      <div className="grid gap-4">
        <div
          className={`rounded-md border p-4 ${
            paymentReady
              ? "border-[#234331]/18 bg-[#eef3ec]"
              : "border-[#d9c6aa] bg-[#fff9ef]"
          }`}
        >
          <div className="flex items-start gap-3">
            {paymentReady ? (
              <BadgeCheck className="mt-0.5 size-5 text-[#234331]" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 size-5 text-[#c76b2f]" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-black text-stone-950">
                {paymentReady ? "Payouts ready" : "Connect payouts before payment"}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {paymentReady
                  ? "The owner payout account can receive marketplace funds after the hunter pays and the owner countersigns."
                  : "A hunter cannot complete checkout after signing until Stripe Connect payout readiness is complete."}
              </p>
              {paymentAccount ? (
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
                  Status: {statusLabel(paymentAccount.onboarding_status)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <form action="/api/stripe/connect" method="post">
          <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-sm font-black text-white">
            <CircleDollarSign size={16} aria-hidden="true" />
            {paymentAccount ? "Continue Stripe Connect" : "Connect Stripe payouts"}
          </button>
        </form>
      </div>
    </DashboardPanel>
  );
}

function BillingSettingsCard({
  role,
  stripeCustomer,
  billingHistory,
}: {
  role: Role;
  stripeCustomer: StripeCustomerSummary | null;
  billingHistory: BillingHistorySummary[];
}) {
  return (
    <DashboardPanel title="Billing & Fees" eyebrow="Invoices" icon={ReceiptText}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-[#234331]/10 bg-white p-4">
          <CreditCard className="size-5 text-[#2f6f8f]" aria-hidden="true" />
          <p className="mt-3 text-sm font-black text-stone-950">
            Payment methods and invoices
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Stripe stores payment methods, billing details, receipts, and
            invoice PDFs. Huntfields only stores the transaction references.
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
            Customer: {stripeCustomer?.provider_customer_id ? "ready" : "created when opened"}
          </p>
          <form action="/api/stripe/portal" method="post" className="mt-4">
            <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#183326] px-4 text-sm font-black text-white">
              <CreditCard size={16} aria-hidden="true" />
              Open billing portal
            </button>
          </form>
        </div>

        <div className="rounded-md border border-[#d9c6aa] bg-[#fff9ef] p-4">
          <CircleDollarSign className="size-5 text-[#c76b2f]" aria-hidden="true" />
          <p className="mt-3 text-sm font-black text-stone-950">
            Marketplace fee logic
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {role === "hunter"
              ? "Hunters pay the final lease amount, the hunter service fee, and any Stripe Tax amount shown at Checkout."
              : "Landowners receive the payout after both signatures. The owner fee is deducted before the Stripe transfer is created."}
          </p>
          <p className="mt-3 rounded-md bg-white/80 p-2 text-xs font-semibold leading-5 text-stone-600">
            Current launch fees: hunter {formatBps(INITIAL_HUNTER_FEE_BPS)},
            owner {formatBps(INITIAL_OWNER_FEE_BPS)}. Renewals: hunter{" "}
            {formatBps(RENEWAL_HUNTER_FEE_BPS)}, owner{" "}
            {formatBps(RENEWAL_OWNER_FEE_BPS)}.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">
          Recent transactions
        </p>
        {billingHistory.length ? (
          <div className="grid gap-3">
            {billingHistory.map((item) => {
              const booking = firstListing(item.bookings);
              const listing = firstListing(booking?.listings);
              const title = listing?.title ?? "Huntfields hunting lease";
              const currency = item.currency ?? "USD";
              const roleFee =
                role === "hunter"
                  ? item.hunter_platform_fee_cents ?? 0
                  : item.owner_platform_fee_cents ?? 0;
              const primaryAmount =
                role === "hunter"
                  ? item.amount_cents ?? 0
                  : item.landowner_payout_cents ?? 0;

              return (
                <div
                  key={item.id}
                  className="rounded-md border border-[#234331]/10 bg-white p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-stone-950">
                        {title}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        {formatDate(item.created_at)} · {statusLabel(item.status)}
                      </p>
                    </div>
                    <span className="w-fit rounded-md bg-[#eef3ec] px-2 py-1 text-xs font-black text-[#234331]">
                      {role === "hunter" ? "Payment" : statusLabel(item.transfer_status)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs font-semibold text-stone-600 sm:grid-cols-3">
                    <div className="rounded-md bg-[#f6f2e9] p-2">
                      <span className="block font-black uppercase tracking-[0.12em] text-stone-500">
                        {role === "hunter" ? "Charged" : "Payout"}
                      </span>
                      <span className="mt-1 block text-sm font-black text-stone-950">
                        {formatMoney(primaryAmount, currency)}
                      </span>
                    </div>
                    <div className="rounded-md bg-[#f6f2e9] p-2">
                      <span className="block font-black uppercase tracking-[0.12em] text-stone-500">
                        Tax
                      </span>
                      <span className="mt-1 block text-sm font-black text-stone-950">
                        {formatMoney(item.tax_amount_cents ?? 0, currency)}
                      </span>
                    </div>
                    <div className="rounded-md bg-[#f6f2e9] p-2">
                      <span className="block font-black uppercase tracking-[0.12em] text-stone-500">
                        Huntfields fee
                      </span>
                      <span className="mt-1 block text-sm font-black text-stone-950">
                        {formatMoney(roleFee, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.payment_method_summary ? (
                      <span className="rounded-md border border-[#234331]/10 px-2 py-1 text-xs font-bold text-stone-600">
                        {item.payment_method_summary}
                      </span>
                    ) : null}
                    {item.provider_invoice_url ? (
                      <a
                        href={item.provider_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-[#234331]/10 px-2 py-1 text-xs font-black text-[#183326]"
                      >
                        Invoice <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    ) : null}
                    {item.provider_invoice_pdf ? (
                      <a
                        href={item.provider_invoice_pdf}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-[#234331]/10 px-2 py-1 text-xs font-black text-[#183326]"
                      >
                        PDF <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    ) : null}
                    {item.receipt_url ? (
                      <a
                        href={item.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-[#234331]/10 px-2 py-1 text-xs font-black text-[#183326]"
                      >
                        Receipt <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyDashboardText
            href={role === "hunter" ? "/dashboard?view=leases" : "/dashboard?view=listings"}
            label={role === "hunter" ? "Start with hunting leases" : "Create a listing"}
          />
        )}
      </div>
    </DashboardPanel>
  );
}

function AccountDeleteCard() {
  return (
    <section className="rounded-lg border border-red-200/70 bg-[#fffdf7] p-5 shadow-[0_16px_46px_rgba(25,35,29,0.08)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
        Account controls
      </p>
      <h2 className="mt-2 text-xl font-black text-stone-950">
        Delete authenticated user
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Accounts that own listings, requests, bookings, or contracts may need
        marketplace data archived or transferred first.
      </p>
      <form action="/api/auth/delete-account" method="post" className="mt-4 grid gap-3">
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
    </section>
  );
}

function DashboardPanel({
  title,
  eyebrow,
  icon: Icon,
  children,
}: {
  title: string;
  eyebrow?: string;
  icon?: typeof Inbox;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-[#234331]/10 bg-[#fffdf7] p-4 shadow-[0_16px_46px_rgba(25,35,29,0.08)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c76b2f]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 break-words text-lg font-black tracking-normal text-stone-950 sm:text-xl">
            {title}
          </h2>
        </div>
        {Icon ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#eef3ec] text-[#183326]">
            <Icon size={18} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="mt-4 grid min-w-0 gap-3">{children}</div>
    </section>
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
    <div className="min-w-0 rounded-md border border-[#234331]/10 bg-white px-3 py-3 text-sm transition hover:border-[#234331]/35">
      <Link href={href} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span className="min-w-0 break-words font-bold text-stone-800">{title}</span>
        <span className="w-fit rounded-md bg-[#eef3ec] px-2 py-1 text-xs font-black capitalize text-[#234331]">
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
      encType="multipart/form-data"
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

      <div className="grid gap-2 md:grid-cols-3">
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

      <div className="grid gap-2 lg:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-stone-700">
          Contract source
          <select
            name="contract_source"
            defaultValue="generated"
            className="min-h-9 rounded-md border border-stone-300 bg-white px-2 text-sm font-normal outline-none focus:border-[#234331]"
          >
            <option value="generated">Generate agreement</option>
            <option value="uploaded_pdf">Upload owner PDF</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-stone-700">
          Contract PDF
          <input
            name="uploaded_contract_file"
            type="file"
            accept="application/pdf"
            className="w-full min-w-0 rounded-md border border-stone-300 bg-white px-2 py-2 text-xs font-normal file:mr-2 file:rounded-md file:border-0 file:bg-[#234331] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white focus:border-[#234331] sm:text-sm"
          />
        </label>
      </div>

      <p className="rounded-md border border-[#234331]/10 bg-white/70 p-2 text-xs font-semibold leading-5 text-stone-600">
        Use generated mode for a Huntfields agreement, or upload a PDF to wrap
        your own contract in the same digital signature flow.
      </p>

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

      <button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[#234331] px-3 text-xs font-black text-white sm:w-auto">
        <FileSignature size={15} aria-hidden="true" />
        Generate contract for signature
      </button>
    </form>
  );
}

function EmptyDashboardText({ href, label }: { href: string; label: string }) {
  return (
    <div className="rounded-md border border-dashed border-[#234331]/20 bg-white p-5 text-sm leading-6 text-stone-600">
      No activity yet.{" "}
      <Link href={href} className="font-bold text-[#234331]">
        {label}
      </Link>
    </div>
  );
}
