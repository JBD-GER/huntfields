import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;

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
  const { slug: listingId } = await params;
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  if (!supabase || !service) {
    return NextResponse.json(
      { error: "Supabase service role is required for verification uploads." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in before uploading verification documents." },
      { status: 401 },
    );
  }

  const { data: listing, error: listingError } = await service
    .from("listings")
    .select("id, owner_id, title")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError || !listing) {
    return NextResponse.json(
      { error: listingError?.message ?? "Listing not found." },
      { status: 404 },
    );
  }

  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (listing.owner_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Only the landowner can upload verification proof." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const authorityDocument = fileFrom(formData, "authority_document");

  if (!authorityDocument) {
    return NextResponse.json(
      { error: "Choose a PDF, JPG, PNG, or WebP proof document." },
      { status: 400 },
    );
  }

  const contentType = authorityDocument.type || "application/octet-stream";

  if (
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
      contentType,
    )
  ) {
    return NextResponse.json(
      { error: "Authority documents must be PDF, JPG, PNG, or WebP files." },
      { status: 400 },
    );
  }

  if (authorityDocument.size > 15 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Authority documents must be 15 MB or smaller." },
      { status: 400 },
    );
  }

  const fileName =
    safeFileName(authorityDocument.name || "authority-document") ||
    "authority-document";
  const storagePath = `${user.id}/${listing.id}/${crypto.randomUUID()}-${fileName}`;
  const upload = await service.storage
    .from("verification-documents")
    .upload(storagePath, authorityDocument, {
      contentType,
      upsert: false,
    });

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  await service.from("property_verifications").insert({
    listing_id: listing.id,
    owner_id: listing.owner_id,
    status: "pending",
    document_path: storagePath,
    submitted_at: new Date().toISOString(),
    metadata: {
      source: "dashboard_upload",
      authority_document_uploaded: true,
      listing_title: listing.title,
    },
  });

  return NextResponse.redirect(
    new URL("/dashboard?view=listings&verification=pending", request.url),
    { status: 303 },
  );
}
