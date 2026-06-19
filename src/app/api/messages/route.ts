import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

const schema = z.object({
  request_id: z.uuid(),
  body: z.string().min(1).max(4000),
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
  const parsed = schema.safeParse({
    request_id: formData.get("request_id"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Write a message before sending." },
      { status: 400 },
    );
  }

  const db = service ?? supabase;
  const { data: accessRequest, error: requestError } = await db
    .from("listing_requests")
    .select("id, listing_id, hunter_id, listings(owner_id)")
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

  const recipientId = isHunter ? listing.owner_id : accessRequest.hunter_id;
  const { data: createdMessage, error } = await db
    .from("messages")
    .insert({
      request_id: accessRequest.id,
      listing_id: accessRequest.listing_id,
      sender_id: user.id,
      recipient_id: recipientId,
      body: parsed.data.body,
    })
    .select("id")
    .single();

  if (error || !createdMessage) {
    return NextResponse.json(
      { error: error?.message ?? "Message could not be sent." },
      { status: 500 },
    );
  }

  const attachmentFiles = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0)
    .slice(0, 5);

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

  return NextResponse.json({ ok: true });
}
