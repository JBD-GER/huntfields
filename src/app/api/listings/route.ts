import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, emailTemplates } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { generateAndStoreListingCover } from "@/lib/images/openai-listing-cover";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import {
  compactCommaList,
  formValue,
  priceToCents,
  slugify,
} from "@/lib/utils";

const listingSchema = z.object({
  title: z.string().min(8).max(140),
  summary: z.string().min(20).max(180),
  description: z.string().max(1800).optional(),
  listing_type_slug: z.string().min(1),
  country_code: z.string().length(2),
  country_name: z.string().min(2).max(120),
  admin_area_code: z.string().max(24).optional(),
  admin_area_name: z.string().max(120).optional(),
  nearest_town: z.string().max(120).optional(),
  address_private: z.string().max(300).optional(),
  boundary_geojson: z.string().min(20),
  price_unit: z.enum(["per_day", "per_week", "per_season", "per_request"]),
});

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
      { error: "Sign in before submitting land." },
      { status: 401 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "landowner" ||
    !profile.onboarding_completed
  ) {
    return NextResponse.json(
      {
        error:
          "Complete landowner onboarding before submitting hunting land.",
      },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const parsed = listingSchema.safeParse({
    title: formValue(formData, "title"),
    summary: formValue(formData, "summary"),
    description: formValue(formData, "description"),
    listing_type_slug: formValue(formData, "listing_type_slug"),
    country_code: formValue(formData, "country_code").toUpperCase(),
    country_name: formValue(formData, "country_name"),
    admin_area_code: formValue(formData, "admin_area_code").toUpperCase(),
    admin_area_name: formValue(formData, "admin_area_name"),
    nearest_town: formValue(formData, "nearest_town"),
    address_private: formValue(formData, "address_private"),
    boundary_geojson: formValue(formData, "boundary_geojson"),
    price_unit: formValue(formData, "price_unit"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please complete required listing fields and draw a polygon." },
      { status: 400 },
    );
  }

  let boundaryGeojson: unknown;

  try {
    boundaryGeojson = JSON.parse(parsed.data.boundary_geojson);
  } catch {
    return NextResponse.json(
      { error: "The polygon data is invalid." },
      { status: 400 },
    );
  }

  const service = createSupabaseServiceClient();
  const db = service ?? supabase;
  const landownerHasAuthority = formData.get("landowner_has_authority") === "on";
  const leaseLicenseRequirement =
    formValue(formData, "hunting_lease_license_required") || "unknown";
  const leaseLicenseNumber = formValue(
    formData,
    "hunting_lease_license_number",
  );
  const leaseLicenseRequired =
    leaseLicenseRequirement === "yes" ||
    leaseLicenseRequirement === "on" ||
    Boolean(leaseLicenseNumber);
  const authorityDocument = fileFrom(formData, "authority_document");

  if (!landownerHasAuthority) {
    return NextResponse.json(
      { error: "Confirm legal authority to offer this hunting access." },
      { status: 400 },
    );
  }

  if (leaseLicenseRequired && !leaseLicenseNumber) {
    return NextResponse.json(
      { error: "Enter the hunting lease license number when required." },
      { status: 400 },
    );
  }

  if (authorityDocument) {
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ].includes(authorityDocument.type || "application/octet-stream")
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
  }

  const reportedAreaValue = formValue(formData, "reported_area_acres");
  const parsedReportedAreaAcres = reportedAreaValue
    ? Number(reportedAreaValue.replace(",", "."))
    : 0;

  if (
    reportedAreaValue &&
    (!Number.isFinite(parsedReportedAreaAcres) ||
      parsedReportedAreaAcres <= 0)
  ) {
    return NextResponse.json(
      { error: "Enter a valid owner-reported acreage or leave it empty." },
      { status: 400 },
    );
  }

  const reportedAreaAcres = reportedAreaValue
    ? parsedReportedAreaAcres
    : null;
  const reportedAreaHectares = reportedAreaAcres
    ? Number((reportedAreaAcres * 0.40468564224).toFixed(2))
    : null;
  const wildlife = compactCommaList(formValue(formData, "wildlife"), {
    maxItems: 8,
    maxItemLength: 42,
  });
  const amenities = compactCommaList(formValue(formData, "amenities"), {
    maxItems: 8,
    maxItemLength: 52,
  });
  const rules = compactCommaList(formValue(formData, "rules"), {
    maxItems: 6,
    maxItemLength: 68,
  });
  const allowedMethods = compactCommaList(formValue(formData, "allowed_methods"), {
    maxItems: 6,
    maxItemLength: 42,
  });
  const prohibitedMethods = compactCommaList(
    formValue(formData, "prohibited_methods"),
    {
      maxItems: 6,
      maxItemLength: 52,
    },
  );

  const { data: listingType, error: typeError } = await db
    .from("listing_types")
    .select("id")
    .eq("slug", parsed.data.listing_type_slug)
    .single();

  if (typeError || !listingType) {
    return NextResponse.json(
      { error: typeError?.message ?? "Listing type not found." },
      { status: 400 },
    );
  }

  const baseSlug = slugify(parsed.data.title);
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
  const adminAreaSlug = parsed.data.admin_area_name
    ? slugify(parsed.data.admin_area_name)
    : null;
  const countrySlug = slugify(parsed.data.country_name);
  const regionSlug = adminAreaSlug
    ? `${countrySlug}/${adminAreaSlug}`
    : countrySlug;

  const { data: listing, error: insertError } = await db
    .from("listings")
    .insert({
      owner_id: user.id,
      listing_type_id: listingType.id,
      status: "submitted",
      title: parsed.data.title,
      slug,
      summary: parsed.data.summary,
      description: parsed.data.description || null,
      country_code: parsed.data.country_code,
      country_name: parsed.data.country_name,
      admin_area_code: parsed.data.admin_area_code || null,
      admin_area_name: parsed.data.admin_area_name || null,
      region_name: parsed.data.admin_area_name || parsed.data.country_name,
      region_slug: regionSlug,
      nearest_town: parsed.data.nearest_town || null,
      address_private: parsed.data.address_private || null,
      boundary_geojson: boundaryGeojson,
      reported_area_acres: reportedAreaAcres
        ? Number(reportedAreaAcres.toFixed(2))
        : null,
      reported_area_hectares: reportedAreaHectares,
      area_display_source: reportedAreaAcres
        ? "owner_reported"
        : "drawn_boundary",
      wildlife,
      amenities,
      rules,
      price_cents: priceToCents(formValue(formData, "price")),
      currency: "USD",
      price_unit: parsed.data.price_unit,
    })
    .select("id, title, slug, cover_image_path")
    .single();

  if (insertError || !listing) {
    return NextResponse.json(
      { error: insertError?.message ?? "Listing could not be created." },
      { status: 500 },
    );
  }

  if (service) {
    await service.from("admin_reviews").insert({
      listing_id: listing.id,
      status: "needs_review",
      notes: "Auto-created when listing was submitted.",
    });
  }

  let authorityDocumentPath: string | null = null;

  if (service && authorityDocument) {
    const fileName =
      safeFileName(authorityDocument.name || "authority-document") ||
      "authority-document";
    const storagePath = `${user.id}/${listing.id}/${crypto.randomUUID()}-${fileName}`;
    const upload = await service.storage
      .from("verification-documents")
      .upload(storagePath, authorityDocument, {
        contentType: authorityDocument.type || "application/octet-stream",
        upsert: false,
      });

    if (upload.error) {
      return NextResponse.json(
        { error: upload.error.message },
        { status: 500 },
      );
    }

    authorityDocumentPath = storagePath;
  }

  if (service) {
    await service.from("property_verifications").insert({
      listing_id: listing.id,
      owner_id: user.id,
      status: "pending",
      document_path: authorityDocumentPath,
      submitted_at: new Date().toISOString(),
      metadata: {
        source: "listing_submission",
        authority_attested: landownerHasAuthority,
        authority_document_uploaded: Boolean(authorityDocumentPath),
        hunting_lease_license_requirement: leaseLicenseRequirement,
        hunting_lease_license_required: leaseLicenseRequired,
        hunting_lease_license_number: leaseLicenseNumber || null,
        minimum_review:
          "Confirm owner or agent authority for this property before final terms, signatures, uploads, or checkout are enabled.",
      },
    });
  }

  await db.from("listing_compliance_profiles").insert({
    listing_id: listing.id,
    state_code: parsed.data.admin_area_code || null,
    landowner_has_authority: landownerHasAuthority,
    hunting_lease_license_required: leaseLicenseRequired,
    hunting_lease_license_number: leaseLicenseNumber || null,
    insurance_required: Boolean(formValue(formData, "insurance_summary")),
    insurance_summary: formValue(formData, "insurance_summary") || null,
    allowed_species: wildlife,
    allowed_methods: allowedMethods,
    prohibited_methods: prohibitedMethods,
    guest_policy: formValue(formData, "guest_policy") || null,
    vehicle_policy: formValue(formData, "vehicle_policy") || null,
    alcohol_policy: formValue(formData, "alcohol_policy") || null,
    emergency_contact_name: formValue(formData, "emergency_contact_name") || null,
    emergency_contact_phone:
      formValue(formData, "emergency_contact_phone") || null,
    state_specific_answers: {
      lease_license_requirement: leaseLicenseRequirement,
      acknowledged_listing_requirements: formData.getAll(
        "state_listing_requirements",
      ),
    },
  });

  let coverImagePath = listing.cover_image_path;

  if (service) {
    try {
      const generatedCover = await generateAndStoreListingCover({
        supabase: service,
        listing: {
          id: listing.id,
          slug: listing.slug,
          title: parsed.data.title,
          summary: parsed.data.summary,
          description: parsed.data.description || null,
          countryName: parsed.data.country_name,
          adminAreaName: parsed.data.admin_area_name || null,
          regionName: parsed.data.admin_area_name || parsed.data.country_name,
          nearestTown: parsed.data.nearest_town || null,
          wildlife,
          amenities,
        },
      });

      if (generatedCover) {
        coverImagePath = generatedCover.path;
        await service
          .from("listings")
          .update({ cover_image_path: generatedCover.path })
          .eq("id", listing.id);
      }
    } catch (error) {
      console.warn("AI listing cover generation failed", error);
    }
  }

  if (env.adminNotificationEmail) {
    const template = emailTemplates.listingSubmitted(
      listing.title,
      appUrl(`/dashboard?review=${listing.id}`),
    );
    await sendTransactionalEmail({
      to: env.adminNotificationEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  return NextResponse.json({
    ok: true,
    listing: { ...listing, cover_image_path: coverImagePath },
  });
}
