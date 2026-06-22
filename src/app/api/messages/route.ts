import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, emailTemplates } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getRequestVerificationGate } from "@/lib/verification/gates";

const schema = z.object({
  request_id: z.uuid(),
  body: z.string().max(4000).optional(),
});

function safeFileName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function attachmentKind(contentType: string) {
  if (contentType.startsWith("image/")) {
    return "photo";
  }

  return "document";
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

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
      { error: "Sign in before sending messages." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const attachmentFiles = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0)
    .slice(0, 5);
  const parsed = schema.safeParse({
    request_id: formData.get("request_id"),
    body: String(formData.get("body") ?? "").trim(),
  });

  if (
    !parsed.success ||
    (!parsed.data.body?.trim() && attachmentFiles.length === 0)
  ) {
    return NextResponse.json(
      { error: "Write a message or attach a file before sending." },
      { status: 400 },
    );
  }

  const db = service ?? supabase;
  const { data: accessRequest, error: requestError } = await db
    .from("listing_requests")
    .select("id, listing_id, hunter_id, listings(owner_id, title)")
    .eq("id", parsed.data.request_id)
    .single();

  const listing = Array.isArray(accessRequest?.listings)
    ? accessRequest?.listings[0]
    : accessRequest?.listings;

  if (requestError || !accessRequest || !listing) {
    return NextResponse.json(
      { error: requestError?.message ?? "Request not found." },
      { status: 404 },
    );
  }

  const isHunter = accessRequest.hunter_id === user.id;
  const isOwner = listing.owner_id === user.id;

  if (!isHunter && !isOwner) {
    return NextResponse.json(
      { error: "Only request participants can send messages." },
      { status: 403 },
    );
  }

  if (attachmentFiles.length > 0) {
    if (!service) {
      return NextResponse.json(
        { error: "Supabase service role is required for file uploads." },
        { status: 500 },
      );
    }

    const verificationGate = await getRequestVerificationGate(
      service,
      accessRequest.id,
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
  }

  const recipientId = isHunter ? listing.owner_id : accessRequest.hunter_id;
  const { data: createdMessage, error } = await db
    .from("messages")
    .insert({
      request_id: accessRequest.id,
      listing_id: accessRequest.listing_id,
      sender_id: user.id,
      recipient_id: recipientId,
      body: parsed.data.body?.trim() || "Shared attachments.",
    })
    .select("id")
    .single();

  if (error || !createdMessage) {
    return NextResponse.json(
      { error: error?.message ?? "Message could not be sent." },
      { status: 500 },
    );
  }

  if (attachmentFiles.length > 0 && service) {
    for (const file of attachmentFiles) {
      if (file.size > 15 * 1024 * 1024) {
        continue;
      }

      const contentType = file.type || "application/octet-stream";

      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
          "application/pdf",
        ].includes(contentType)
      ) {
        continue;
      }

      const fileName = safeFileName(file.name || "attachment");
      const storagePath = `${user.id}/${createdMessage.id}/${crypto.randomUUID()}-${fileName}`;
      const upload = await service.storage
        .from("message-attachments")
        .upload(storagePath, file, {
          contentType,
          upsert: false,
        });

      if (upload.error) {
        continue;
      }

      await service.from("message_attachments").insert({
        message_id: createdMessage.id,
        request_id: accessRequest.id,
        listing_id: accessRequest.listing_id,
        uploader_id: user.id,
        storage_bucket: "message-attachments",
        storage_path: storagePath,
        file_name: fileName,
        content_type: contentType,
        file_size: file.size,
        attachment_kind: attachmentKind(contentType),
      });
    }
  }

  if (service) {
    const [{ data: senderProfile }, recipientAuth] = await Promise.all([
      service.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      service.auth.admin.getUserById(recipientId),
    ]);
    const recipientEmail = recipientAuth.data.user?.email;

    if (recipientEmail) {
      const template = emailTemplates.messageReceived(
        listing.title ?? "a Huntfields request",
        senderProfile?.full_name ?? user.email ?? "A Huntfields user",
        appUrl(`/dashboard?view=requests&request=${accessRequest.id}`),
        attachmentFiles.length > 0,
      );
      await sendTransactionalEmail({
        to: recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo: user.email ?? undefined,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
