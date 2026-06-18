import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, emailTemplates } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

const requestSchema = z.object({
  listing_id: z.uuid(),
  message: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in before messaging landowners." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const parsed = requestSchema.safeParse({
    listing_id: formData.get("listing_id"),
    message: formData.get("message") || "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please complete the access request." },
      { status: 400 },
    );
  }

  const service = createSupabaseServiceClient();
  const db = service ?? supabase;

  const { data: listing, error: listingError } = await db
    .from("listings")
    .select("id, title, slug, owner_id, status")
    .eq("id", parsed.data.listing_id)
    .single();

  if (listingError || !listing || listing.status !== "approved") {
    return NextResponse.json(
      { error: listingError?.message ?? "Listing is not available." },
      { status: 404 },
    );
  }

  const { data: created, error: insertError } = await db
    .from("listing_requests")
    .insert({
      listing_id: listing.id,
      hunter_id: user.id,
      party_size: 1,
      message:
        parsed.data.message ||
        "Hi, I am interested in this hunting lease and would like to discuss availability and access terms.",
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return NextResponse.json(
      { error: insertError?.message ?? "Request could not be created." },
      { status: 500 },
    );
  }

  const requestMessage =
    parsed.data.message ||
    "Hi, I am interested in this hunting lease and would like to discuss availability and access terms.";

  await db.from("messages").insert({
    request_id: created.id,
    listing_id: listing.id,
    sender_id: user.id,
    recipient_id: listing.owner_id,
    body: requestMessage,
  });

  if (service) {
    const [{ data: owner }, { data: profile }] = await Promise.all([
      service.auth.admin.getUserById(listing.owner_id),
      service
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const ownerEmail = owner.user?.email;

    if (ownerEmail) {
      const template = emailTemplates.hunterRequest(
        listing.title,
        profile?.full_name ?? user.email ?? "A hunter",
        appUrl(`/dashboard?request=${created.id}`),
      );
      await sendTransactionalEmail({
        to: ownerEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo: user.email ?? undefined,
      });
    }
  }

  return NextResponse.json({ ok: true, request: created });
}
