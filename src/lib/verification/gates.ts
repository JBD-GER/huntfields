import type { SupabaseClient } from "@supabase/supabase-js";

export type VerificationStatus =
  | "not_started"
  | "pending"
  | "verified"
  | "rejected"
  | "expired";

export type RequestVerificationGate = {
  requestId: string;
  listingId: string;
  hunterId: string;
  ownerId: string;
  hunterIdentityStatus: VerificationStatus;
  ownerIdentityStatus: VerificationStatus;
  hunterStatus: VerificationStatus;
  propertyStatus: VerificationStatus;
  hunterIdentityVerified: boolean;
  ownerIdentityVerified: boolean;
  hunterVerified: boolean;
  propertyVerified: boolean;
  canFinalize: boolean;
  reason: string | null;
};

type GateResult =
  | { data: RequestVerificationGate; error: null; status: 200 }
  | { data: null; error: string; status: number };

type ListingRequestRow = {
  id: string;
  listing_id: string;
  hunter_id: string;
  listings: { owner_id: string | null } | { owner_id: string | null }[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeVerificationStatus(
  value: unknown,
): VerificationStatus {
  return value === "pending" ||
    value === "verified" ||
    value === "rejected" ||
    value === "expired"
    ? value
    : "not_started";
}

function gateReason({
  hunterIdentityVerified,
  ownerIdentityVerified,
  hunterVerified,
  propertyVerified,
}: {
  hunterIdentityVerified: boolean;
  ownerIdentityVerified: boolean;
  hunterVerified: boolean;
  propertyVerified: boolean;
}) {
  if (
    hunterIdentityVerified &&
    ownerIdentityVerified &&
    hunterVerified &&
    propertyVerified
  ) {
    return null;
  }

  const missing = [
    !hunterIdentityVerified ? "hunter ID verification" : null,
    !hunterVerified ? "hunter document review" : null,
    !ownerIdentityVerified ? "landowner ID verification" : null,
    !propertyVerified ? "property authority review" : null,
  ].filter(Boolean);

  if (missing.length === 1) {
    return `${missing[0]} must be complete before documents, final terms, signatures, or payment can proceed.`;
  }

  if (missing.length === 2) {
    return `${missing[0]} and ${missing[1]} must be complete before documents, final terms, signatures, or payment can proceed.`;
  }

  const last = missing.pop();
  return `${missing.join(", ")}, and ${last} must be complete before documents, final terms, signatures, or payment can proceed.`;
}

async function getLatestIdentityStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<VerificationStatus> {
  const { data } = await supabase
    .from("identity_verification_checks")
    .select("status")
    .eq("user_id", userId)
    .eq("provider", "stripe_identity")
    .eq("check_type", "id_document")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return normalizeVerificationStatus(data?.status);
}

export async function getRequestVerificationGate(
  supabase: SupabaseClient,
  requestId: string,
): Promise<GateResult> {
  const { data: accessRequest, error: requestError } = await supabase
    .from("listing_requests")
    .select("id, listing_id, hunter_id, listings(owner_id)")
    .eq("id", requestId)
    .maybeSingle();

  const requestRow = accessRequest as ListingRequestRow | null;
  const listing = firstRelation(requestRow?.listings);

  if (requestError || !requestRow || !listing?.owner_id) {
    return {
      data: null,
      error: requestError?.message ?? "Request not found.",
      status: 404,
    };
  }

  const [
    hunterIdentityStatus,
    ownerIdentityStatus,
    hunterVerification,
    propertyVerification,
  ] = await Promise.all([
    getLatestIdentityStatus(supabase, requestRow.hunter_id),
    getLatestIdentityStatus(supabase, listing.owner_id),
    supabase
      .from("hunter_compliance_profiles")
      .select("verification_status")
      .eq("user_id", requestRow.hunter_id)
      .maybeSingle(),
    supabase
      .from("property_verifications")
      .select("status")
      .eq("listing_id", requestRow.listing_id)
      .eq("owner_id", listing.owner_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const hunterStatus = normalizeVerificationStatus(
    hunterVerification.data?.verification_status,
  );
  const propertyStatus = normalizeVerificationStatus(
    propertyVerification.data?.status,
  );
  const hunterIdentityVerified = hunterIdentityStatus === "verified";
  const ownerIdentityVerified = ownerIdentityStatus === "verified";
  const hunterVerified = hunterStatus === "verified";
  const propertyVerified = propertyStatus === "verified";

  return {
    data: {
      requestId: requestRow.id,
      listingId: requestRow.listing_id,
      hunterId: requestRow.hunter_id,
      ownerId: listing.owner_id,
      hunterIdentityStatus,
      ownerIdentityStatus,
      hunterStatus,
      propertyStatus,
      hunterIdentityVerified,
      ownerIdentityVerified,
      hunterVerified,
      propertyVerified,
      canFinalize:
        hunterIdentityVerified &&
        ownerIdentityVerified &&
        hunterVerified &&
        propertyVerified,
      reason: gateReason({
        hunterIdentityVerified,
        ownerIdentityVerified,
        hunterVerified,
        propertyVerified,
      }),
    },
    error: null,
    status: 200,
  };
}
