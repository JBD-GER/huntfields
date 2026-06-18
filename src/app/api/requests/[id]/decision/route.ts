import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, emailTemplates } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getUsStateRule } from "@/lib/compliance/us-state-rules";
import { generateHuntingLeaseContract } from "@/lib/contracts/hunting-lease";

type Params = Promise<{ id: string }>;

const schema = z.object({
  decision: z.enum(["approved", "declined"]),
  response_message: z.string().max(2000).optional(),
});

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function POST(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  if (!supabase || !service) {
    return NextResponse.json(
      { error: "Supabase service role is required for booking decisions." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in before responding to requests." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const parsed = schema.safeParse({
    decision: formData.get("decision"),
    response_message: formData.get("response_message") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose approve or decline." },
      { status: 400 },
    );
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
      "id, title, slug, owner_id, price_cents, currency, admin_area_code, admin_area_name, nearest_town, wildlife",
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
      { error: "Only the landowner can respond to this request." },
      { status: 403 },
    );
  }

  if (parsed.data.decision === "declined") {
    const { error } = await service
      .from("listing_requests")
      .update({
        status: "declined",
        response_message: parsed.data.response_message || null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const hunterUser = await service.auth.admin.getUserById(
      accessRequest.hunter_id,
    );
    if (hunterUser.data.user?.email) {
      const template = emailTemplates.landownerResponse(
        listing.title,
        false,
        appUrl(`/dashboard?request=${id}`),
      );
      await sendTransactionalEmail({
        to: hunterUser.data.user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo: user.email ?? undefined,
      });
    }

    return NextResponse.redirect(new URL(`/dashboard?request=${id}`, env.appUrl), {
      status: 303,
    });
  }

  if (!accessRequest.requested_start || !accessRequest.requested_end) {
    return NextResponse.json(
      { error: "Request dates are required before approval." },
      { status: 400 },
    );
  }

  const { error: updateError } = await service
    .from("listing_requests")
    .update({
      status: "approved",
      response_message: parsed.data.response_message || null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: booking, error: bookingError } = await service
    .from("bookings")
    .insert({
      request_id: accessRequest.id,
      listing_id: listing.id,
      hunter_id: accessRequest.hunter_id,
      landowner_id: listing.owner_id,
      status: "pending_payment",
      starts_on: accessRequest.requested_start,
      ends_on: accessRequest.requested_end,
      amount_cents: listing.price_cents,
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
    startsOn: accessRequest.requested_start,
    endsOn: accessRequest.requested_end,
    partySize: accessRequest.party_size,
    amountCents: listing.price_cents,
    currency: listing.currency,
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
      status: "sent",
      title: generated.title,
      contract_html: generated.contractHtml,
      contract_text: generated.contractText,
      contract_hash: generated.contractHash,
      electronic_records_disclosure: generated.electronicRecordsDisclosure,
      source_rule_state_code: listing.admin_area_code,
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

  await service.from("booking_workflow_events").insert({
    booking_id: booking.id,
    request_id: accessRequest.id,
    actor_id: user.id,
    event_type: "request_approved_contract_sent",
    payload: { contract_id: contract.id },
  });

  const contractUrl = appUrl(`/contracts/${contract.id}`);
  const recipients = [
    hunterAuth.data.user?.email,
    landownerAuth.data.user?.email,
  ].filter(Boolean) as string[];

  if (recipients.length > 0) {
    const ready = emailTemplates.leaseContractReady(listing.title, contractUrl);
    await sendTransactionalEmail({
      to: recipients,
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
