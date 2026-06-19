import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  if (!supabase || !service) {
    return NextResponse.json(
      { error: "Supabase service role is required for attachments." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url), {
      status: 303,
    });
  }

  const { data: attachment, error } = await service
    .from("message_attachments")
    .select(
      "id, storage_bucket, storage_path, file_name, messages(sender_id, recipient_id)",
    )
    .eq("id", id)
    .single();

  const message = Array.isArray(attachment?.messages)
    ? attachment?.messages[0]
    : attachment?.messages;

  if (error || !attachment || !message) {
    return NextResponse.json(
      { error: error?.message ?? "Attachment not found." },
      { status: 404 },
    );
  }

  if (message.sender_id !== user.id && message.recipient_id !== user.id) {
    return NextResponse.json(
      { error: "You cannot access this attachment." },
      { status: 403 },
    );
  }

  const { data, error: signedError } = await service.storage
    .from(attachment.storage_bucket)
    .createSignedUrl(attachment.storage_path, 60, {
      download: attachment.file_name,
    });

  if (signedError || !data?.signedUrl) {
    return NextResponse.json(
      { error: signedError?.message ?? "Attachment URL could not be created." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl, { status: 303 });
}
