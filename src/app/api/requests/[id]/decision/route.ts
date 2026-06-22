import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, emailTemplates } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

const schema = z.object({
  decision: z.enum(["approved", "declined"]),
  response_message: z.string().max(2000).optional(),
});

export async function POST(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  if (!supabase || !service) {
    return NextResponse.json(
      { error: "Supabase service role is required for request decisions." },
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

  if (parsed.data.decision === "approved") {
    return NextResponse.json(
      {
        error:
          "Final lease terms are required before contract generation. Use the terms proposal workflow.",
      },
      { status: 400 },
    );
  }

  const { data: accessRequest, error: requestError } = await service
    .from("listing_requests")
    .select("id, listing_id, hunter_id")
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
    .select("id, title, owner_id")
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

  const { error } = await service
    .from("listing_requests")
    .update({
      status: "declined",
      workflow_stage: "declined",
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
      appUrl(`/dashboard?view=requests&request=${id}`),
    );
    await sendTransactionalEmail({
      to: hunterUser.data.user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: user.email ?? undefined,
    });
  }

  return NextResponse.redirect(
    new URL(`/dashboard?view=requests&request=${id}`, env.appUrl),
    { status: 303 },
  );
}
