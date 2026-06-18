import { NextResponse } from "next/server";
import { z } from "zod";
import { generateListingDescription } from "@/lib/ai/listing-description";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { compactCommaList, formValue } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(8).max(140),
  summary: z.string().min(20).max(180),
  listing_type_slug: z.string().max(80).optional(),
  country_name: z.string().min(2).max(120),
  admin_area_name: z.string().max(120).optional(),
  nearest_town: z.string().max(120).optional(),
  reported_area_acres: z.string().max(20).optional(),
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
      { error: "Sign in before generating a listing description." },
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
      { error: "Complete landowner onboarding before using listing AI." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const parsed = schema.safeParse({
    title: formValue(formData, "title"),
    summary: formValue(formData, "summary"),
    listing_type_slug: formValue(formData, "listing_type_slug"),
    country_name: formValue(formData, "country_name"),
    admin_area_name: formValue(formData, "admin_area_name"),
    nearest_town: formValue(formData, "nearest_town"),
    reported_area_acres: formValue(formData, "reported_area_acres"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Add a title, short summary, and location before generating a description.",
      },
      { status: 400 },
    );
  }

  try {
    const description = await generateListingDescription({
      title: parsed.data.title,
      summary: parsed.data.summary,
      listingType: parsed.data.listing_type_slug || null,
      countryName: parsed.data.country_name,
      adminAreaName: parsed.data.admin_area_name || null,
      regionName: parsed.data.admin_area_name || parsed.data.country_name,
      nearestTown: parsed.data.nearest_town || null,
      reportedAreaAcres: parsed.data.reported_area_acres || null,
      wildlife: compactCommaList(formValue(formData, "wildlife"), {
        maxItems: 8,
        maxItemLength: 42,
      }),
      amenities: compactCommaList(formValue(formData, "amenities"), {
        maxItems: 8,
        maxItemLength: 52,
      }),
      rules: compactCommaList(formValue(formData, "rules"), {
        maxItems: 6,
        maxItemLength: 68,
      }),
    });

    return NextResponse.json({ description });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate description.",
      },
      { status: 502 },
    );
  }
}
