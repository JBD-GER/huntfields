import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, emailTemplates } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { getUsStateRule } from "@/lib/compliance/us-state-rules";
import { generateHuntingLeaseContract } from "@/lib/contracts/hunting-lease";
import { calculateMarketplaceFees } from "@/lib/payments/fees";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { formValue, priceToCents } from "@/lib/utils";
import { getRequestVerificationGate } from "@/lib/verification/gates";

type Params = Promise<{ id: string }>;

const schema = z.object({
  lease_amount: z.string().min(1),
  additional_fee: z.string().optional(),
  starts_on: z.string().min(8),
  ends_on: z.string().min(8),
  party_size: z.coerce.number().int().min(1).max(50),
  renewal_type: z.enum(["none", "annual_optional", "annual_auto"]),
  renewal_notice_days: z.coerce.number().int().min(0).max(365).optional(),
  contract_source: z.enum(["generated", "uploaded_pdf"]),
  uploaded_contract_path: z.string().max(500).optional(),
  terms_notes: z.string().max(1800).optional(),
});

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function fileFrom(formData: FormData, name: string) {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

function safeFileName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export async function POST(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  if (!supabase || !service) {
    return NextResponse.json(
      { error: "Supabase service role is required for lease terms." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", env.appUrl), {
      status: 303,
    });
  }

  const formData = await request.formData();
  const parsed = schema.safeParse({
    lease_amount: formValue(formData, "lease_amount"),
    additional_fee: formValue(formData, "additional_fee"),
    starts_on: formValue(formData, "starts_on"),
    ends_on: formValue(formData, "ends_on"),
    party_size: formValue(formData, "party_size") || "1",
    renewal_type: formValue(formData, "renewal_type") || "none",
    renewal_notice_days: formValue(formData, "renewal_notice_days") || "0",
    contract_source: formValue(formData, "contract_source") || "generated",
    uploaded_contract_path: formValue(formData, "uploaded_contract_path"),
    terms_notes: formValue(formData, "terms_notes"),
  });

  const leaseAmountCents = priceToCents(formValue(formData, "lease_amount"));
  const additionalFeeCents =
    priceToCents(formValue(formData, "additional_fee")) ?? 0;

  if (!parsed.success || leaseAmountCents === null) {
    return NextResponse.json(
      { error: "Enter final price, dates, party size, and contract source." },
      { status: 400 },
    );
  }

  const { data: existingBooking } = await service
    .from("bookings")
    .select("id")
    .eq("request_id", id)
    .maybeSingle();

  if (existingBooking?.id) {
    const { data: existingContract } = await service
      .from("booking_contracts")
      .select("id")
      .eq("booking_id", existingBooking.id)
      .maybeSingle();

    if (existingContract?.id) {
      return NextResponse.redirect(
        new URL(`/contracts/${existingContract.id}`, env.appUrl),
        { status: 303 },
      );
    }
  }

  const { data: accessRequest, error: requestError } = await service
    .from("listing_requests")
    .select(
      "id, listing_id, hunter_id, requested_start, requested_end, party_size, message, status",
    )
    .eq("id", id)
    .single();

  if (requestError || !accessRequest) {
    return NextResponse.json(
      { error: requestError?.message ?? "Request not found." },
      { status: 404 },
    );
  }

  const { data: listing, error: listingError } = await service
    .from("listings")
    .select(
      "id, title, slug, owner_id, currency, admin_area_code, admin_area_name, nearest_town, wildlife",
    )
    .eq("id", accessRequest.listing_id)
    .single();

  if (listingError || !listing) {
    return NextResponse.json(
      { error: listingError?.message ?? "Listing not found." },
      { status: 404 },
    );
  }

  const { data: actorProfile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (listing.owner_id !== user.id && actorProfile?.role !== "admin") {
    return NextResponse.json(
      { error: "Only the landowner can propose final lease terms." },
      { status: 403 },
    );
  }

  const verificationGate = await getRequestVerificationGate(service, id);

  if (verificationGate.error || !verificationGate.data) {
    return NextResponse.json(
      { error: verificationGate.error ?? "Verification status unavailable." },
      { status: verificationGate.status },
    );
  }

  if (!verificationGate.data.canFinalize) {
    return NextResponse.json(
      { error: verificationGate.data.reason },
      { status: 403 },
    );
  }

  let uploadedContractPath = parsed.data.uploaded_contract_path || null;
  const uploadedContractFile = fileFrom(formData, "uploaded_contract_file");

  if (parsed.data.contract_source === "uploaded_pdf" && uploadedContractFile) {
    if (uploadedContractFile.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Upload contract documents as PDF files." },
        { status: 400 },
      );
    }

    if (uploadedContractFile.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Contract PDFs must be 20 MB or smaller." },
        { status: 400 },
      );
    }

    const fileName =
      safeFileName(uploadedContractFile.name || "lease-contract.pdf") ||
      "lease-contract.pdf";
    const storagePath = `${user.id}/${id}/${crypto.randomUUID()}-${fileName}`;
    const upload = await service.storage
      .from("contract-documents")
      .upload(storagePath, uploadedContractFile, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (upload.error) {
      return NextResponse.json(
        { error: upload.error.message },
        { status: 500 },
      );
    }

    uploadedContractPath = storagePath;
  }

  if (
    parsed.data.contract_source === "uploaded_pdf" &&
    !uploadedContractPath
  ) {
    return NextResponse.json(
      { error: "Upload the owner contract PDF before using uploaded PDF mode." },
      { status: 400 },
    );
  }

  const startsOn = parsed.data.starts_on;
  const endsOn = parsed.data.ends_on;

  if (new Date(endsOn) < new Date(startsOn)) {
    return NextResponse.json(
      { error: "End date must be on or after start date." },
      { status: 400 },
    );
  }

  const feeBreakdown = calculateMarketplaceFees({
    leaseAmountCents,
    additionalFeeCents,
    isRenewal: false,
  });

  const { data: booking, error: bookingError } = await service
    .from("bookings")
    .insert({
      request_id: accessRequest.id,
      listing_id: listing.id,
      hunter_id: accessRequest.hunter_id,
      landowner_id: listing.owner_id,
      status: "pending_payment",
      workflow_stage: "signature_pending",
      payment_status: "not_started",
      starts_on: startsOn,
      ends_on: endsOn,
      amount_cents: feeBreakdown.leaseAmountCents,
      lease_amount_cents: feeBreakdown.leaseAmountCents,
      additional_fee_cents: feeBreakdown.additionalFeeCents,
      hunter_platform_fee_cents: feeBreakdown.hunterPlatformFeeCents,
      landowner_platform_fee_cents: feeBreakdown.ownerPlatformFeeCents,
      landowner_payout_cents: feeBreakdown.landownerPayoutCents,
      total_charge_cents: feeBreakdown.hunterTotalCents,
      renewal_type: parsed.data.renewal_type,
      renewal_notice_days: parsed.data.renewal_notice_days ?? null,
      currency: listing.currency,
      payment_provider: "manual",
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    return NextResponse.json(
      { error: bookingError?.message ?? "Booking could not be created." },
      { status: 500 },
    );
  }

  const { data: proposal, error: proposalError } = await service
    .from("lease_terms_proposals")
    .insert({
      request_id: accessRequest.id,
      listing_id: listing.id,
      booking_id: booking.id,
      hunter_id: accessRequest.hunter_id,
      landowner_id: listing.owner_id,
      status: "contract_generated",
      lease_amount_cents: feeBreakdown.leaseAmountCents,
      additional_fee_cents: feeBreakdown.additionalFeeCents,
      owner_platform_fee_cents: feeBreakdown.ownerPlatformFeeCents,
      hunter_platform_fee_cents: feeBreakdown.hunterPlatformFeeCents,
      landowner_payout_cents: feeBreakdown.landownerPayoutCents,
      hunter_total_cents: feeBreakdown.hunterTotalCents,
      currency: listing.currency,
      starts_on: startsOn,
      ends_on: endsOn,
      party_size: parsed.data.party_size,
      renewal_type: parsed.data.renewal_type,
      renewal_notice_days: parsed.data.renewal_notice_days ?? null,
      contract_source: parsed.data.contract_source,
      uploaded_contract_path: uploadedContractPath,
      ai_contract_requested: parsed.data.contract_source === "generated",
      terms_notes: parsed.data.terms_notes || null,
      proposed_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (proposalError || !proposal) {
    return NextResponse.json(
      { error: proposalError?.message ?? "Lease terms could not be saved." },
      { status: 500 },
    );
  }

  const [
    hunterAuth,
    landownerAuth,
    hunterProfile,
    landownerProfile,
    compliance,
  ] = await Promise.all([
    service.auth.admin.getUserById(accessRequest.hunter_id),
    service.auth.admin.getUserById(listing.owner_id),
    service
      .from("profiles")
      .select("full_name")
      .eq("id", accessRequest.hunter_id)
      .maybeSingle(),
    service.from("profiles").select("full_name").eq("id", listing.owner_id).maybeSingle(),
    service
      .from("listing_compliance_profiles")
      .select("*")
      .eq("listing_id", listing.id)
      .maybeSingle(),
  ]);

  const complianceRow = firstRelation(compliance.data);
  const rule = await getUsStateRule(listing.admin_area_code);
  const generated = generateHuntingLeaseContract({
    bookingId: booking.id,
    requestId: accessRequest.id,
    listingTitle: listing.title,
    listingSlug: listing.slug,
    stateCode: listing.admin_area_code,
    stateName: rule?.state_name ?? listing.admin_area_name,
    countyOrRegion: listing.admin_area_name,
    nearestTown: listing.nearest_town,
    startsOn,
    endsOn,
    partySize: parsed.data.party_size,
    amountCents: feeBreakdown.leaseAmountCents,
    additionalFeeCents: feeBreakdown.additionalFeeCents,
    hunterPlatformFeeCents: feeBreakdown.hunterPlatformFeeCents,
    landownerPlatformFeeCents: feeBreakdown.ownerPlatformFeeCents,
    landownerPayoutCents: feeBreakdown.landownerPayoutCents,
    hunterTotalCents: feeBreakdown.hunterTotalCents,
    currency: listing.currency,
    renewalType: parsed.data.renewal_type,
    paymentSchedule: "due_after_hunter_signature",
    contractSource: parsed.data.contract_source,
    uploadedContractPath: uploadedContractPath,
    termsNotes: parsed.data.terms_notes || null,
    hunterName:
      hunterProfile.data?.full_name ??
      hunterAuth.data.user?.email ??
      "Hunter",
    hunterEmail: hunterAuth.data.user?.email ?? null,
    landownerName:
      landownerProfile.data?.full_name ??
      landownerAuth.data.user?.email ??
      "Landowner",
    landownerEmail: landownerAuth.data.user?.email ?? null,
    allowedSpecies: complianceRow?.allowed_species ?? listing.wildlife ?? [],
    allowedMethods: complianceRow?.allowed_methods ?? [],
    prohibitedMethods: complianceRow?.prohibited_methods ?? [],
    guestPolicy: complianceRow?.guest_policy ?? null,
    vehiclePolicy: complianceRow?.vehicle_policy ?? null,
    alcoholPolicy: complianceRow?.alcohol_policy ?? null,
    emergencyContactName: complianceRow?.emergency_contact_name ?? null,
    emergencyContactPhone: complianceRow?.emergency_contact_phone ?? null,
    rule,
  });

  const { data: contract, error: contractError } = await service
    .from("booking_contracts")
    .insert({
      booking_id: booking.id,
      request_id: accessRequest.id,
      listing_id: listing.id,
      hunter_id: accessRequest.hunter_id,
      landowner_id: listing.owner_id,
      terms_proposal_id: proposal.id,
      status: "sent",
      title: generated.title,
      contract_html: generated.contractHtml,
      contract_text: generated.contractText,
      contract_hash: generated.contractHash,
      electronic_records_disclosure: generated.electronicRecordsDisclosure,
      source_rule_state_code: listing.admin_area_code,
      contract_source: parsed.data.contract_source,
      uploaded_contract_path: uploadedContractPath,
      lease_amount_cents: feeBreakdown.leaseAmountCents,
      additional_fee_cents: feeBreakdown.additionalFeeCents,
      hunter_platform_fee_cents: feeBreakdown.hunterPlatformFeeCents,
      landowner_platform_fee_cents: feeBreakdown.ownerPlatformFeeCents,
      landowner_payout_cents: feeBreakdown.landownerPayoutCents,
      hunter_total_cents: feeBreakdown.hunterTotalCents,
      renewal_type: parsed.data.renewal_type,
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (contractError || !contract) {
    return NextResponse.json(
      { error: contractError?.message ?? "Contract could not be created." },
      { status: 500 },
    );
  }

  await Promise.all([
    service
      .from("listing_requests")
      .update({
        status: "approved",
        workflow_stage: "contract_sent",
        terms_proposed_at: new Date().toISOString(),
        contract_sent_at: new Date().toISOString(),
      })
      .eq("id", accessRequest.id),
    service.from("booking_workflow_events").insert({
      booking_id: booking.id,
      request_id: accessRequest.id,
      actor_id: user.id,
      event_type: "final_terms_contract_sent",
      payload: {
        contract_id: contract.id,
        terms_proposal_id: proposal.id,
        hunter_total_cents: feeBreakdown.hunterTotalCents,
        landowner_payout_cents: feeBreakdown.landownerPayoutCents,
      },
    }),
  ]);

  const contractUrl = appUrl(`/contracts/${contract.id}`);

  if (hunterAuth.data.user?.email) {
    const ready = emailTemplates.leaseContractReady(listing.title, contractUrl);
    await sendTransactionalEmail({
      to: hunterAuth.data.user.email,
      subject: ready.subject,
      html: ready.html,
      text: ready.text,
      replyTo: user.email ?? undefined,
    });
  }

  return NextResponse.redirect(new URL(`/contracts/${contract.id}`, env.appUrl), {
    status: 303,
  });
}
