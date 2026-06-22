import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, emailTemplates } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { releaseOwnerPayoutTransfer } from "@/lib/payments/owner-payout";
import { getRequestVerificationGate } from "@/lib/verification/gates";

type Params = Promise<{ id: string }>;

const schema = z.object({
  typed_name: z.string().min(2).max(160),
  signer_role: z.enum(["hunter", "landowner"]),
});

export async function POST(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  if (!supabase || !service) {
    return NextResponse.json(
      { error: "Supabase service role is required for contract signing." },
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
    typed_name: formData.get("typed_name"),
    signer_role: formData.get("signer_role"),
  });

  if (!parsed.success || formData.get("electronic_records_consent") !== "on") {
    return NextResponse.json(
      { error: "Typed name and electronic signature consent are required." },
      { status: 400 },
    );
  }

  const { data: contract, error } = await service
    .from("booking_contracts")
    .select("id, booking_id, request_id, listing_id, hunter_id, landowner_id, status, title")
    .eq("id", id)
    .single();

  if (error || !contract) {
    return NextResponse.json(
      { error: error?.message ?? "Contract not found." },
      { status: 404 },
    );
  }

  const expectedRole =
    contract.hunter_id === user.id
      ? "hunter"
      : contract.landowner_id === user.id
        ? "landowner"
        : null;

  if (!expectedRole || expectedRole !== parsed.data.signer_role) {
    return NextResponse.json(
      { error: "You are not allowed to sign this contract role." },
      { status: 403 },
    );
  }

  if (!["sent", "partially_signed"].includes(contract.status)) {
    return NextResponse.json(
      { error: "This contract is not open for signature." },
      { status: 400 },
    );
  }

  const [{ data: booking }, { data: signatures }] = await Promise.all([
    service
      .from("bookings")
      .select("id, payment_status")
      .eq("id", contract.booking_id)
      .maybeSingle(),
    service
      .from("contract_signatures")
      .select("signer_id, signer_role")
      .eq("contract_id", contract.id),
  ]);

  if (!booking) {
    return NextResponse.json(
      { error: "Booking not found for this contract." },
      { status: 404 },
    );
  }

  const hunterSigned = (signatures ?? []).some(
    (signature) => signature.signer_role === "hunter",
  );
  const landownerSigned = (signatures ?? []).some(
    (signature) => signature.signer_role === "landowner",
  );
  const alreadySigned = (signatures ?? []).some(
    (signature) => signature.signer_id === user.id,
  );

  if (alreadySigned) {
    return NextResponse.json(
      { error: "Your signature is already saved for this contract." },
      { status: 400 },
    );
  }

  if (
    expectedRole === "hunter" &&
    (contract.status !== "sent" || hunterSigned)
  ) {
    return NextResponse.json(
      { error: "The hunter signature is already complete." },
      { status: 400 },
    );
  }

  if (expectedRole === "landowner") {
    if (!hunterSigned || contract.status !== "partially_signed" || landownerSigned) {
      return NextResponse.json(
        { error: "The hunter must sign before the landowner can countersign." },
        { status: 400 },
      );
    }

    if (booking.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Hunter payment is required before landowner signature." },
        { status: 400 },
      );
    }
  }

  if (!contract.request_id) {
    return NextResponse.json(
      { error: "This contract is missing its request verification link." },
      { status: 400 },
    );
  }

  const verificationGate = await getRequestVerificationGate(
    service,
    contract.request_id,
  );

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

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;

  const { error: insertError } = await service
    .from("contract_signatures")
    .insert({
      contract_id: contract.id,
      signer_id: user.id,
      signer_role: expectedRole,
      typed_name: parsed.data.typed_name,
      electronic_records_consent: true,
      ip_address: ipAddress,
      user_agent: request.headers.get("user-agent"),
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: status } = await service.rpc("refresh_contract_status", {
    p_contract_id: contract.id,
  });

  await service.from("booking_workflow_events").insert({
    booking_id: contract.booking_id,
    request_id: contract.request_id,
    actor_id: user.id,
    event_type: "contract_signed",
    payload: { contract_id: contract.id, signer_role: expectedRole, status },
  });

  if (status === "partially_signed" && expectedRole === "hunter") {
    const hunter = await service.auth.admin.getUserById(contract.hunter_id);
    const hunterEmail = hunter.data.user?.email ?? user.email;

    if (hunterEmail) {
      const template = emailTemplates.hunterPaymentDue(
        contract.title,
        appUrl(`/contracts/${contract.id}`),
      );
      await sendTransactionalEmail({
        to: hunterEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo: user.email ?? undefined,
      });
    }
  }

  if (status === "signed") {
    await releaseOwnerPayoutTransfer({
      supabase: service,
      bookingId: contract.booking_id,
      contractId: contract.id,
      actorId: user.id,
    });

    const [hunter, landowner] = await Promise.all([
      service.auth.admin.getUserById(contract.hunter_id),
      service.auth.admin.getUserById(contract.landowner_id),
    ]);
    const recipients = [
      hunter.data.user?.email,
      landowner.data.user?.email,
    ].filter(Boolean) as string[];

    if (recipients.length > 0) {
      const template = emailTemplates.leaseContractSigned(
        contract.title,
        appUrl(`/contracts/${contract.id}`),
      );
      await sendTransactionalEmail({
        to: recipients,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    }
  }

  return NextResponse.redirect(new URL(`/contracts/${contract.id}`, env.appUrl), {
    status: 303,
  });
}
