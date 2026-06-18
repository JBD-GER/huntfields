import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, emailTemplates } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { env } from "@/lib/env";

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
    .select("id, listing_id, hunter_id, landowner_id, status, title")
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
    actor_id: user.id,
    event_type: "contract_signed",
    payload: { contract_id: contract.id, signer_role: expectedRole, status },
  });

  if (status === "signed") {
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
